/**
 * Req 9.6 + 9.2 — Complainant confidentiality for the read paths.
 *
 * `complaint-confidentiality.ts` encodes the *need-to-know* rule
 * (`canSeeComplainantIdentity`) and a full-redaction transform. This module
 * adds the partial-masking transform used by the read endpoints
 * (`GET /api/complaints` list and `GET /api/complaints/[id]`): for a
 * non-owning viewer it masks `zanId` / phone numbers to their last 4 digits
 * (`***1234`), drops `employeeId`, and renders `employeeName` as initials —
 * preserving enough context for triage without disclosing identity. The
 * complainant, the specifically-assigned officer, and (for non-confidential
 * complaints) Admin/CSCS still see the full identity.
 *
 * The visibility decision reuses the audited `canSeeComplainantIdentity`
 * model (so the confidential-complaint whistleblower tightening is
 * preserved) and extends it with a user-id match for a specifically
 * assigned officer (`assignedOfficerId`, e.g. the officer who has taken
 * the case as `reviewedById`).
 */

import { canSeeComplainantIdentity } from '@/lib/complaint-confidentiality';

/** Mask a string to its last 4 characters: `0777123456` → `***3456`. */
export function maskTrailing(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '***';
  const s = String(value);
  if (s.length <= 4) return '***';
  return '***' + s.slice(-4);
}

/** Render a name as initials: `Ali Juma` → `A. J.`; empty → `***`. */
export function toInitials(name: string | null | undefined): string {
  if (!name) return '***';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '***';
  return parts.map((p) => p[0].toUpperCase()).join('. ') + '.';
}

export interface ComplaintPrivacyContext {
  viewerRole: string | null | undefined;
  viewerUserId: string | null | undefined;
  /**
   * User id of the specific officer assigned to / handling the complaint
   * (e.g. `complaint.reviewedById`). A viewer whose id matches sees the full
   * identity even if the role-based owning-officer rule would redact.
   */
  assignedOfficerId?: string | null | undefined;
}

/**
 * Decide whether the viewer may see the complainant's FULL identity PII.
 * Reuses `canSeeComplainantIdentity` (complainant self / role-based owning
 * officer / Admin-CSCS for non-confidential) and adds a user-id match for a
 * specifically assigned officer.
 */
export function viewerSeesFullComplainantIdentity(
  complaint: {
    complainantId: string;
    assignedOfficerRole?: string | null;
    confidential?: boolean | null;
  },
  ctx: ComplaintPrivacyContext
): boolean {
  // Specifically-assigned officer (user-id match) — e.g. the officer who
  // took/reviewed the case — sees the full identity.
  if (
    ctx.viewerUserId &&
    ctx.assignedOfficerId &&
    ctx.viewerUserId === ctx.assignedOfficerId
  ) {
    return true;
  }
  // Existing need-to-know model (incl. confidential-complaint tightening).
  return canSeeComplainantIdentity(ctx.viewerRole, ctx.viewerUserId, {
    complainantId: complaint.complainantId,
    assignedOfficerRole: complaint.assignedOfficerRole,
    confidential: !!complaint.confidential,
  });
}

/**
 * Redact complainant identity PII on a flat API response row.
 *
 * For a viewer with need-to-know the row is returned unchanged (with a
 * `complainantIdentityRedacted: false` marker). Otherwise `zanId` /
 * `complainantPhoneNumber` / `nextOfKinPhoneNumber` are masked to their
 * last 4 digits, `employeeId` is dropped, `employeeName` is rendered as
 * initials, and `complainantIdentityRedacted: true` is set.
 *
 * `complainantId` is consumed for the decision and STRIPPED from the
 * output so the complainant's user id is never leaked by the read paths.
 */
export function redactComplainantPii<T extends Record<string, any>>(
  complaint: T & {
    complainantId: string;
    assignedOfficerRole?: string | null;
    confidential?: boolean | null;
  },
  ctx: ComplaintPrivacyContext
): T & { complainantIdentityRedacted: boolean } {
  // Strip complainantId from the output (it is decision-only).
  const { complainantId, ...rest } = complaint;
  void complainantId;

  if (viewerSeesFullComplainantIdentity(complaint, ctx)) {
    return { ...rest, complainantIdentityRedacted: false } as T & {
      complainantIdentityRedacted: boolean;
    };
  }

  return {
    ...rest,
    employeeId: null,
    employeeName: toInitials(complaint.employeeName),
    zanId: maskTrailing(complaint.zanId),
    complainantPhoneNumber: maskTrailing(complaint.complainantPhoneNumber),
    nextOfKinPhoneNumber: maskTrailing(complaint.nextOfKinPhoneNumber),
    complainantIdentityRedacted: true,
  } as T & { complainantIdentityRedacted: boolean };
}