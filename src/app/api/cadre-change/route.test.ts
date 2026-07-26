import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

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
    cadreChangeRequest: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
      update: (...a: any[]) => mockUpdate(...a),
    },
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
    mockFindUnique.mockReset();
    // Session row with no IP/UA binding so the hijack check is skipped.
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HRO_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    mockUserFindUnique.mockResolvedValue(HRO_USER);
    // Self-approval check fetches the existing request's submitter. Default
    // to a different user so the actor is never the submitter.
    mockFindUnique.mockResolvedValue({ submittedById: 'someone-else' });
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

describe('PATCH /api/cadre-change — Commission workflow (parity with promotion)', () => {
  const HHRMD_USER = {
    id: 'hhrmd-1',
    active: true,
    role: 'HHRMD',
    institutionId: 'inst-1',
    username: 'hhrmd-user',
  };

  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockUpdate.mockReset();
    mockFindUnique.mockReset();
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HHRMD_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    mockUserFindUnique.mockResolvedValue(HHRMD_USER);
    // Self-approval check fetches the existing request's submitter. The
    // submitter is the HRO (hro-1), distinct from the HHRMD actor, so the
    // commission decision is not treated as self-approval.
    mockFindUnique.mockResolvedValue({ submittedById: 'hro-1' });
    mockUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      newCadre: 'New Cadre',
      status: 'Request Received – Awaiting Commission Decision',
      reviewStage: 'commission_review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', cadre: 'Old' },
      User_CadreChangeRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_CadreChangeRequest_reviewedByIdToUser: null,
      User_CadreChangeRequest_hrrpReviewedByToUser: null,
    });
  });

  it('persists reviewStage="commission_review" when HHRMD forwards to the Commission', async () => {
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HHRMD',
        userId: HHRMD_USER.id,
        status: 'Request Received – Awaiting Commission Decision',
        reviewStage: 'commission_review',
        decisionDate: new Date().toISOString(),
        reviewedById: HHRMD_USER.id,
        newCadre: 'New Cadre',
        reason: 'reason',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('Request Received – Awaiting Commission Decision');
    expect(updateArgs.data.reviewStage).toBe('commission_review');
  });

  it('completes the workflow and updates the employee cadre on Commission approval', async () => {
    const mockEmployeeUpdate = vi.fn();
    // Re-mock db.employee.update for this test only.
    const { db } = await import('@/lib/db');
    const originalUpdate = (db as any).employee?.update;
    (db as any).employee = { update: mockEmployeeUpdate };

    mockUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      newCadre: 'Senior Officer',
      status: 'Approved by Commission',
      reviewStage: 'completed',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', cadre: 'Old' },
      User_CadreChangeRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_CadreChangeRequest_reviewedByIdToUser: null,
      User_CadreChangeRequest_hrrpReviewedByToUser: null,
    });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HHRMD',
        userId: HHRMD_USER.id,
        status: 'Approved by Commission',
        reviewStage: 'completed',
        commissionDecisionDate: new Date().toISOString(),
        reviewedById: HHRMD_USER.id,
        commissionLetterKey: 'cadre-change/commission-letters/letter.pdf',
        commissionDecisionReason: 'Meets all requirements',
        newCadre: 'Senior Officer',
      }),
    );
    expect(res.status).toBe(200);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.reviewStage).toBe('completed');

    // Commission approval must update the employee cadre.
    expect(mockEmployeeUpdate).toHaveBeenCalledTimes(1);
    const employeeArgs = mockEmployeeUpdate.mock.calls[0][0];
    expect(employeeArgs.where.id).toBe('emp-1');
    expect(employeeArgs.data.cadre).toBe('Senior Officer');

    // Restore for other tests
    if (originalUpdate) (db as any).employee.update = originalUpdate;
  });
});