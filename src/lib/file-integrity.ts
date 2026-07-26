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
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity, safeAuditLog } from './audit-logger';
import { authLogger } from './logger';

export interface IntegrityCheckResult {
  ok: boolean;
  expected: string | null;
  actual: string;
  reason?: 'no_hash_recorded' | 'hash_mismatch' | 'byte_size_mismatch' | 'lookup_failed';
}

/**
 * Options for the verify helpers.
 *
 * `failClosed` controls what happens when no integrity hash has been recorded
 * for the object (legacy data) or the integrity-table lookup itself errors.
 * Historically both paths returned `ok=true` (fail-open), which means a
 * tampered or never-hashed file is served as if it were clean. For *sensitive*
 * object keys (employee documents/photos — government PII) we instead fail
 * closed: the read is blocked AND a CRITICAL `POTENTIAL_BREACH` audit event is
 * emitted so the unsigned/tampered object is flagged for SOC review rather
 * than silently served.
 */
export interface VerifyOptions {
  failClosed?: boolean;
}

/**
 * Whether `objectKey` points at sensitive government PII that must fail closed
 * when its integrity hash is missing or unreadable. Employee documents and
 * photos are PII; system `templates/` are public assets and stay fail-open.
 * Generic uploads (complaint attachments etc.) keep fail-open so a missing
 * hash never breaks legitimate legacy access — those are flagged only when a
 * hash *exists* and mismatches.
 */
export function isSensitiveObjectKey(objectKey: string): boolean {
  return (
    objectKey.startsWith('employee-documents/') ||
    objectKey.startsWith('employee-photos/')
  );
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
 * @param opts       - `failClosed` (default true): block + flag when no hash
 *                     is recorded. Employee documents are PII, so the default
 *                     is fail-closed. Pass `false` to keep legacy fail-open.
 * @returns ok=true when the hash matches. ok=false when the hash mismatches,
 *          or (fail-closed) when no hash is recorded.
 */
export async function verifyDocumentHash(
  employeeId: string,
  fieldName: string,
  data: Buffer | string,
  opts: VerifyOptions = {}
): Promise<IntegrityCheckResult> {
  const failClosed = opts.failClosed ?? true;

  const expected = await db.documentHash.findUnique({
    where: { employeeId_fieldName: { employeeId, fieldName } },
  });

  if (!expected) {
    // No hash recorded. Employee documents are sensitive PII — fail closed
    // (block + flag) by default so an unsigned/tampered document cannot be
    // served as if clean. Callers that explicitly accept legacy data may
    // pass failClosed:false to preserve the old fail-open behavior.
    const actual = sha256Hex(data);
    if (failClosed) {
      authLogger.warn(
        { employeeId, fieldName },
        'Document integrity hash missing — failing closed (sensitive PII)'
      );
      await safeAuditLog(
        logAuditEvent({
          eventType: AuditEventType.POTENTIAL_BREACH,
          eventCategory: AuditEventCategory.SECURITY,
          severity: AuditSeverity.CRITICAL,
          attemptedRoute: `/integrity/${fieldName}`,
          requestMethod: 'GET',
          isAuthenticated: true,
          wasBlocked: true,
          blockReason: 'NO_HASH_RECORDED',
          additionalData: { employeeId, fieldName, actualHash: actual },
        }),
        'verifyDocumentHash:no-hash'
      );
      return { ok: false, expected: null, actual, reason: 'no_hash_recorded' };
    }
    return { ok: true, expected: null, actual, reason: 'no_hash_recorded' };
  }

  const actual = sha256Hex(data);

  if (actual !== expected.sha256) {
    authLogger.fatal(
      { employeeId, fieldName, expected: expected.sha256, actual },
      'CRITICAL: Document integrity hash MISMATCH — possible tampering'
    );
    await safeAuditLog(
      logAuditEvent({
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
      }),
      'verifyDocumentHash:mismatch'
    );

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
 * download/preview paths to detect tampering.
 *
 * `opts.failClosed` defaults to `isSensitiveObjectKey(objectKey)` (employee
 * documents/photos — government PII). When fail-closed, a *missing* hash or a
 * DB-lookup error blocks the read and emits a CRITICAL `POTENTIAL_BREACH`
 * audit event so the unsigned/tampered object is flagged rather than served
 * as clean. Non-sensitive keys (templates, generic uploads) keep fail-open so
 * an integrity-table outage or legacy data never breaks legitimate access;
 * those are still blocked on a real hash *mismatch*.
 */
export async function verifyFileHash(
  objectKey: string,
  data: Buffer | string,
  opts: VerifyOptions = {}
): Promise<IntegrityCheckResult> {
  const failClosed = opts.failClosed ?? isSensitiveObjectKey(objectKey);
  const actual = sha256Hex(data);

  const flagBlocked = async (blockReason: string, reason: IntegrityCheckResult['reason']) => {
    authLogger.fatal(
      { objectKey, blockReason },
      `CRITICAL: File integrity ${blockReason} — blocking sensitive read (fail-closed)`
    );
    await safeAuditLog(
      logAuditEvent({
        eventType: AuditEventType.POTENTIAL_BREACH,
        eventCategory: AuditEventCategory.SECURITY,
        severity: AuditSeverity.CRITICAL,
        attemptedRoute: `/api/files/download/${objectKey}`,
        requestMethod: 'GET',
        isAuthenticated: true,
        wasBlocked: true,
        blockReason,
        additionalData: { objectKey, actualHash: actual },
      }),
      'verifyFileHash:flagBlocked'
    );
    return { ok: false, expected: null, actual, reason } satisfies IntegrityCheckResult;
  };

  let expected;
  try {
    expected = await db.fileHash.findUnique({ where: { objectKey } });
  } catch (err) {
    // DB / integrity-table unavailable. For sensitive keys this is itself a
    // tampering/availability signal — fail closed + flag. For non-sensitive
    // keys keep fail-open so a table outage never breaks legitimate access.
    authLogger.error({ err, objectKey }, 'File integrity lookup failed');
    if (failClosed) {
      return flagBlocked('INTEGRITY_LOOKUP_FAILED', 'lookup_failed');
    }
    return { ok: true, expected: null, actual, reason: 'no_hash_recorded' };
  }

  if (!expected) {
    if (failClosed) {
      return flagBlocked('NO_HASH_RECORDED', 'no_hash_recorded');
    }
    return { ok: true, expected: null, actual, reason: 'no_hash_recorded' };
  }

  if (actual !== expected.sha256) {
    authLogger.fatal(
      { objectKey, expected: expected.sha256, actual },
      'CRITICAL: File integrity hash MISMATCH — possible tampering'
    );
    await safeAuditLog(
      logAuditEvent({
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
      }),
      'verifyFileHash:mismatch'
    );

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
