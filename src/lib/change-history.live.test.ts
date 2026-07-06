/**
 * Live-infrastructure integration test for the change-history JSONB queries
 * (GAP-M11).
 *
 * Unlike `change-history.integration.test.ts` (which mocks the pg pool), this
 * test exercises the REAL `audit.audit_log` table to confirm the PostgreSQL
 * JSONB filter syntax (`@>`, `->>`, `->`) and the column mapping
 * (`created_at AS "timestamp"`) are correct against an actual database.
 *
 * Guarded by `CSMS_LIVE_INTEGRATION=1` so it is skipped in the normal vitest
 * run (no DB available). Run it against a real/dev database:
 *
 *   CSMS_LIVE_INTEGRATION=1 DATABASE_URL=postgresql://... npx vitest run \
 *     src/lib/change-history.live.test.ts
 *
 * The test inserts a uniquely-tagged audit row, queries it through the helper,
 * asserts the JSONB field filter matches, then deletes the row (cleanup).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const LIVE = process.env.CSMS_LIVE_INTEGRATION === '1';

describe.skipIf(!LIVE)('change-history live-DB integration (GAP-M11)', () => {
  let getAuditPool: () => { query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }> };
  let queryChangeHistory: typeof import('./change-history').queryChangeHistory;
  let getLastChange: typeof import('./change-history').getLastChange;

  const MARKER = `LIVE_TEST_${Date.now()}`;
  const insertedIds: number[] = [];

  beforeAll(async () => {
    if (LIVE) {
      // The global test setup overrides DATABASE_URL with an unreachable test
      // DSN. Point the audit pool at the real database before importing it.
      // `CSMS_LIVE_DATABASE_URL` lets the caller choose the target; default to
      // the local dev DB.
      process.env.DATABASE_URL =
        process.env.CSMS_LIVE_DATABASE_URL ||
        'postgresql://postgres:Mamlaka2020@localhost:5432/nody?schema=public';
    }
    ({ getAuditPool } = await import('./audit-db'));
    ({ queryChangeHistory, getLastChange } = await import('./change-history'));
  });

  afterAll(async () => {
    if (!LIVE) return;
    // Clean up any rows we inserted.
    const pool = getAuditPool();
    for (const id of insertedIds) {
      try {
        await pool.query('DELETE FROM audit.audit_log WHERE id = $1', [id]);
      } catch {
        // best-effort
      }
    }
  });

  it('executes queryChangeHistory without SQL errors against the real DB', async () => {
    const rows = await queryChangeHistory({ entityType: 'USER', limit: 5 });
    expect(Array.isArray(rows)).toBe(true);
  });

  it('inserts a tagged row and retrieves it via the JSONB field filter', async () => {
    const pool = getAuditPool();
    const insertRes = await pool.query(
      `INSERT INTO audit.audit_log
         (action, request_route, entity_type, entity_id, additional_data, severity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        'USER_UPDATED',
        '/api/users/live-test',
        'USER',
        MARKER,
        JSON.stringify({
          fieldName: 'role',
          previousValue: 'HRO',
          newValue: 'HRMO',
          field: 'role',
        }),
        'INFO',
      ]
    );
    const id = insertRes.rows[0].id;
    insertedIds.push(id);

    // Query by entityType + the unique entityId (no JSONB filter) — must find it.
    const byEntity = await queryChangeHistory({ entityType: 'USER', entityId: MARKER });
    expect(byEntity.length).toBeGreaterThanOrEqual(1);
    expect(byEntity[0].entityType).toBe('USER');
    expect(byEntity[0].entityId).toBe(MARKER);
    // `created_at` is a timestamptz; the pg driver returns it as a Date.
    expect(byEntity[0].timestamp).toBeTruthy();

    // Query by the JSONB fieldName filter — must still find the tagged row,
    // proving the JSONB @>/->> syntax is valid against the real DB.
    const byField = await queryChangeHistory({
      entityType: 'USER',
      entityId: MARKER,
      fieldName: 'role',
    });
    expect(byField.length).toBeGreaterThanOrEqual(1);
    expect(byField[0].entityId).toBe(MARKER);
  });

  it('getLastChange returns the tagged row for the role field', async () => {
    const last = await getLastChange('USER', MARKER, 'role');
    expect(last).not.toBeNull();
    expect(last?.entityId).toBe(MARKER);
    expect(last?.additionalData?.newValue).toBe('HRMO');
  });
});