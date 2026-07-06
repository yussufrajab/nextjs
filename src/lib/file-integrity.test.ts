/**
 * Unit tests for file integrity helpers
 *
 * Verifies:
 *  - sha256Hex produces correct hash
 *  - recordDocumentHash upserts the row
 *  - verifyDocumentHash returns ok=true for matching data
 *  - verifyDocumentHash returns ok=false + audit on mismatch
 *  - verifyDocumentHash returns ok=true (fail-open) when no hash recorded
 *  - clearDocumentHash removes the row idempotently
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpsert = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFileUpsert = vi.fn();
const mockFileFindUnique = vi.fn();
const mockFileUpdate = vi.fn();
const mockFileDelete = vi.fn();
const mockLogAudit = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    documentHash: {
      upsert: (...a: any[]) => mockUpsert(...a),
      findUnique: (...a: any[]) => mockFindUnique(...a),
      update: (...a: any[]) => mockUpdate(...a),
      delete: (...a: any[]) => mockDelete(...a),
    },
    fileHash: {
      upsert: (...a: any[]) => mockFileUpsert(...a),
      findUnique: (...a: any[]) => mockFileFindUnique(...a),
      update: (...a: any[]) => mockFileUpdate(...a),
      delete: (...a: any[]) => mockFileDelete(...a),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: (...a: any[]) => mockLogAudit(...a),
  AuditEventType: { POTENTIAL_BREACH: 'POTENTIAL_BREACH' },
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { CRITICAL: 'CRITICAL', INFO: 'INFO' },
}));

vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
}));

describe('file-integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sha256Hex', () => {
    it('produces a 64-character hex string', async () => {
      const { sha256Hex } = await import('./file-integrity');
      const h = sha256Hex('hello');
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces a known-correct hash for "hello"', async () => {
      const { sha256Hex } = await import('./file-integrity');
      // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(sha256Hex('hello')).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      );
    });

    it('accepts a Buffer input', async () => {
      const { sha256Hex } = await import('./file-integrity');
      expect(sha256Hex(Buffer.from('hello'))).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      );
    });
  });

  describe('recordDocumentHash', () => {
    it('upserts the row with computed hash and byte size', async () => {
      mockUpsert.mockResolvedValueOnce({});
      const { recordDocumentHash } = await import('./file-integrity');
      const result = await recordDocumentHash('emp-1', 'ardhilHaliUrl', 'hello', 'user-1');
      expect(result.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
      expect(result.byteSize).toBe(5);
      expect(mockUpsert).toHaveBeenCalledOnce();
    });
  });

  describe('verifyDocumentHash', () => {
    it('returns ok=true when no hash recorded (fail-open for legacy)', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      const { verifyDocumentHash } = await import('./file-integrity');
      const result = await verifyDocumentHash('emp-1', 'field', 'data');
      expect(result.ok).toBe(true);
      expect(result.reason).toBe('no_hash_recorded');
      // Should NOT have logged an audit event on fail-open
      expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it('returns ok=true when hash matches', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: 'h1',
        sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        byteSize: 5,
      });
      mockUpdate.mockResolvedValueOnce({});

      const { verifyDocumentHash } = await import('./file-integrity');
      const result = await verifyDocumentHash('emp-1', 'field', 'hello');
      expect(result.ok).toBe(true);
      expect(result.actual).toBe(result.expected);
      // Audit was NOT called on match
      expect(mockLogAudit).not.toHaveBeenCalled();
      // lastVerified was updated
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('returns ok=false and writes CRITICAL audit on mismatch', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: 'h1',
        sha256: 'expected-hash-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        byteSize: 5,
      });
      mockLogAudit.mockResolvedValueOnce(undefined);

      const { verifyDocumentHash } = await import('./file-integrity');
      const result = await verifyDocumentHash('emp-1', 'ardhilHaliUrl', 'tampered');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('hash_mismatch');
      expect(mockLogAudit).toHaveBeenCalledOnce();
      // Audit call should be CRITICAL severity
      const call = mockLogAudit.mock.calls[0][0];
      expect(call.severity).toBe('CRITICAL');
      expect(call.eventType).toBe('POTENTIAL_BREACH');
    });
  });

  describe('clearDocumentHash', () => {
    it('deletes the row', async () => {
      mockDelete.mockResolvedValueOnce({});
      const { clearDocumentHash } = await import('./file-integrity');
      await clearDocumentHash('emp-1', 'field');
      expect(mockDelete).toHaveBeenCalledOnce();
    });

    it('is idempotent (no error when row not found)', async () => {
      mockDelete.mockRejectedValueOnce({ code: 'P2025' }); // Prisma record-not-found
      const { clearDocumentHash } = await import('./file-integrity');
      await expect(clearDocumentHash('emp-1', 'field')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // objectKey-keyed helpers (generic MinIO uploads — /api/files/* routes)
  // -------------------------------------------------------------------------

  describe('recordFileHash', () => {
    it('upserts the FileHash row by objectKey with computed hash and byte size', async () => {
      mockFileUpsert.mockResolvedValueOnce({});
      const { recordFileHash } = await import('./file-integrity');
      const result = await recordFileHash('documents/abc.pdf', 'hello', 'user-1');
      expect(result.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
      expect(result.byteSize).toBe(5);
      expect(mockFileUpsert).toHaveBeenCalledOnce();
      const arg = mockFileUpsert.mock.calls[0][0];
      expect(arg.where.objectKey).toBe('documents/abc.pdf');
    });
  });

  describe('verifyFileHash', () => {
    it('returns ok=true when no hash recorded (fail-open)', async () => {
      mockFileFindUnique.mockResolvedValueOnce(null);
      const { verifyFileHash } = await import('./file-integrity');
      const result = await verifyFileHash('documents/abc.pdf', 'data');
      expect(result.ok).toBe(true);
      expect(result.reason).toBe('no_hash_recorded');
      expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it('returns ok=true when hash matches and updates lastVerified', async () => {
      mockFileFindUnique.mockResolvedValueOnce({
        id: 'h1',
        sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        byteSize: 5,
      });
      mockFileUpdate.mockResolvedValueOnce({});
      const { verifyFileHash } = await import('./file-integrity');
      const result = await verifyFileHash('documents/abc.pdf', 'hello');
      expect(result.ok).toBe(true);
      expect(mockFileUpdate).toHaveBeenCalledOnce();
      expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it('returns ok=false and writes CRITICAL audit on mismatch', async () => {
      mockFileFindUnique.mockResolvedValueOnce({
        id: 'h1',
        sha256: 'expected-hash-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        byteSize: 5,
      });
      mockLogAudit.mockResolvedValueOnce(undefined);
      const { verifyFileHash } = await import('./file-integrity');
      const result = await verifyFileHash('documents/abc.pdf', 'tampered');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('hash_mismatch');
      expect(mockLogAudit).toHaveBeenCalledOnce();
      const call = mockLogAudit.mock.calls[0][0];
      expect(call.severity).toBe('CRITICAL');
      expect(call.eventType).toBe('POTENTIAL_BREACH');
      expect(call.additionalData.objectKey).toBe('documents/abc.pdf');
    });

    it('fails open when the DB lookup throws (table unavailable)', async () => {
      mockFileFindUnique.mockRejectedValueOnce(new Error('relation "FileHash" does not exist'));
      const { verifyFileHash } = await import('./file-integrity');
      const result = await verifyFileHash('documents/abc.pdf', 'data');
      expect(result.ok).toBe(true);
      expect(result.reason).toBe('no_hash_recorded');
      expect(mockLogAudit).not.toHaveBeenCalled();
    });
  });

  describe('clearFileHash', () => {
    it('deletes the row by objectKey', async () => {
      mockFileDelete.mockResolvedValueOnce({});
      const { clearFileHash } = await import('./file-integrity');
      await clearFileHash('documents/abc.pdf');
      expect(mockFileDelete).toHaveBeenCalledOnce();
    });

    it('is idempotent (no error when row not found)', async () => {
      mockFileDelete.mockRejectedValueOnce({ code: 'P2025' });
      const { clearFileHash } = await import('./file-integrity');
      await expect(clearFileHash('documents/abc.pdf')).resolves.toBeUndefined();
    });
  });
});
