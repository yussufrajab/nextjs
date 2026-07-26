/**
 * Route-level tests for HRIMS trusted-source enforcement (Req 11.2).
 *
 * `fetch-employee` resolves HRIMS config BEFORE any DB lookup, so it is the
 * cleanest place to assert the end-to-end behaviour: a non-allowlisted host
 * (per `HRIMS_ALLOWED_HOSTS`) makes `getHrimsApiConfig` throw a
 * `HrimsConfigError`, the route returns 400 with the error code, and the
 * failure is recorded as a `HRIMS_SYNC_FAILED` audit event. It also asserts
 * that caller-supplied `hrimsApiUrl`/`hrimsApiKey` in the body are ignored.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockLogHrimsSync = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  withAuth: (h: any) => h,
}));

vi.mock('@/lib/error-handler', () => ({
  wrapHandler: (h: any) => h,
}));

vi.mock('@/lib/audit-logger', () => ({
  logHrimsSync: (...a: any[]) => mockLogHrimsSync(...a),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/logger', () => ({
  hrimsLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/minio', () => ({
  uploadFile: vi.fn(),
}));

// Real hrims-config is used (driven by env). db.systemSettings.findUnique
// returns null so the host falls to the HRIMS_HOST env default.
vi.mock('@/lib/db', () => ({
  db: {
    systemSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    institution: { findFirst: vi.fn(), findUnique: vi.fn() },
    employee: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

const ENV_BACKUP: Record<string, string | undefined> = {};

function snapshotEnv(keys: string[]) {
  for (const k of keys) ENV_BACKUP[k] = process.env[k];
}

function restoreEnv() {
  for (const [k, v] of Object.entries(ENV_BACKUP)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(ENV_BACKUP)) delete ENV_BACKUP[k];
}

const ENV_KEYS = [
  'HRIMS_HOST',
  'HRIMS_PORT',
  'HRIMS_API_KEY',
  'HRIMS_TOKEN',
  'HRIMS_ALLOWED_HOSTS',
  'HRIMS_API_SCHEME',
  'HRIMS_ALLOW_INSECURE_HTTP',
  'NODE_ENV',
];

function postRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:9002/api/hrims/fetch-employee', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
    body: JSON.stringify(body),
  });
}

const AUTH = { auth: { userId: 'admin-1', username: 'admin', role: 'Admin', institutionId: 'inst-1' } };

// `process.env.NODE_ENV` is typed readonly; assign through a cast.
function setEnvValue(key: string, value: string | undefined) {
  if (value === undefined) delete (process.env as any)[key];
  else (process.env as any)[key] = value;
}

describe('POST /api/hrims/fetch-employee — trusted source (Req 11.2)', () => {
  beforeEach(() => {
    snapshotEnv(ENV_KEYS);
    mockLogHrimsSync.mockReset();
    mockLogHrimsSync.mockResolvedValue(undefined);
    setEnvValue('NODE_ENV', 'test');
    setEnvValue('HRIMS_HOST', 'hrims.example.gov');
    setEnvValue('HRIMS_PORT', '8135');
    setEnvValue('HRIMS_API_KEY', 'key-1');
    setEnvValue('HRIMS_TOKEN', 'tok-1');
    setEnvValue('HRIMS_ALLOWED_HOSTS', undefined);
    setEnvValue('HRIMS_API_SCHEME', undefined);
    setEnvValue('HRIMS_ALLOW_INSECURE_HTTP', undefined);
  });

  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('returns 400 + HRIMS_SYNC_FAILED audit when the host is not allowlisted', async () => {
    process.env.HRIMS_HOST = 'evil.example';
    process.env.HRIMS_ALLOWED_HOSTS = 'hrims.example.gov, internal.example';

    const { POST } = (await import('./route')) as { POST: any };
    const res = await POST(postRequest({ zanId: '12345', institutionVoteNumber: 'V1' }), AUTH);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errorCode).toBe('HRIMS_HOST_NOT_ALLOWED');
    expect(body.success).toBe(false);

    // The failure is recorded as a HRIMS_SYNC_FAILED audit event.
    expect(mockLogHrimsSync).toHaveBeenCalledTimes(1);
    const audit = mockLogHrimsSync.mock.calls[0][0];
    expect(audit.success).toBe(false);
    expect(audit.additionalData.reason).toBe('HRIMS_HOST_NOT_ALLOWED');
  });

  it('ignores caller-supplied hrimsApiUrl/hrimsApiKey in the body', async () => {
    // Allow-list satisfied (default host) → config resolves, route proceeds to
    // its own zanId/payrollNumber validation. The body's hrimsApiUrl/hrimsApiKey
    // must NOT cause a schema error or be used.
    process.env.HRIMS_HOST = 'hrims.example.gov';
    process.env.HRIMS_ALLOWED_HOSTS = 'hrims.example.gov';

    const { POST } = (await import('./route')) as { POST: any };
    const res = await POST(
      postRequest({
        hrimsApiUrl: 'https://evil.example',
        hrimsApiKey: 'stolen-key',
        institutionVoteNumber: 'V1',
        // no zanId / payrollNumber on purpose
      }),
      AUTH
    );
    const body = await res.json();

    // Reached the route's own validation (not a config/schema error): the
    // caller-supplied URL/key were ignored and the request was accepted into
    // the handler, which then rejected it for missing identifiers.
    expect(res.status).toBe(400);
    expect(body.message).toMatch(/ZanID or Payroll Number/i);
    // No HRIMS_SYNC_FAILED audit fired — config load succeeded.
    expect(mockLogHrimsSync).not.toHaveBeenCalled();
  });
});