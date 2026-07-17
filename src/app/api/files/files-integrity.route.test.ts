// @vitest-environment node
/**
 * Route-level tests for GAP-C2: the generic files/upload, files/download, and
 * files/preview endpoints must invoke the file-integrity helpers.
 *
 * Verifies:
 *  - Upload calls recordFileHash after the file is persisted to MinIO.
 *  - Download calls verifyFileHash and rejects with 410 on a hash mismatch.
 *  - Preview (inline) calls verifyFileHash and rejects with 410 on a mismatch.
 *  - Download fails open (returns 200) when no hash is recorded for the object.
 *
 * The helpers themselves are unit-tested in src/lib/file-integrity.test.ts; this
 * file asserts the wiring at the route layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- spies for the integrity helpers (the things we are asserting on) ------
const mockRecordFileHash = vi.fn();
const mockVerifyFileHash = vi.fn();

vi.mock('@/lib/file-integrity', () => ({
  recordFileHash: (...a: any[]) => mockRecordFileHash(...a),
  verifyFileHash: (...a: any[]) => mockVerifyFileHash(...a),
}));

// --- auth: always authenticated as an HRO of institution A ------------------
const authContext = {
  userId: 'user-1',
  username: 'hro_user',
  role: 'HRO',
  institutionId: 'inst-A',
};
vi.mock('@/lib/api-auth', () => ({
  verifyAuth: () => Promise.resolve({ authenticated: true, context: authContext }),
}));

// --- rate limiter: always allowed -------------------------------------------
vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: () => Promise.resolve({ allowed: true, retryAfter: 0 }),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: () => Promise.resolve({ valid: true }),
}));

// --- file validation: always accept -----------------------------------------
vi.mock('@/lib/file-validation', () => ({
  validateFileUpload: () =>
    Promise.resolve({ success: true, error: null, errorCode: null, status: 200 }),
}));

// --- MinIO: in-memory --------------------------------------------------------
const mockUploadFile = vi.fn();
const mockDownloadFile = vi.fn();
const mockGetFileMetadata = vi.fn();
vi.mock('@/lib/minio', () => ({
  uploadFile: (...a: any[]) => mockUploadFile(...a),
  generateObjectKey: (folder: string, name: string) => `${folder}/${name}`,
  downloadFile: (...a: any[]) => mockDownloadFile(...a),
  getFileMetadata: (...a: any[]) => mockGetFileMetadata(...a),
  generatePresignedUrl: () => Promise.resolve('https://minio.example/presigned'),
  isPathTraversal: (key: string) =>
    key.includes('..') || key.includes('\0') || key.startsWith('/'),
}));

// --- audit logger: no-op sink + getClientIp ----------------------------------
vi.mock('@/lib/audit-logger', () => ({
  logFileAction: () => Promise.resolve(undefined),
  getClientIp: () => '127.0.0.1',
}));

// --- logger: no-op (wrapHandler uses authLogger.child) ----------------------
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
  hrimsLogger: childLogger,
}));

// Helper: build an async-iterable that yields the given chunks (mimics a
// Node Readable stream as used by the MinIO download path).
function fakeStream(chunks: Buffer[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  };
}

describe('files/* integrity wiring (GAP-C2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordFileHash.mockResolvedValue({ sha256: 'abc', byteSize: 10 });
  });

  describe('POST /api/files/upload', () => {
    it('calls recordFileHash with the objectKey, buffer, and uploader id after persisting', async () => {
      mockUploadFile.mockResolvedValue({
        objectKey: 'documents/test.pdf',
        etag: 'etag-1',
        bucketName: 'csms',
      });

      const { POST } = await import('./upload/route');

      // Build a real multipart/form-data body so request.formData() parses a
      // genuine File part (synthesizing a File via `new File([...])` and
      // round-tripping it through Request/FormData hits an undici realm quirk).
      const boundary = '----testboundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="folder"',
        '',
        'documents',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.pdf"',
        'Content-Type: application/pdf',
        '',
        'file-bytes',
        `--${boundary}--`,
        '',
      ].join('\r\n');
      const req = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body,
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);

      // Integrity hash recorded with the persisted objectKey + uploader id.
      expect(mockRecordFileHash).toHaveBeenCalledOnce();
      const [objectKey, buffer, uploadedBy] = mockRecordFileHash.mock.calls[0];
      expect(objectKey).toBe('documents/test.pdf');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(uploadedBy).toBe('user-1');
    });
  });

  describe('GET /api/files/download/[...objectKey]', () => {
    it('calls verifyFileHash and rejects with 410 on a hash mismatch', async () => {
      mockDownloadFile.mockResolvedValue(fakeStream([Buffer.from('tampered-bytes')]));
      mockGetFileMetadata.mockResolvedValue({
        contentType: 'application/pdf',
        size: 14,
        lastModified: new Date(),
      });
      mockVerifyFileHash.mockResolvedValue({
        ok: false,
        expected: 'expected-hash',
        actual: 'actual-hash',
        reason: 'hash_mismatch',
      });

      const { GET } = await import('./download/[...objectKey]/route');
      const req = new NextRequest('http://localhost/api/files/download/documents/abc.pdf');
      const res = await GET(req, { params: Promise.resolve({ objectKey: ['documents', 'abc.pdf'] }) } as any);

      expect(res.status).toBe(410);
      expect(mockVerifyFileHash).toHaveBeenCalledOnce();
      const [objectKey] = mockVerifyFileHash.mock.calls[0];
      expect(objectKey).toBe('documents/abc.pdf');
    });

    it('fails open (200) when no hash is recorded for the object', async () => {
      mockDownloadFile.mockResolvedValue(fakeStream([Buffer.from('legacy-bytes')]));
      mockGetFileMetadata.mockResolvedValue({
        contentType: 'application/pdf',
        size: 12,
        lastModified: new Date(),
      });
      mockVerifyFileHash.mockResolvedValue({
        ok: true,
        expected: null,
        actual: 'actual-hash',
        reason: 'no_hash_recorded',
      });

      const { GET } = await import('./download/[...objectKey]/route');
      const req = new NextRequest('http://localhost/api/files/download/documents/legacy.pdf');
      const res = await GET(req, { params: Promise.resolve({ objectKey: ['documents', 'legacy.pdf'] }) } as any);

      expect(res.status).toBe(200);
      expect(mockVerifyFileHash).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/files/preview/[...objectKey]', () => {
    it('calls verifyFileHash (inline mode) and rejects with 410 on a hash mismatch', async () => {
      mockDownloadFile.mockResolvedValue(fakeStream([Buffer.from('tampered-bytes')]));
      mockGetFileMetadata.mockResolvedValue({
        contentType: 'application/pdf',
        size: 14,
        lastModified: new Date(),
      });
      mockVerifyFileHash.mockResolvedValue({
        ok: false,
        expected: 'expected-hash',
        actual: 'actual-hash',
        reason: 'hash_mismatch',
      });

      const { GET } = await import('./preview/[...objectKey]/route');
      const req = new NextRequest(
        'http://localhost/api/files/preview/documents/abc.pdf?mode=inline'
      );
      const res = await GET(req, { params: Promise.resolve({ objectKey: ['documents', 'abc.pdf'] }) } as any);

      expect(res.status).toBe(410);
      expect(mockVerifyFileHash).toHaveBeenCalledOnce();
    });
  });
});