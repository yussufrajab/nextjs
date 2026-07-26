/**
 * Malware scanning for HRIMS-synced employee photos (Req 10.7).
 *
 * HRIMS is a trusted source, but a compromised HRIMS server or a
 * man-in-the-middle attack could deliver a malicious image embedded in the
 * employee photo field. `upsertEmployeeFromHRIMS` calls `scanEmployeePhoto`
 * before persisting the photo as a `data:` URL.
 *
 * Fail-closed policy: if ClamAV detects malware, is unreachable, or throws,
 * the photo is DROPPED (the caller stores `profileImageUrl = null`) and a
 * CRITICAL `POTENTIAL_BREACH` audit event is emitted so the event is flagged
 * for SOC review. The employee record is still synced without the photo.
 * When scanning is disabled (dev/CI), the photo is stored unchanged.
 */

import { scanFile, isClamAVEnabled } from '@/lib/clamav';
import {
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
} from '@/lib/audit-logger';
import { hrimsLogger } from '@/lib/logger';

export interface PhotoScanActor {
  userId: string;
  username: string;
  role: string;
  ipAddress: string | null;
}

/**
 * Scan an HRIMS employee photo for malware and return the data URL to
 * persist, or null to drop the photo (fail-closed on malware/scan-error).
 */
export async function scanEmployeePhoto(
  photo: { contentType: string; content: string } | undefined,
  zanId: string,
  institutionId: string,
  actor: PhotoScanActor
): Promise<string | null> {
  if (!photo?.content) return null;
  if (!isClamAVEnabled()) {
    return `data:${photo.contentType};base64,${photo.content}`;
  }

  const dropWithAudit = async (blockReason: string, reason: string) => {
    hrimsLogger.error(
      { zanId, contentType: photo.contentType, reason },
      `REJECTED HRIMS employee photo — ${blockReason} (photo dropped, employee sync continues)`
    );
    await logAuditEvent({
      eventType: AuditEventType.POTENTIAL_BREACH,
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      userId: actor.userId,
      username: actor.username,
      userRole: actor.role,
      ipAddress: actor.ipAddress,
      attemptedRoute: '/api/hrims/sync-employee',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: true,
      blockReason,
      additionalData: { zanId, institutionId, contentType: photo.contentType, reason },
    }).catch(() => {});
    return null;
  };

  try {
    const buffer = Buffer.from(photo.content, 'base64');
    const scanResult = await scanFile(buffer);
    if (!scanResult.isClean) {
      const reason = scanResult.virusName
        ? `malware: ${scanResult.virusName}`
        : `scan error: ${scanResult.error ?? 'unknown'}`;
      return dropWithAudit('HRIMS_PHOTO_MALWARE', reason);
    }
    return `data:${photo.contentType};base64,${photo.content}`;
  } catch (err) {
    // Fail-closed: an unexpected scan throw must not store unscanned content.
    return dropWithAudit(
      'HRIMS_PHOTO_SCAN_FAILED',
      `exception: ${(err as Error)?.message ?? 'unknown'}`
    );
  }
}