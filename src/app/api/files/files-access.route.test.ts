// @vitest-environment node
/**
 * Route-level tests for the per-object IDOR guard on the generic file routes
 * (Req 10.1–10.2, 17.3, 27.1, 30.1): GET /api/files/download, /preview, /exists.
 *
 * Verifies the wiring:
 *  - On denial the route returns 403 and never touches MinIO (no existence
 *    oracle — getFileMetadata / downloadFile are not called).
 *  - On allow the route proceeds to MinIO.
 *
 * The access-decision logic is unit-tested in src/lib/file-access.test.ts;
 * here `authorizeFileOrDeny` is mocked so we assert the route's handling of
 * its allow/deny result, not the decision itself.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuthorizeFileOrDeny = vi.fn();

vi.mock('@/lib/file-access', () => ({
  authorizeFileOrDeny: (...a: any[]) => mockAuthorizeFileOrDeny(...a),
}));

vi.mock('@/lib/file-integrity', () => ({
  verifyFileHash: () => Promise.resolve({ ok: true, expected: 'h', actual: 'h' }),
}));

vi.mock('@/lib/api-auth', () => ({
  verifyAuth: () =>
    Promise.resolve({
      authenticated: true,
      context: { userId: 'u-1', username: 'hro', role: 'HRO', institutionId: 'inst-A' },
    }),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: () => Promise.resolve({ allowed: true, retryAfter: 0 }),
  getClientIp: () => '127.0.0.1',
}));

const mockDownloadFile = vi.fn();
const mockGetFileMetadata = vi.fn();
const mockGeneratePresignedUrl = vi.fn();
vi.mock('@/lib/minio', () => ({
  downloadFile: (...a: any[]) => mockDownloadFile(...a),
  getFileMetadata: (...a: any[]) => mockGetFileMetadata(...a),
  generatePresignedUrl: (...a: any[]) => mockGeneratePresignedUrl(...a),
  isPathTraversal: (key: string) => key.includes('..') || key.includes('\0') || key.startsWith('/'),
  MAX_PRESIGNED_URL_EXPIRY_SECONDS: 3600,
}));

vi.mock('@/lib/audit-logger', () => ({
  logFileAction: () => Promise.resolve(undefined),
  logUnauthorizedAccess: () => Promise.resolve(undefined),
  safeAuditLog: async (p: Promise<void>) => {
    try {
      await p;
    } catch {
      /* swallow — exercised helper */
    }
  },
  getClientIp: () => '127.0.0.1',
}));

const childLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  debug: vi.fn(),
  child: () => childLogger,
};
vi.mock('@/lib/logger', () => ({
  logger: childLogger,
  fileLogger: childLogger,
  authLogger: childLogger,
}));

function fakeStream(chunks: Buffer[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDownloadFile.mockResolvedValue(fakeStream([Buffer.from('ok')]));
  mockGetFileMetadata.mockResolvedValue({
    contentType: 'application/pdf',
    size: 2,
    lastModified: new Date(),
  });
  mockGeneratePresignedUrl.mockResolvedValue('https://minio.example/presigned');
});

function req(pathAndKey: string) {
  return new NextRequest(`http://localhost/api/files/${pathAndKey}`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });
}

describe('files/* IDOR guard wiring (Req 10.1–10.2)', () => {
  it('download returns 403 and never touches MinIO when access is denied', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({
      allowed: false,
      response: new Response('{"success":false,"message":"Access denied"}', {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    });
    const { GET } = await import('./download/[...objectKey]/route');

    const res = await GET(req('download/employee-documents/emp-other_1_x.pdf'), {
      params: Promise.resolve({ objectKey: ['employee-documents', 'emp-other_1_x.pdf'] }),
    } as any);

    expect(res.status).toBe(403);
    expect(mockGetFileMetadata).not.toHaveBeenCalled();
    expect(mockDownloadFile).not.toHaveBeenCalled();
  });

  it('download proceeds to MinIO when access is allowed', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({ allowed: true });
    const { GET } = await import('./download/[...objectKey]/route');

    const res = await GET(req('download/employee-documents/emp-me_1_x.pdf'), {
      params: Promise.resolve({ objectKey: ['employee-documents', 'emp-me_1_x.pdf'] }),
    } as any);

    expect(res.status).toBe(200);
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('preview returns 403 and never touches MinIO when access is denied', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({
      allowed: false,
      response: new Response('{"success":false,"message":"Access denied"}', {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    });
    const { GET } = await import('./preview/[...objectKey]/route');

    const res = await GET(req('preview/employee-photos/emp-other.jpg'), {
      params: Promise.resolve({ objectKey: ['employee-photos', 'emp-other.jpg'] }),
    } as any);

    expect(res.status).toBe(403);
    expect(mockGetFileMetadata).not.toHaveBeenCalled();
    expect(mockDownloadFile).not.toHaveBeenCalled();
    expect(mockGeneratePresignedUrl).not.toHaveBeenCalled();
  });

  it('preview proceeds when access is allowed', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({ allowed: true });
    const { GET } = await import('./preview/[...objectKey]/route');

    const res = await GET(req('preview/employee-photos/emp-me.jpg'), {
      params: Promise.resolve({ objectKey: ['employee-photos', 'emp-me.jpg'] }),
    } as any);

    expect(res.status).toBe(200);
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('exists returns 403 and never touches MinIO when access is denied (no existence oracle)', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({
      allowed: false,
      response: new Response('{"success":false,"message":"Access denied"}', {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    });
    const { GET } = await import('./exists/[...objectKey]/route');

    const res = await GET(req('exists/employee-documents/emp-other_1_x.pdf'), {
      params: Promise.resolve({ objectKey: ['employee-documents', 'emp-other_1_x.pdf'] }),
    } as any);

    expect(res.status).toBe(403);
    expect(mockGetFileMetadata).not.toHaveBeenCalled();
  });

  it('exists proceeds when access is allowed', async () => {
    mockAuthorizeFileOrDeny.mockResolvedValueOnce({ allowed: true });
    const { GET } = await import('./exists/[...objectKey]/route');

    const res = await GET(req('exists/employee-documents/emp-me_1_x.pdf'), {
      params: Promise.resolve({ objectKey: ['employee-documents', 'emp-me_1_x.pdf'] }),
    } as any);

    // 200 with exists:true (file metadata resolved from the mock).
    expect(res.status).toBe(200);
    expect(mockGetFileMetadata).toHaveBeenCalled();
  });
});