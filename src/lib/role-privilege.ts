/**
 * Role privilege ranking + privilege-escalation detection (Req 26.2).
 *
 * The users PUT endpoint (`src/app/api/users/[id]/route.ts`) lets an Admin
 * change another user's role. Every role change is already audit-logged with
 * the previous/new diff, but no detection/alerting rule fired on escalation
 * patterns. This module provides:
 *
 *  - `privilegeRank` / `isPrivilegeEscalation`: a static privilege ordering of
 *    the CSMS roles so a role change can be classified as an escalation
 *    (strict rank increase), a lateral move, or a demotion.
 *  - `isHighPrivilegeRole`: the high-privilege tiers (Admin / HHRMD / CSCS) —
 *    any change INTO one of these is a privilege-escalation signal worth a
 *    CRITICAL alert on its own.
 *  - `detectEscalationBurst`: counts recent privilege-escalation events in a
 *    time window from the audit trail so an unusual RUN of escalations pages
 *    the SOC even when no single change targets a high-privilege tier.
 *
 * The route combines these and emits a CRITICAL `POTENTIAL_BREACH` audit event
 * via `logAuditEvent`, which is already wired to the outbound
 * `dispatchSecurityAlert` pipeline (webhook/SIEM + email, Req 26.6).
 */

import { ROLES } from './constants';
import { queryAuditLogs } from './audit-db';

// ---------------------------------------------------------------------------
// Privilege ranking
// ---------------------------------------------------------------------------

/**
 * Static privilege ordering — higher = more privileged. Reflects the CSMS
 * authorization tiers:
 *   EMPLOYEE (data subject) < HRO (institutional data entry) <
 *   HRRP/PO < DO/HRMO (reviewers) < HHRMD (head) < CSCS (commission) <
 *   Admin (override).
 *
 * Used only for escalation *direction* (increase vs lateral vs demotion), not
 * for authorization decisions — those live in `api-auth` / role checks.
 */
export const PRIVILEGE_ROLE_RANK: Record<string, number> = {
  [String(ROLES.EMPLOYEE)]: 0,
  [String(ROLES.HRO)]: 1,
  [String(ROLES.HRRP)]: 2,
  [String(ROLES.PO)]: 2,
  [String(ROLES.DO)]: 3,
  [String(ROLES.HRMO)]: 3,
  [String(ROLES.HHRMD)]: 4,
  [String(ROLES.CSCS)]: 5,
  [String(ROLES.ADMIN)]: 6,
};

/**
 * The high-privilege tiers. A role change INTO any of these is a
 * privilege-escalation signal worth a CRITICAL alert on its own (Req 26.2),
 * because each grants system-wide or commission-level override power.
 */
export const HIGH_PRIVILEGE_ROLES = new Set<string>([
  String(ROLES.ADMIN).toUpperCase(),
  String(ROLES.HHRMD).toUpperCase(),
  String(ROLES.CSCS).toUpperCase(),
]);

function normalizeRole(role: string | null | undefined): string {
  return String(role ?? '').toUpperCase();
}

/** Numeric privilege rank; -1 for an empty/unknown role. */
export function privilegeRank(role: string | null | undefined): number {
  if (!role) return -1;
  const rank = PRIVILEGE_ROLE_RANK[String(role)];
  return typeof rank === 'number' ? rank : -1;
}

/** True if `role` is one of the high-privilege tiers (Admin/HHRMD/CSCS). */
export function isHighPrivilegeRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return HIGH_PRIVILEGE_ROLES.has(normalizeRole(role));
}

/**
 * A role change is a privilege escalation when the new role strictly outranks
 * the previous one. Lateral moves (same rank) and demotions are NOT
 * escalations. An unknown new role cannot be confirmed as an escalation.
 */
export function isPrivilegeEscalation(
  previousRole: string | null | undefined,
  newRole: string | null | undefined
): boolean {
  if (!newRole) return false;
  const next = privilegeRank(newRole);
  if (next < 0) return false; // unknown new role — cannot confirm escalation
  return next > privilegeRank(previousRole);
}

// ---------------------------------------------------------------------------
// Burst detection
// ---------------------------------------------------------------------------

export interface EscalationBurstResult {
  /** Escalations in the window, INCLUDING the in-flight one being evaluated. */
  count: number;
  threshold: number;
  windowSeconds: number;
  isBurst: boolean;
}

/** Look-back window (seconds) for an "unusual run" of escalations. Default 1h. */
export function escalationBurstWindowSeconds(): number {
  const raw = process.env.PRIVILEGE_ESCALATION_BURST_WINDOW_SECONDS;
  if (raw === undefined || raw.trim() === '') return 3600;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 3600;
}

/** Escalation count in the window at/above which a run is "unusual". Default 3. */
export function escalationBurstThreshold(): number {
  const raw = process.env.PRIVILEGE_ESCALATION_BURST_THRESHOLD;
  if (raw === undefined || raw.trim() === '') return 3;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/**
 * Count privilege-escalation role changes recorded in the audit trail within
 * the look-back window and decide whether the current in-flight escalation
 * (the role change the caller is about to persist / has just persisted) makes
 * the run "unusual".
 *
 * The current event is counted as +1 on top of the persisted prior events —
 * the audit row for the in-flight change may not be flushed yet, so we do not
 * rely on seeing it in the query. Returns `null` if the audit query fails (so
 * alerting never breaks the role-change request).
 *
 * @param opts.windowSeconds override the env-driven window (testing)
 * @param opts.threshold    override the env-driven threshold (testing)
 * @param opts.now          override "now" (testing; defaults to real time)
 */
export async function detectEscalationBurst(opts: {
  windowSeconds?: number;
  threshold?: number;
  now?: Date;
} = {}): Promise<EscalationBurstResult | null> {
  const windowSeconds = opts.windowSeconds ?? escalationBurstWindowSeconds();
  const threshold = opts.threshold ?? escalationBurstThreshold();
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - windowSeconds * 1000);

  try {
    const { logs } = await queryAuditLogs({
      eventType: 'USER_UPDATED',
      startDate: since,
      limit: 100,
    });
    const prior = logs.filter(
      (l) => l.additionalData?.privilegeEscalation === true
    ).length;
    const count = prior + 1; // include the in-flight escalation
    return {
      count,
      threshold,
      windowSeconds,
      isBurst: count >= threshold,
    };
  } catch {
    // Audit query must never break the role-change flow.
    return null;
  }
}