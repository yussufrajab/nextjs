/**
 * Change history query helper
 *
 * Backed by the `audit.audit_log` table's `additional_data` JSONB column, which
 * stores pre/post values for entity modifications. This helper provides
 * ergonomic queries for the common operational questions:
 *
 *   - "Show me all role changes for user X in the last 30 days"
 *   - "When was the institution on this employee last changed?"
 *   - "Who approved request req-123 and what did they change?"
 *
 * Uses PostgreSQL JSONB operators (@>, ->, ->>) for efficient indexed lookups.
 */

import { db } from './db';
import { dbLogger } from './logger';

export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string | null;
  username: string | null;
  userRole: string | null;
  ipAddress: string | null;
  entityType: string;
  entityId: string | null;
  additionalData: Record<string, any>;
}

export interface ChangeHistoryQuery {
  entityType?: string;
  entityId?: string;
  fieldName?: string;        // e.g. "role", "institutionId"
  performedById?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query change history for an entity. Returns rows whose `additional_data`
 * contains a `previousValue` / `newValue` pair for the given field (if
 * specified).
 */
export async function queryChangeHistory(
  q: ChangeHistoryQuery
): Promise<ChangeHistoryEntry[]> {
  const pool = db;
  const conditions: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q.entityType) {
    conditions.push(`entity_type = $${i++}`);
    params.push(q.entityType);
  }
  if (q.entityId) {
    conditions.push(`entity_id = $${i++}`);
    params.push(q.entityId);
  }
  if (q.performedById) {
    conditions.push(`user_id = $${i++}`);
    params.push(q.performedById);
  }
  if (q.since) {
    conditions.push(`created_at >= $${i++}`);
    params.push(q.since);
  }
  if (q.until) {
    conditions.push(`created_at <= $${i++}`);
    params.push(q.until);
  }
  if (q.fieldName) {
    // JSONB path: additional_data->>'previousValue' is the field name
    // OR additional_data->'previousValue' is an object {field: value}
    // We support both shapes used in the codebase.
    conditions.push(
      `(additional_data->>'fieldName' = $${i} OR additional_data->>'previousValue' = $${i} OR additional_data->'previousValue'->>'field' = $${i})`
    );
    params.push(q.fieldName);
    i++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = q.limit ?? 100;
  const offset = q.offset ?? 0;
  params.push(limit, offset);

  const sql = `
    SELECT
      id,
      created_at AS "timestamp",
      action AS "eventType",
      user_id AS "userId",
      username,
      user_role AS "userRole",
      ip_address AS "ipAddress",
      entity_type AS "entityType",
      entity_id AS "entityId",
      additional_data AS "additionalData"
    FROM audit.audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${i++} OFFSET $${i++}
  `;

  try {
    // We use the Prisma client to access the audit pool indirectly;
    // for raw SQL we need to use the pg pool directly via the audit-db helper.
    const { getAuditPool } = await import('./audit-db');
    const result = await getAuditPool().query(sql, params);
    return result.rows as ChangeHistoryEntry[];
  } catch (err) {
    dbLogger.error({ err, query: q }, 'queryChangeHistory failed');
    return [];
  }
}

/**
 * Convenience: get the last N changes to a specific field of an entity.
 * Used by "what was the previous value of X?" lookups.
 */
export async function getLastChange(
  entityType: string,
  entityId: string,
  fieldName: string
): Promise<ChangeHistoryEntry | null> {
  const rows = await queryChangeHistory({
    entityType,
    entityId,
    fieldName,
    limit: 1,
  });
  return rows[0] ?? null;
}
