import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockPromotionFindUnique = vi.fn();
const mockPromotionUpdate = vi.fn();
const mockEmployeeUpdate = vi.fn();

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
    promotionRequest: {
      findUnique: (...a: any[]) => mockPromotionFindUnique(...a),
      update: (...a: any[]) => mockPromotionUpdate(...a),
    },
    employee: { update: (...a: any[]) => mockEmployeeUpdate(...a) },
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
    promotionHrrpApproved: () => ({ message: 'm', link: 'l' }),
    promotionHrrpRejected: () => ({ message: 'm', link: 'l' }),
    promotionPendingHrrpReview: () => ({ message: 'm', link: 'l' }),
  },
}));

const HHRMD_USER = {
  id: 'hhrmd-1',
  active: true,
  role: 'HHRMD',
  institutionId: 'inst-1',
  username: 'hhrmd-user',
};

function authedRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:9002/api/promotions', {
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

describe('PATCH /api/promotions — Commission workflow (parity with cadre-change)', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockPromotionFindUnique.mockReset();
    mockPromotionUpdate.mockReset();
    mockEmployeeUpdate.mockReset();
    // Session row with no IP/UA binding so the hijack check is skipped.
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HHRMD_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    // verifyAuth looks up the authenticated user.
    mockUserFindUnique.mockResolvedValue(HHRMD_USER);
    // Existing request fetched for the institution-ownership check.
    mockPromotionFindUnique.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      status: 'Approved by HRRP - Awaiting Commission Review',
      reviewStage: 'hrrp_review',
      proposedCadre: 'Proposed Cadre',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
    });
    mockPromotionUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Approved by HHRMD – Awaiting Commission Decision',
      reviewStage: 'commission_review',
      proposedCadre: 'Proposed Cadre',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_PromotionRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_PromotionRequest_reviewedByIdToUser: null,
      User_PromotionRequest_hrrpReviewedByToUser: null,
    });
  });

  it('persists reviewStage="commission_review" when HHRMD forwards to the Commission', async () => {
    // Regression: the client-supplied reviewStage is stripped for security,
    // so the server must advance it. Before the fix the forward branch left
    // reviewStage at 'hrrp_review', and the Commission Decision buttons in
    // /dashboard/promotion (gated on reviewStage === 'commission_review')
    // never rendered — stranding the request after HHRMD forwarded.
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HHRMD',
        userId: HHRMD_USER.id,
        status: 'Approved by HHRMD – Awaiting Commission Decision',
        reviewStage: 'commission_review',
        decisionDate: new Date().toISOString(),
        reviewedById: HHRMD_USER.id,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);

    const updateArgs = mockPromotionUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('Approved by HHRMD – Awaiting Commission Decision');
    expect(updateArgs.data.reviewStage).toBe('commission_review');
  });

  it('completes the workflow and updates the employee cadre on Commission approval', async () => {
    // The route reads the persisted finalCadre from the update result
    // (finalCadre || proposedCadre) to update the employee — so the mock
    // must echo what the DB would have stored.
    mockPromotionUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Approved by Commission',
      reviewStage: 'completed',
      proposedCadre: 'Proposed Cadre',
      finalCadre: 'Principal Officer',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_PromotionRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_PromotionRequest_reviewedByIdToUser: null,
      User_PromotionRequest_hrrpReviewedByToUser: null,
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
        commissionLetterKey: 'promotion/commission-letters/letter.pdf',
        finalCadre: 'Principal Officer',
        commissionDecisionReason: 'Meets all requirements',
      }),
    );
    expect(res.status).toBe(200);

    const updateArgs = mockPromotionUpdate.mock.calls[0][0];
    expect(updateArgs.data.reviewStage).toBe('completed');

    // Commission approval must update the employee's cadre (finalCadre wins).
    expect(mockEmployeeUpdate).toHaveBeenCalledTimes(1);
    const employeeArgs = mockEmployeeUpdate.mock.calls[0][0];
    expect(employeeArgs.where.id).toBe('emp-1');
    expect(employeeArgs.data.cadre).toBe('Principal Officer');
  });

  it('still rejects a non-commission role attempting a commission decision', async () => {
    mockUserFindUnique.mockResolvedValue({ ...HHRMD_USER, role: 'HRO' });
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HRO',
        userId: 'hro-1',
        status: 'Approved by Commission',
        reviewStage: 'completed',
        reviewedById: 'hro-1',
        commissionLetterKey: 'promotion/commission-letters/letter.pdf',
      }),
    );
    expect(res.status).toBe(403);
  });
});