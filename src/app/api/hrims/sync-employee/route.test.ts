// @vitest-environment node
/**
 * Unit tests for HRIMS sync-employee photo malware scanning (Req 10.7).
 *
 * The route handler wiring is exercised in E2E; this file targets the
 * `scanEmployeePhoto` helper directly:
 *  - clean photo → data URL returned
 *  - malware detected → photo dropped (null) + CRITICAL POTENTIAL_BREACH audit
 *  - scan error (ClamAV unreachable) → fail-closed, photo dropped + audit
 *  - scanning disabled → photo stored unchanged (dev/CI escape hatch)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockScanFile = vi.fn();
const mockIsClamAVEnabled = vi.fn();
const mockLogAudit = vi.fn();

vi.mock('@/lib/clamav', () => ({
  scanFile: (...a: any[]) => mockScanFile(...a),
  isClamAVEnabled: () => mockIsClamAVEnabled(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logHrimsSync: vi.fn(),
  getClientIp: () => '127.0.0.1',
  logAuditEvent: (...a: any[]) => mockLogAudit(...a),
  AuditEventType: { POTENTIAL_BREACH: 'POTENTIAL_BREACH' },
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { CRITICAL: 'CRITICAL', INFO: 'INFO' },
}));

vi.mock('@/lib/logger', () => ({
  hrimsLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
}));

import { scanEmployeePhoto } from '@/lib/hrims-photo-scan';

const PHOTO = {
  contentType: 'image/jpeg',
  content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
};
const ACTOR = { userId: 'user-1', username: 'hro', role: 'HRO', ipAddress: '127.0.0.1' };

describe('scanEmployeePhoto (Req 10.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsClamAVEnabled.mockReturnValue(true);
    mockLogAudit.mockResolvedValue(undefined);
  });

  it('returns the data URL when the photo scans clean', async () => {
    mockScanFile.mockResolvedValueOnce({ isClean: true });
    const url = await scanEmployeePhoto(PHOTO, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBe(`data:image/jpeg;base64,${PHOTO.content}`);
    expect(mockScanFile).toHaveBeenCalledOnce();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('drops the photo (null) + CRITICAL audit when malware is detected', async () => {
    mockScanFile.mockResolvedValueOnce({ isClean: false, virusName: 'EICAR-Test' });
    const url = await scanEmployeePhoto(PHOTO, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBeNull();
    expect(mockLogAudit).toHaveBeenCalledOnce();
    const call = mockLogAudit.mock.calls[0][0];
    expect(call.severity).toBe('CRITICAL');
    expect(call.eventType).toBe('POTENTIAL_BREACH');
    expect(call.blockReason).toBe('HRIMS_PHOTO_MALWARE');
    expect(call.additionalData.zanId).toBe('ZAN1');
    expect(call.additionalData.reason).toContain('EICAR-Test');
  });

  it('fails closed (null) + CRITICAL audit when ClamAV is unreachable (scan error)', async () => {
    mockScanFile.mockResolvedValueOnce({ isClean: false, error: 'Connection refused' });
    const url = await scanEmployeePhoto(PHOTO, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBeNull();
    expect(mockLogAudit).toHaveBeenCalledOnce();
    expect(mockLogAudit.mock.calls[0][0].blockReason).toBe('HRIMS_PHOTO_MALWARE');
  });

  it('fails closed (null) + CRITICAL audit when scanFile throws', async () => {
    mockScanFile.mockRejectedValueOnce(new Error('unexpected'));
    const url = await scanEmployeePhoto(PHOTO, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBeNull();
    expect(mockLogAudit).toHaveBeenCalledOnce();
    expect(mockLogAudit.mock.calls[0][0].blockReason).toBe('HRIMS_PHOTO_SCAN_FAILED');
  });

  it('stores the photo unchanged when scanning is disabled (dev/CI)', async () => {
    mockIsClamAVEnabled.mockReturnValue(false);
    const url = await scanEmployeePhoto(PHOTO, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBe(`data:image/jpeg;base64,${PHOTO.content}`);
    expect(mockScanFile).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('returns null when there is no photo', async () => {
    const url = await scanEmployeePhoto(undefined, 'ZAN1', 'inst-1', ACTOR);
    expect(url).toBeNull();
    expect(mockScanFile).not.toHaveBeenCalled();
  });
});