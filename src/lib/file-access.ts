/**
 * Per-object authorization for MinIO file serving (Req 10.1–10.2, 17.3,
 * 27.1, 30.1).
 *
 * Problem: the generic `/api/files/download`, `/preview`, and `/exists`
 * routes accept an arbitrary caller-supplied `objectKey` and, before this
 * guard, served any key to any authenticated user — an IDOR that let an
 * EMPLOYEE or an HRO of institution A read institution B's employee
 * documents by guessing/enumerating a key. The dedicated
 * `employee-documents` / `employee-photos` routes already enforce
 * institution/ownership, but the generic catch-all routes bypassed them.
 *
 * This helper resolves the owner of an object key and applies the SAME
 * role matrix the dedicated routes use, so the generic routes can no longer
 * be used as an end-run:
 *
 *   - Unrestricted roles (ADMIN, HRMO, HHRMD, CSCS, DO, PO): allow. These
 *     are central/commission + complaint-handling officer roles that
 *     review cross-institution (e.g. complaint attachments).
 *   - HRO / HRRP: institution-scoped — the object's owning institution must
 *     equal the caller's institution.
 *   - EMPLOYEE: self-only — the object must be the caller's own record or
 *     a file they themselves uploaded.
 *   - Unknown role: deny.
 *
 * Owner resolution by key shape:
 *   - `employee-documents/<employeeId>_...` and
 *     `employee-photos/<employeeId>.<ext>` → owner = that Employee
 *     (institutionId from the Employee row).
 *   - `templates/...` → system template, any authenticated user may read.
 *   - anything else → a generic upload; owner = the `FileHash.uploadedBy`
 *     user (every `/api/files/upload` records a FileHash row). For at-risk
 *     roles (HRO/HRRP/EMPLOYEE) an unresolvable owner is DENIED (fail-closed)
 *     — the security-critical flip from the old allow-all behavior.
 *
 * This helper only authorizes; it does not fetch the object. Callers MUST
 * invoke it before touching MinIO so an unauthorized request never reveals
 * whether the object exists (no existence oracle).
 */

import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { logUnauthorizedAccess, getClientIp, safeAuditLog } from '@/lib/audit-logger';

/** Roles with unrestricted file access (central/commission + officers). */
const UNRESTRICTED_ROLES = new Set(['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO']);

export interface FileAccessResult {
  allowed: boolean;
  reason:
    | 'unrestricted_role'
    | 'template'
    | 'institution_match'
    | 'owner_self'
    | 'denied_no_owner'
    | 'denied_institution_mismatch'
    | 'denied_not_owner'
    | 'denied_unknown_role';
  /** Resolved owner context — attach to the IDOR audit event for SOC triage. */
  ownerEmployeeId?: string;
  ownerInstitutionId?: string | null;
  uploadedBy?: string | null;
}

/**
 * Authorize `auth` to read the MinIO object at `objectKey`. Never throws —
 * a lookup failure is treated as "no owner" and denied for at-risk roles.
 */
export async function checkFileAccess(
  auth: AuthContext,
  objectKey: string
): Promise<FileAccessResult> {
  const roleUpper = auth.role.toUpperCase();

  // 1. Unrestricted roles — central/commission + complaint officers.
  if (UNRESTRICTED_ROLES.has(roleUpper)) {
    return { allowed: true, reason: 'unrestricted_role' };
  }

  // 2. System templates — readable by any authenticated user.
  if (objectKey === 'templates/' || objectKey.startsWith('templates/')) {
    return { allowed: true, reason: 'template' };
  }

  // 3. Employee-owned object keys — institution / ownership scoping.
  const employeeOwner = parseEmployeeIdFromKey(objectKey);
  if (employeeOwner !== null) {
    return resolveEmployeeAccess(auth, roleUpper, employeeOwner);
  }

  // 4. Complaint attachment or generic upload — owner is the uploader
  // recorded in FileHash. Complaint attachments are special-cased FIRST
  // because an officer (unrestricted role, already returned above) uploads
  // resolution/decision letters that the complainant (EMPLOYEE) must be
  // able to read — the complainant is not the uploader, so the uploader
  // check below would wrongly deny them. The complaint relationship is
  // the correct grant.
  const complaintAccess = await resolveComplaintAttachmentAccess(auth, objectKey);
  if (complaintAccess !== null) {
    return complaintAccess;
  }
  return resolveGenericUploadAccess(auth, roleUpper, objectKey);
}

/**
 * If `objectKey` is an attachment on a Complaint, authorize via the
 * complaint relationship: the complainant may read every attachment on
 * their own complaint (including officer-uploaded letters). Returns null
 * when the key is not a complaint attachment (fall through to the generic
 * uploader-owner check). Unrestricted officer roles are already allowed
 * before this is reached.
 */
async function resolveComplaintAttachmentAccess(
  auth: AuthContext,
  objectKey: string
): Promise<FileAccessResult | null> {
  const complaint = await db.complaint
    .findFirst({
      where: { attachments: { has: objectKey } },
      select: { complainantId: true },
    })
    .catch(() => null);

  if (!complaint) {
    return null;
  }

  if (complaint.complainantId === auth.userId) {
    return { allowed: true, reason: 'owner_self' };
  }
  return { allowed: false, reason: 'denied_not_owner' };
}

/**
 * Extract the owning employeeId from `employee-documents/<id>_...` and
 * `employee-photos/<id>.<ext>` keys. Returns null for any other shape.
 */
