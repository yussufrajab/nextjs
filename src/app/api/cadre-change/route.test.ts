import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  SESSION_COOKIE_NAME_PROD: '__Host-session',
  SESSION_COOKIE_NAME_DEV: 'session',
  SESSION_COOKIE_NAME: 'session',
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 8 * 60 * 60 * 1000;
    const payload = `${token}.${expiry}`;
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(payload);
    return `${payload}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 3) return null;
      const [token, expiryStr, provided] = parts;
      const expiry = Number(expiryStr);
      if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(`${token}.${expiryStr}`);
      const expected = hmac.digest('base64');
      const a = Buffer.from(provided, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length !== b.length) return null;
      return timingSafeEqual(a, b) ? token : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    cadreChangeRequest: { update: (...a: any[]) => mockUpdate(...a) },
    notification: { create: vi.fn() },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logRequestSubmission: () => Promise.resolve(undefined),
  logRequestApproval: () => Promise.resolve(undefined),
  logRequestRejection: () => Promise.resolve(undefined),
  logRequestForward: () => Promise.resolve(undefined),
  logRequestWithdrawal: () => Promise.resolve(undefined),
}));

vi.mock('@/lib/email', () => ({
  sendRequestStatusUpdateEmail: () => Promise.resolve(undefined),
  sendRequestSubmissionEmails: () => Promise.resolve(undefined),
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: () => Promise.resolve(undefined),
  createNotificationForRole: () => Promise.resolve(undefined),
  NotificationTemplates: {
    cadreChangeHrrpApproved: () => ({ message: 'm', link: 'l' }),
    cadreChangeHrrpRejected: () => ({ message: 'm', link: 'l' }),
    cadreChangePendingHrrpReview: () => ({ message: 'm', link: 'l' }),
  },
}));

const HRO_USER = {
  id: 'hro-1',
  active: true,
  role: 'HRO',
  institutionId: 'inst-1',
  username: 'yhzubeir',
};

function authedRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:9002/api/cadre-change', {
    method: 'PATCH',
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/cadre-change — HRO resubmit', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockUpdate.mockReset();
    // Session row with no IP/UA binding so the hijack check is skipped.
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HRO_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    mockUserFindUnique.mockResolvedValue(HRO_USER);
    mockUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      newCadre: 'New Cadre',
      reason: 'reason',
      status: 'Pending HRRP Review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', cadre: 'Old' },
      User_CadreChangeRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'yhzubeir' },
      User_CadreChangeRequest_reviewedByIdToUser: null,
      User_CadreChangeRequest_hrrpReviewedByToUser: null,
    });
  });

  it('allows an HRO to resubmit a rejected request (status-only classification, even when reviewedById is sent)', async () => {
    // Reproduce the real frontend payload: handleUpdateRequest sets
    // reviewedById = user.id for every non-HRRP action, including resubmit.
    // Before the fix the server misclassified this as an initial-review
    // action (HHRMD/HRMO only) and returned 403 for an HRO.
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HRO',
        userId: HRO_USER.id,
        status: 'Pending HRRP Review',
        reviewStage: 'initial',
        newCadre: 'New Cadre',
        reason: 'reason',
        studiedOutsideCountry: false,
        documents: ['doc-key'],
        rejectionReason: null,
        reviewedById: HRO_USER.id, // client-supplied, as the frontend does
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);

    // The resubmitting HRO must NOT be recorded as the reviewer.
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.reviewedById).toBeUndefined();
  });

  it('still rejects an HRO attempting a commission decision', async () => {
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HRO',
        userId: HRO_USER.id,
        status: 'Approved by Commission',
        reviewStage: 'completed',
        reviewedById: HRO_USER.id,
        commissionLetterKey: 'letter-key',
      }),
    );
    expect(res.status).toBe(403);
  });
});