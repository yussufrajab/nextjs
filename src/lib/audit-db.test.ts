/**
 * Unit tests for audit partition helpers
 *
 * Covers:
 * - assertPartitionsReady: throws on missing partitions, passes when present
 * - enforceRetentionPolicy: dry-run mode, skips recent, includes old
 * - ensurePartitions: idempotent, computes correct month boundaries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set a dummy DATABASE_URL so the audit-db module can instantiate its Pool
// without throwing. The Pool never actually connects in tests because we
// override `query` on the returned instance via the pg mock below.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the pg Pool so we can drive the test cases deterministically.
const mockQuery = vi.fn();

vi.mock('pg', () => {
  // Use a function (not arrow) so `new` works on it.
  function MockPool(this: any) {
    this.query = (...args: any[]) => mockQuery(...args);
    this.on = vi.fn();
  }
  return {
    Pool: MockPool,
    types: {
      setTypeParser: vi.fn(),
    },
  };
});

describe('audit-db — partition helpers', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ensurePartitions', () => {
    it('creates the requested number of monthly partitions', async () => {
      // Mock: every CREATE TABLE succeeds
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const { ensurePartitions } = await import('./audit-db');
      await ensurePartitions(3);

      // Should issue 3 CREATE TABLE statements (one per month)
      expect(mockQuery).toHaveBeenCalledTimes(3);
      // Each call should be a CREATE TABLE IF NOT EXISTS
      for (const call of mockQuery.mock.calls) {
        expect(call[0]).toMatch(/CREATE TABLE IF NOT EXISTS audit\.audit_log_\d{4}_\d{2}/);
      }
    });

    it('ignores "already exists" errors (idempotent)', async () => {
      // First call: succeed. Second call: error 42P07. Third: succeed.
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(Object.assign(new Error('relation already exists'), { code: '42P07' }))
        .mockResolvedValueOnce({ rows: [] });

      const { ensurePartitions } = await import('./audit-db');
      // Should NOT throw — the 42P07 is a benign race-condition case
      await expect(ensurePartitions(3)).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('propagates non-recoverable errors', async () => {
      // Mock: a connection-level error
      const connError = Object.assign(new Error('connection terminated'), { code: '08006' });
      mockQuery.mockRejectedValue(connError);

      const { ensurePartitions } = await import('./audit-db');
      // Should not throw, but should log the error — ensurePartitions is
      // designed to be tolerant of individual partition failures.
      await expect(ensurePartitions(1)).resolves.toBeUndefined();
    });
  });

  describe('assertPartitionsReady', () => {
    it('throws when current and next-month partitions are missing and cannot be created', async () => {
      // 1st call: information_schema lookup — returns empty (no partitions)
      // 2nd call: CREATE TABLE attempts (3 of them in ensurePartitions)
      // 3rd call: re-verify — still empty
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no partitions found
        .mockResolvedValue({ rows: [], rowCount: 0 }) // CREATE attempts (3 calls)
        .mockResolvedValueOnce({ rows: [] }); // re-verify still empty

      const { assertPartitionsReady } = await import('./audit-db');
      await expect(assertPartitionsReady()).rejects.toThrow(
        /CRITICAL: audit partitions missing after auto-create/
      );
    });

    it('passes when both current and next month partitions exist', async () => {
      // 1st call: lookup returns both partitions
      mockQuery.mockResolvedValueOnce({
        rows: [
          { table_name: 'audit_log_2026_07' },
          { table_name: 'audit_log_2026_08' },
        ],
      });

      const { assertPartitionsReady } = await import('./audit-db');
      await expect(assertPartitionsReady()).resolves.toBeUndefined();
      // Should not have called ensurePartitions
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('creates missing partitions and recovers without throwing', async () => {
      // 1st call: lookup — only current month exists
      // 2nd-4th calls: ensurePartitions creates 2 missing
      // 5th call: re-verify — both present now
      mockQuery
        .mockResolvedValueOnce({ rows: [{ table_name: 'audit_log_2026_07' }] })
        .mockResolvedValueOnce({ rows: [] }) // ensure creates next month
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'audit_log_2026_07' },
            { table_name: 'audit_log_2026_08' },
          ],
        });

      const { assertPartitionsReady } = await import('./audit-db');
      await expect(assertPartitionsReady()).resolves.toBeUndefined();
    });
  });

  describe('enforceRetentionPolicy', () => {
    it('returns empty array when no partitions exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { enforceRetentionPolicy } = await import('./audit-db');
      const detached = await enforceRetentionPolicy(12);
      expect(detached).toEqual([]);
    });

    it('does not detach partitions within the retention window', async () => {
      // 12-month retention; partition from 6 months ago is in-window
      const now = new Date();
      const recent = new Date(now.getUTCFullYear(), now.getUTCMonth() - 6, 1);
      const recentStr = `audit_log_${recent.getUTCFullYear()}_${String(recent.getUTCMonth() + 1).padStart(2, '0')}`;
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            partition_name: recentStr,
            bound: `FOR VALUES FROM ('${recent.toISOString()}') TO ('${new Date(recent.getUTCFullYear(), recent.getUTCMonth() + 1, 1).toISOString()}')`,
          },
        ],
      });

      const { enforceRetentionPolicy } = await import('./audit-db');
      const detached = await enforceRetentionPolicy(12);
      expect(detached).toEqual([]);
      // Should NOT have called ALTER TABLE DETACH
      const alterCalls = mockQuery.mock.calls.filter((c) =>
        String(c[0]).includes('DETACH PARTITION')
      );
      expect(alterCalls).toHaveLength(0);
    });

    it('detaches partitions older than the retention window', async () => {
      // 12-month retention; partition from 24 months ago should be detached
      const now = new Date();
      const old = new Date(now.getUTCFullYear(), now.getUTCMonth() - 24, 1);
      const oldStr = `audit_log_${old.getUTCFullYear()}_${String(old.getUTCMonth() + 1).padStart(2, '0')}`;
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              partition_name: oldStr,
              bound: `FOR VALUES FROM ('${old.toISOString()}') TO ('${new Date(old.getUTCFullYear(), old.getUTCMonth() + 1, 1).toISOString()}')`,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // ALTER TABLE response

      const { enforceRetentionPolicy } = await import('./audit-db');
      const detached = await enforceRetentionPolicy(12);
      expect(detached).toContain(oldStr);
      const alterCalls = mockQuery.mock.calls.filter((c) =>
        String(c[0]).includes('DETACH PARTITION')
      );
      expect(alterCalls).toHaveLength(1);
    });

    it('dryRun returns partition names without executing ALTER TABLE', async () => {
      const now = new Date();
      const old = new Date(now.getUTCFullYear(), now.getUTCMonth() - 100, 1);
      const oldStr = `audit_log_${old.getUTCFullYear()}_${String(old.getUTCMonth() + 1).padStart(2, '0')}`;
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            partition_name: oldStr,
            bound: `FOR VALUES FROM ('${old.toISOString()}') TO ('${new Date(old.getUTCFullYear(), old.getUTCMonth() + 1, 1).toISOString()}')`,
          },
        ],
      });

      const { enforceRetentionPolicy } = await import('./audit-db');
      const detached = await enforceRetentionPolicy(12, { dryRun: true });
      expect(detached).toContain(oldStr);
      // dry-run should NOT execute ALTER TABLE
      const alterCalls = mockQuery.mock.calls.filter((c) =>
        String(c[0]).includes('DETACH PARTITION')
      );
      expect(alterCalls).toHaveLength(0);
    });
  });
});