function parseEmployeeIdFromKey(objectKey: string): string | null {
  if (objectKey.startsWith('employee-documents/')) {
    const filename = objectKey.slice('employee-documents/'.length);
    if (!filename) return null;
    const id = filename.substring(0, filename.indexOf('_'));
    return id || null;
  }
  if (objectKey.startsWith('employee-photos/')) {
    const filename = objectKey.slice('employee-photos/'.length);
    if (!filename) return null;
    const id = filename.substring(0, filename.lastIndexOf('.'));
    return id || null;
  }
  return null;
}

async function resolveEmployeeAccess(
  auth: AuthContext,
  roleUpper: string,
  employeeId: string
): Promise<FileAccessResult> {
  if (roleUpper === 'HRO' || roleUpper === 'HRRP') {
    const employee = await db.employee
      .findUnique({ where: { id: employeeId }, select: { institutionId: true } })
      .catch(() => null);
    if (!employee || !employee.institutionId) {
      return { allowed: false, reason: 'denied_no_owner', ownerEmployeeId: employeeId };
    }
    if (employee.institutionId !== auth.institutionId) {
      return {
        allowed: false,
        reason: 'denied_institution_mismatch',
        ownerEmployeeId: employeeId,
        ownerInstitutionId: employee.institutionId,
      };
    }
    return {
      allowed: true,
      reason: 'institution_match',
      ownerEmployeeId: employeeId,
      ownerInstitutionId: employee.institutionId,
    };
  }

  if (roleUpper === 'EMPLOYEE') {
    const user = await db.user
      .findUnique({ where: { id: auth.userId }, select: { employeeId: true } })
      .catch(() => null);
    if (!user?.employeeId || user.employeeId !== employeeId) {
      return { allowed: false, reason: 'denied_not_owner', ownerEmployeeId: employeeId };
    }
    return { allowed: true, reason: 'owner_self', ownerEmployeeId: employeeId };
  }

  return { allowed: false, reason: 'denied_unknown_role' };
}

async function resolveGenericUploadAccess(
  auth: AuthContext,
  roleUpper: string,
  objectKey: string
): Promise<FileAccessResult> {
  // For at-risk roles, require a resolvable owner; an unknown owner is
  // denied (fail-closed) so the generic routes can't be used to probe
  // arbitrary legacy keys.
  if (roleUpper === 'HRO' || roleUpper === 'HRRP') {
    const hash = await db.fileHash
      .findUnique({ where: { objectKey }, select: { uploadedBy: true } })
      .catch(() => null);
    if (!hash?.uploadedBy) {
      return { allowed: false, reason: 'denied_no_owner' };
    }
    const uploader = await db.user
      .findUnique({ where: { id: hash.uploadedBy }, select: { institutionId: true } })
      .catch(() => null);
    if (!uploader?.institutionId || uploader.institutionId !== auth.institutionId) {
      return {
        allowed: false,
        reason: 'denied_institution_mismatch',
        uploadedBy: hash.uploadedBy,
        ownerInstitutionId: uploader?.institutionId ?? null,
      };
    }
    return {
      allowed: true,
      reason: 'institution_match',
      uploadedBy: hash.uploadedBy,
      ownerInstitutionId: uploader.institutionId,
    };
  }

  if (roleUpper === 'EMPLOYEE') {
    const hash = await db.fileHash
      .findUnique({ where: { objectKey }, select: { uploadedBy: true } })
      .catch(() => null);
    if (!hash?.uploadedBy || hash.uploadedBy !== auth.userId) {
      return { allowed: false, reason: 'denied_not_owner', uploadedBy: hash?.uploadedBy ?? null };
    }
    return { allowed: true, reason: 'owner_self', uploadedBy: hash.uploadedBy };
  }

  return { allowed: false, reason: 'denied_unknown_role' };
}

// ---------------------------------------------------------------------------
// Route convenience: authorize-or-deny with IDOR audit logging
// ---------------------------------------------------------------------------

/**
 * Authorize `auth` to read `objectKey`. On denial, logs a forensic IDOR
 * audit event (attempted key + resolved owner context) and returns a 403
 * the route can hand back directly. On allow, returns `{ allowed: true }`
 * and the route proceeds. MUST be called before any MinIO access so a denied
 * request never learns whether the object exists.
 */
export async function authorizeFileOrDeny(
  request: NextRequest,
  auth: AuthContext,
  objectKey: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const result = await checkFileAccess(auth, objectKey);
  if (result.allowed) {
    return { allowed: true };
  }

  const isOwnership =
    result.reason === 'denied_not_owner' || result.reason === 'denied_institution_mismatch';
  await safeAuditLog(
    logUnauthorizedAccess({
      userId: auth.userId,
      username: auth.username,
      userRole: auth.role,
      attemptedRoute: `/api/files/${objectKey}`,
      blockReason: isOwnership
        ? `File IDOR: ${result.reason}`
        : `File access denied: ${result.reason}`,
      isAuthenticated: true,
      requestMethod: 'GET',
      ipAddress: getClientIp(request.headers),
      additionalData: {
        idor: isOwnership,
        objectKey,
        reason: result.reason,
        ownerEmployeeId: result.ownerEmployeeId,
        ownerInstitutionId: result.ownerInstitutionId,
        uploadedBy: result.uploadedBy,
      },
    }),
    'file-access-IDOR'
  );

  return {
    allowed: false,
    response: NextResponse.json(
      { success: false, message: 'Access denied' },
      { status: 403 }
    ),
  };
}