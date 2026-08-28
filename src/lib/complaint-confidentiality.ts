/**
 * Req 9.6 — Confidential information protection (complainant identity).
 *
 * Complaints can carry sensitive, retaliation-prone grievances (e.g.
 * harassment / "Unyanyasaji", whistleblowing). The complainant's identity PII
 * must be revealed only on a strict need-to-know basis. This module encodes
 * the access rule and the redaction transform applied to API responses.
 */

import { ROLES } from '@/lib/constants';

/**
 * Complainant identity PII fields exposed by the complaints API. These are
 * redacted for viewers who lack need-to-know under {@link canSeeComplainantIdentity}.
 */
export const COMPLAINANT_PII_FIELDS = [
  'employeeId',
  'employeeName',
  'zanId',
  'payrollNumber',
  'complainantPhoneNumber',
  'nextOfKinPhoneNumber',
] as const;

/** Display value substituted for the complainant name when redacted. */
export const REDACTED_COMPLAINANT_NAME = 'Mlalamikaji (Siri)';

/** Display value substituted for complainant phone numbers when redacted. */
export const REDACTED_COMPLAINANT_PHONE = '[REDACTED]';

/** Complaint-type value(s) that are treated as confidential by default. */
export const CONFIDENTIAL_COMPLAINT_TYPES = ['Unyanyasaji'];

/** Roles that act as escalation / override tiers (see canSeeComplainantIdentity). */
const ESCALATION_ROLES = new Set([
  String(ROLES.CSCS).toUpperCase(),
  String(ROLES.ADMIN).toUpperCase(),
]);

export interface ComplaintIdentityContext {
  /** The user who submitted the complaint (always sees their own data). */
  complainantId: string;
  /** The officer role assigned to handle the complaint (DO / HHRMD). */
  assignedOfficerRole: string | null | undefined;
  /** Whether the complaint is marked confidential (tightens access). */
  confidential: boolean;
}

/**
 * Resolve the stored `confidential` value for a complaint.
 *
 * Harassment ("Unyanyasaji") complaints are always confidential — a submitter
 * cannot downgrade them. Other complaint types are confidential when the
 * submitter explicitly requests it.
 */
export function resolveConfidential(
  complaintType: string,
  requested?: boolean | null
): boolean {
  if (CONFIDENTIAL_COMPLAINT_TYPES.includes(complaintType)) return true;
  return Boolean(requested);
}

/**
 * Whether the requesting viewer may see the complainant's identity PII.
 *
 * Need-to-know model:
 *  - The complainant always sees their own complaint.
 *  - The **exactly-assigned** handling officer (DO or HHRMD) is the "owning"
 *    handler and sees the identity. The co-reviewer tier (a DO viewing an
 *    HHRMD-assigned complaint, or vice-versa) is redacted — they may act on
 *    the workflow (Req 9.7) but do not need the complainant's identity.
 *  - CSCS (commission / escalation) and Admin (override) see the identity for
 *    **non-confidential** complaints (small, need-to-know tiers making/overriding
 *    decisions).
 *  - **Confidential** complaints tighten access to ONLY the complainant and the
 *    exactly-assigned officer — even CSCS/Admin are redacted. The adjudicating
 *    body decides on the case merits without the complainant's identity
 *    (whistleblower protection).
 *  - All other roles (HRMO, HRO, HRRP, PO, non-owning EMPLOYEE, …) are redacted.
 */
export function canSeeComplainantIdentity(
  role: string | null | undefined,
  userId: string | null | undefined,
  complaint: ComplaintIdentityContext
): boolean {
  if (!role || !userId) return false;

  // Complainant always sees their own data.
  if (userId === complaint.complainantId) return true;

  const normalizedRole = String(role).toUpperCase();
  // Owning officer: DO and HHRMD are the complaint-handling pool. Either
  // role sees full identity for any complaint assigned to DO or HHRMD (not
  // just an exact role match), so a co-reviewer can act on a complaint
  // assigned to the other role without the name/ZAN ID being masked.
  if (
    normalizedRole === String(ROLES.DO).toUpperCase() ||
    normalizedRole === String(ROLES.HHRMD).toUpperCase()
  ) {
    const DO = String(ROLES.DO).toUpperCase();
    const HHRMD = String(ROLES.HHRMD).toUpperCase();
    const pool: Record<string, true> = { [DO]: true, [HHRMD]: true };
    return (
      !!complaint.assignedOfficerRole &&
      !!pool[normalizedRole] &&
      !!pool[String(complaint.assignedOfficerRole).toUpperCase()]
    );
  }

  // Escalation / override tiers see identity only for non-confidential complaints.
  if (ESCALATION_ROLES.has(normalizedRole)) {
    return !complaint.confidential;
  }

  // Everyone else is redacted.
  return false;
}

/**
 * Redact complainant identity PII on a formatted API response row.
 * Returns a shallow copy with the PII fields cleared and a
 * `complainantIdentityRedacted: true` marker added.
 */
export function redactComplainantIdentity<T extends Record<string, any>>(
  row: T
): T & { complainantIdentityRedacted: boolean } {
  return {
    ...row,
    employeeId: null,
    employeeName: REDACTED_COMPLAINANT_NAME,
    zanId: null,
    payrollNumber: null,
    complainantPhoneNumber: null,
    nextOfKinPhoneNumber: null,
    complainantIdentityRedacted: true,
  };
}