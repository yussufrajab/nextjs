/**
 * File integrity hashing
 *
 * Provides SHA-256 computation + storage/verification for employee documents.
 * Each document is tracked in the `DocumentHash` table:
 *   - On upload:    store `sha256(buffer)` and `byteSize`
 *   - On access:    recompute and compare; mismatch → audit event + reject
 *   - On delete:    clear the hash row
 *
 * This catches:
 *   - MinIO admin tampering (the data URL or stored file is modified)
 *   - In-flight man-in-the-middle attacks (the stored bytes don't match the upload)
 *   - Database drift (an URL is updated without re-hashing)
 */

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity } from './audit-logger';
import { authLogger } from './logger';

export interface IntegrityCheckResult {
  ok: boolean;
  expected: string | null;
  actual: string;
  reason?: 'no_hash_recorded' | 'hash_mismatch' | 'byte_size_mismatch';
}

/**
 * Compute SHA-256 hex of a buffer.
 */
export function sha256Hex(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Record the integrity hash for a document field.
 * Call this AFTER successfully persisting the data URL / file.
 *
 * @param employeeId - Owner of the document
 * @param fieldName  - Identifier for the field (e.g. "ardhilHaliUrl" or "certificate:abc-123")
 * @param data       - The data that was stored (will be hashed)
 * @param uploadedBy - UserId of the uploader (optional, for audit attribution)
 */
export async function recordDocumentHash(
  employeeId: string,
  fieldName: string,
  data: Buffer | string,
  uploadedBy?: string | null
): Promise<{ sha256: string; byteSize: number }> {
  const sha256 = sha256Hex(data);
  const byteSize = Buffer.byteLength(data);

  await db.documentHash.upsert({
    where: { employeeId_fieldName: { employeeId, fieldName } },
    update: {
      sha256,
      byteSize,
      lastVerified: new Date(),
      uploadedBy: uploadedBy ?? null,
    },
    create: {
      employeeId,
      fieldName,
      sha256,
      byteSize,
      uploadedBy: uploadedBy ?? null,
    },
  });

  return { sha256, byteSize };
}

/**
 * Verify a stored document against its recorded hash.
 * Use this on download/preview paths to detect tampering.
 *
 * @param employeeId - Owner of the document
 * @param fieldName  - Identifier for the field
 * @param data       - The data being read (URL contents / file buffer)
 * @returns ok=true when the hash matches (or no hash was recorded — fail-open)
 *          ok=false when the hash mismatches
 */
export async function verifyDocumentHash(
  employeeId: string,
  fieldName: string,
  data: Buffer | string
): Promise<IntegrityCheckResult> {
  const expected = await db.documentHash.findUnique({
    where: { employeeId_fieldName: { employeeId, fieldName } },
  });

  if (!expected) {
    // No hash recorded — fail-open (don't block legacy data)
    return {
      ok: true,
      expected: null,
      actual: sha256Hex(data),
      reason: 'no_hash_recorded',
    };
  }

  const actual = sha256Hex(data);

  if (actual !== expected.sha256) {
    authLogger.fatal(
      { employeeId, fieldName, expected: expected.sha256, actual },
      'CRITICAL: Document integrity hash MISMATCH — possible tampering'
    );
    await logAuditEvent({
      eventType: AuditEventType.POTENTIAL_BREACH,
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      attemptedRoute: `/integrity/${fieldName}`,
      requestMethod: 'GET',
      isAuthenticated: true,
      wasBlocked: true,
      blockReason: 'INTEGRITY_MISMATCH',
      additionalData: {
        employeeId,
        fieldName,
        expectedHash: expected.sha256,
        actualHash: actual,
      },
    }).catch(() => {});

    return {
      ok: false,
      expected: expected.sha256,
      actual,
      reason: 'hash_mismatch',
    };
  }

  // Update last-verified timestamp
  await db.documentHash.update({
    where: { id: expected.id },
    data: { lastVerified: new Date() },
  }).catch(() => {});

  return { ok: true, expected: expected.sha256, actual };
}

/**
 * Clear the integrity hash for a document (e.g. on document deletion).
 * Removing the row does NOT erase the audit trail of when the hash was last
 * seen — use a separate audit event for the deletion itself.
 */
export async function clearDocumentHash(
  employeeId: string,
  fieldName: string
): Promise<void> {
  await db.documentHash
    .delete({
      where: { employeeId_fieldName: { employeeId, fieldName } },
    })
    .catch(() => {
      // Not-found is fine; idempotent operation
    });
}

// ---------------------------------------------------------------------------
// objectKey-keyed integrity (generic MinIO uploads — /api/files/* routes)
// ---------------------------------------------------------------------------

/**
 * Record the integrity hash for a generic MinIO upload, keyed by objectKey.
 * Call this AFTER successfully uploading the file to MinIO.
 */
export async function recordFileHash(
  objectKey: string,
  data: Buffer | string,
  uploadedBy?: string | null
): Promise<{ sha256: string; byteSize: number }> {
  const sha256 = sha256Hex(data);
  const byteSize = Buffer.byteLength(data);

  await db.fileHash.upsert({
    where: { objectKey },
    update: { sha256, byteSize, lastVerified: new Date(), uploadedBy: uploadedBy ?? null },
    create: { objectKey, sha256, byteSize, uploadedBy: uploadedBy ?? null },
  });

  return { sha256, byteSize };
}

/**
 * Verify a generic MinIO file against its recorded hash. Use this on the
 * download/preview paths to detect tampering. Returns ok=true (fail-open)
 * when no hash was recorded for the objectKey; ok=false on mismatch.
 */
export async function verifyFileHash(
  objectKey: string,
  data: Buffer | string
): Promise<IntegrityCheckResult> {
  let expected;
  try {
    expected = await db.fileHash.findUnique({ where: { objectKey } });
  } catch (err) {
    // DB / table unavailable — fail-open so downloads are never broken by an
    // integrity-table outage. The mismatch path is the only blocking case.
    authLogger.error({ err, objectKey }, 'File integrity lookup failed; failing open');
    return {
      ok: true,
      expected: null,
      actual: sha256Hex(data),
      reason: 'no_hash_recorded',
    };
  }

  if (!expected) {
    return {
      ok: true,
      expected: null,
      actual: sha256Hex(data),
      reason: 'no_hash_recorded',
    };
  }

  const actual = sha256Hex(data);

  if (actual !== expected.sha256) {
    authLogger.fatal(
      { objectKey, expected: expected.sha256, actual },
      'CRITICAL: File integrity hash MISMATCH — possible tampering'
    );
    await logAuditEvent({
      eventType: AuditEventType.POTENTIAL_BREACH,
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      attemptedRoute: `/api/files/download/${objectKey}`,
      requestMethod: 'GET',
      isAuthenticated: true,
      wasBlocked: true,
      blockReason: 'INTEGRITY_MISMATCH',
      additionalData: {
        objectKey,
        expectedHash: expected.sha256,
        actualHash: actual,
      },
    }).catch(() => {});

    return { ok: false, expected: expected.sha256, actual, reason: 'hash_mismatch' };
  }

  await db.fileHash
    .update({ where: { id: expected.id }, data: { lastVerified: new Date() } })
    .catch(() => {});

  return { ok: true, expected: expected.sha256, actual };
}

/**
 * Clear the integrity hash for a generic MinIO file (e.g. on deletion).
 */
export async function clearFileHash(objectKey: string): Promise<void> {
  await db.fileHash.delete({ where: { objectKey } }).catch(() => {
    // Not-found is fine; idempotent operation
  });
}
