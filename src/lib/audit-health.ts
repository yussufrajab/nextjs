/**
 * Audit Health Tracking
 *
 * Provides health checks for the audit logging subsystem:
 * - Database connectivity to the audit schema
 * - Audit log table existence and row counts
 * - Recent event ingestion verification
 */

import { getAuditPool } from './audit-db';
import { dbLogger } from '@/lib/logger';

export interface AuditHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: { status: string; latencyMs: number };
    auditTable: { status: string; rowCount: number };
    recentEvents: { status: string; count24h: number; latestEventAt: string | null };
    partitions: { status: string; currentMonth: boolean; nextMonth: boolean };
  };
  timestamp: string;
}

export async function checkAuditHealth(): Promise<AuditHealthCheck> {
  const pool = getAuditPool();
  const checks: AuditHealthCheck['checks'] = {
    database: { status: 'unknown', latencyMs: 0 },
    auditTable: { status: 'unknown', rowCount: 0 },
    recentEvents: { status: 'unknown', count24h: 0, latestEventAt: null },
    partitions: { status: 'unknown', currentMonth: false, nextMonth: false },
  };

  // 1. Database connectivity
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
    dbLogger.error({ err }, 'Audit health: database connectivity failed');
    return {
      status: 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Audit table row count
  try {
    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM audit.audit_log'
    );
    checks.auditTable = {
      status: 'ok',
      rowCount: countRes.rows[0]?.count ?? 0,
    };
  } catch (err) {
    checks.auditTable = { status: 'error', rowCount: 0 };
    dbLogger.error({ err }, 'Audit health: table check failed');
  }

  // 3. Recent events (last 24 hours)
  try {
    const recentRes = await pool.query(
      `SELECT COUNT(*)::int AS count, MAX(created_at) AS latest
       FROM audit.audit_log
       WHERE created_at >= NOW() - INTERVAL '24 hours'`
    );
    checks.recentEvents = {
      status: 'ok',
      count24h: recentRes.rows[0]?.count ?? 0,
      latestEventAt: recentRes.rows[0]?.latest?.toISOString?.() ?? null,
    };
  } catch (err) {
    checks.recentEvents = { status: 'error', count24h: 0, latestEventAt: null };
    dbLogger.error({ err }, 'Audit health: recent events check failed');
  }

  // 4. Partition coverage
  try {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
    const nextDate = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const nextYear = nextDate.getUTCFullYear();
    const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');

    const currentPartition = `audit_log_${currentYear}_${currentMonth}`;
    const nextPartition = `audit_log_${nextYear}_${nextMonth}`;

    const partRes = await pool.query(
      `SELECT tablename FROM pg_catalog.pg_tables
       WHERE schemaname = 'audit' AND tablename IN ($1, $2)`,
      [currentPartition, nextPartition]
    );
    const existing = partRes.rows.map((r: any) => r.tablename);

    checks.partitions = {
      status: existing.length >= 2 ? 'ok' : 'degraded',
      currentMonth: existing.includes(currentPartition),
      nextMonth: existing.includes(nextPartition),
    };
  } catch (err) {
    checks.partitions = { status: 'error', currentMonth: false, nextMonth: false };
    dbLogger.error({ err }, 'Audit health: partition check failed');
  }

  // Determine overall status
  const hasErrors = Object.values(checks).some((c) => c.status === 'error');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');

  return {
    status: hasErrors ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
    checks,
    timestamp: new Date().toISOString(),
  };
}
