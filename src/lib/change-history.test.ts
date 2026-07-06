/**
 * Unit tests for the change-history query helper
 *
 * Verifies that queryChangeHistory builds correct SQL with the various
 * filter combinations, and getLastChange returns the most recent entry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();

vi.mock('./audit-db', () => ({
  getAuditPool: () => ({
    query: (...args: any[]) => mockQuery(...args),
  }),
}));

vi.mock('./db', () => ({ db: {} }));

vi.mock('./logger', () => ({
  dbLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

describe('change-history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a basic query with no filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { queryChangeHistory } = await import('./change-history');
    await queryChangeHistory({});
    const sql = mockQuery.mock.calls[0][0];
    const params = mockQuery.mock.calls[0][1];
    expect(sql).toMatch(/FROM audit\.audit_log/);
    // The audit table's timestamp column is `created_at`; it is aliased to
    // "timestamp" in the SELECT and used in ORDER BY / date-range filters.
    expect(sql).toMatch(/created_at AS "timestamp"/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
    expect(params).toEqual([100, 0]); // default limit, offset
  });

  it('applies entityType and entityId filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { queryChangeHistory } = await import('./change-history');
    await queryChangeHistory({ entityType: 'User', entityId: 'u-1', limit: 10 });
    const sql = mockQuery.mock.calls[0][0];
    const params = mockQuery.mock.calls[0][1];
    expect(sql).toMatch(/entity_type = \$1/);
    expect(sql).toMatch(/entity_id = \$2/);
    expect(params).toEqual(['User', 'u-1', 10, 0]);
  });

  it('applies fieldName filter using JSONB path', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { queryChangeHistory } = await import('./change-history');
    await queryChangeHistory({ fieldName: 'role' });
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/additional_data->>'fieldName'/);
  });

  it('applies date range filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { queryChangeHistory } = await import('./change-history');
    const since = new Date('2026-01-01');
    const until = new Date('2026-07-01');
    await queryChangeHistory({ since, until });
    const params = mockQuery.mock.calls[0][1];
    expect(params).toContain(since);
    expect(params).toContain(until);
  });

  it('returns parsed rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'log-1',
          timestamp: '2026-07-01T00:00:00Z',
          eventType: 'USER_UPDATED',
          userId: 'admin-1',
          username: 'admin',
          userRole: 'Admin',
          ipAddress: '10.0.0.5',
          entityType: 'User',
          entityId: 'u-1',
          additionalData: { previousValue: { role: 'HRO' }, newValue: { role: 'Admin' } },
        },
      ],
    });
    const { queryChangeHistory } = await import('./change-history');
    const rows = await queryChangeHistory({ entityType: 'User' });
    expect(rows).toHaveLength(1);
    expect(rows[0].additionalData.previousValue).toEqual({ role: 'HRO' });
  });

  it('returns empty array on DB error (fail-safe)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection terminated'));
    const { queryChangeHistory } = await import('./change-history');
    const rows = await queryChangeHistory({});
    expect(rows).toEqual([]);
  });

  it('getLastChange returns the most recent matching entry', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'log-latest',
          timestamp: '2026-07-01T00:00:00Z',
          eventType: 'USER_UPDATED',
          userId: 'admin-1',
          username: 'admin',
          userRole: 'Admin',
          ipAddress: '10.0.0.5',
          entityType: 'User',
          entityId: 'u-1',
          additionalData: { fieldName: 'role' },
        },
      ],
    });
    const { getLastChange } = await import('./change-history');
    const entry = await getLastChange('User', 'u-1', 'role');
    expect(entry?.id).toBe('log-latest');
  });

  it('getLastChange returns null when no matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { getLastChange } = await import('./change-history');
    const entry = await getLastChange('User', 'nonexistent', 'role');
    expect(entry).toBeNull();
  });
});
