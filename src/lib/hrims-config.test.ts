/**
 * Tests for HRIMS trusted-source / SSRF elimination (Req 11.2).
 *
 * Verifies that `getHrimsConfig` / `getHrimsApiConfig` enforce the host
 * allow-list (`HRIMS_ALLOWED_HOSTS`) and reject non-https in production,
 * throwing a typed `HrimsConfigError` that routes surface as a 400.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSystemSettingsFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    systemSettings: {
      findUnique: (...a: any[]) => mockSystemSettingsFindUnique(...a),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  hrimsLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const ENV_BACKUP: Record<string, string | undefined> = {};

function setEnv(map: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

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

async function loadConfig() {
  const { getHrimsConfig, getHrimsApiConfig, isHrimsConfigError, HrimsConfigError } =
    await import('./hrims-config');
  return { getHrimsConfig, getHrimsApiConfig, isHrimsConfigError, HrimsConfigError };
}

describe('hrims-config — trusted source (Req 11.2)', () => {
  beforeEach(() => {
    snapshotEnv(ENV_KEYS);
    mockSystemSettingsFindUnique.mockReset();
    // No DB settings → fall through to env defaults.
    mockSystemSettingsFindUnique.mockResolvedValue(null);
    setEnv({
      NODE_ENV: 'test', // non-production: https not required by default
      HRIMS_HOST: 'hrims.example.gov',
      HRIMS_PORT: '8135',
      HRIMS_API_KEY: 'key-1',
      HRIMS_TOKEN: 'tok-1',
      HRIMS_ALLOWED_HOSTS: undefined,
      HRIMS_API_SCHEME: undefined,
      HRIMS_ALLOW_INSECURE_HTTP: undefined,
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('returns the config when the host is on the allow-list (case-insensitive)', async () => {
    setEnv({ HRIMS_ALLOWED_HOSTS: 'HRIMS.EXAMPLE.GOV, other.example' });
    const { getHrimsApiConfig } = await loadConfig();
    const cfg = await getHrimsApiConfig();
    expect(cfg.BASE_URL).toBe('http://hrims.example.gov:8135/api');
    expect(cfg.API_KEY).toBe('key-1');
    expect(cfg.TOKEN).toBe('tok-1');
  });

  it('throws HRIMS_HOST_NOT_ALLOWED when the host is not on the allow-list', async () => {
    setEnv({
      HRIMS_HOST: 'evil.example',
      HRIMS_ALLOWED_HOSTS: 'hrims.example.gov, internal.example',
    });
    const { getHrimsConfig, isHrimsConfigError } = await loadConfig();
    let caught: unknown;
    try {
      await getHrimsConfig();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeTruthy();
    expect(isHrimsConfigError(caught)).toBe(true);
    expect((caught as any).code).toBe('HRIMS_HOST_NOT_ALLOWED');
    expect((caught as any).message).toContain('evil.example');
  });

  it('enforces the allow-list against a DB-stored host too (not just the env default)', async () => {
    // DB returns a tampered host that is not allowlisted.
    mockSystemSettingsFindUnique.mockImplementation((args: any) => {
      const key = args?.where?.key;
      if (key === 'hrims_host') return Promise.resolve({ value: 'attacker.example' });
      return Promise.resolve(null);
    });
    setEnv({ HRIMS_HOST: 'hrims.example.gov', HRIMS_ALLOWED_HOSTS: 'hrims.example.gov' });
    const { getHrimsConfig, isHrimsConfigError } = await loadConfig();
    let caught: any;
    try {
      await getHrimsConfig();
    } catch (e) {
      caught = e;
    }
    expect(isHrimsConfigError(caught)).toBe(true);
    expect(caught.code).toBe('HRIMS_HOST_NOT_ALLOWED');
  });

  it('does not enforce an allow-list when HRIMS_ALLOWED_HOSTS is unset (dev default)', async () => {
    setEnv({ HRIMS_HOST: 'anything.example', HRIMS_ALLOWED_HOSTS: undefined });
    const { getHrimsApiConfig } = await loadConfig();
    const cfg = await getHrimsApiConfig();
    expect(cfg.BASE_URL).toBe('http://anything.example:8135/api');
  });

  it('rejects non-https in production unless HRIMS_ALLOW_INSECURE_HTTP=true', async () => {
    setEnv({
      NODE_ENV: 'production',
      HRIMS_API_SCHEME: 'http',
      HRIMS_ALLOWED_HOSTS: 'hrims.example.gov',
      HRIMS_ALLOW_INSECURE_HTTP: undefined,
    });
    const { getHrimsConfig, isHrimsConfigError } = await loadConfig();
    let caught: any;
    try {
      await getHrimsConfig();
    } catch (e) {
      caught = e;
    }
    expect(isHrimsConfigError(caught)).toBe(true);
    expect(caught.code).toBe('HRIMS_HTTPS_REQUIRED');
  });

  it('allows https in production', async () => {
    setEnv({
      NODE_ENV: 'production',
      HRIMS_API_SCHEME: 'https',
      HRIMS_ALLOWED_HOSTS: 'hrims.example.gov',
    });
    const { getHrimsApiConfig } = await loadConfig();
    const cfg = await getHrimsApiConfig();
    expect(cfg.BASE_URL).toBe('https://hrims.example.gov:8135/api');
  });

  it('allows http in production only with an explicit opt-in', async () => {
    setEnv({
      NODE_ENV: 'production',
      HRIMS_API_SCHEME: 'http',
      HRIMS_ALLOWED_HOSTS: '10.0.217.11',
      HRIMS_HOST: '10.0.217.11',
      HRIMS_ALLOW_INSECURE_HTTP: 'true',
    });
    const { getHrimsApiConfig } = await loadConfig();
    const cfg = await getHrimsApiConfig();
    expect(cfg.BASE_URL).toBe('http://10.0.217.11:8135/api');
  });

  it('ignores an invalid HRIMS_API_SCHEME and falls back to http (still subject to https-in-prod)', async () => {
    setEnv({ NODE_ENV: 'test', HRIMS_API_SCHEME: 'ftp' });
    const { getHrimsApiConfig } = await loadConfig();
    const cfg = await getHrimsApiConfig();
    expect(cfg.BASE_URL.startsWith('http://')).toBe(true);
  });
});