import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockResignationFindUnique = vi.fn();
const mockResignationUpdate = vi.fn();
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
    resignationRequest: {
      findUnique: (...a: any[]) => mockResignationFindUnique(...a),
      update: (...a: any[]) => mockResignationUpdate(...a),
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
    resignationHrrpApproved: () => ({ message: 'm', link: 'l' }),
    resignationHrrpRejected: () => ({ message: 'm', link: 'l' }),
    resignationPendingHrrpReview: () => ({ message: 'm', link: 'l' }),
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
  return new NextRequest('http://localhost:9002/api/resignation', {
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

describe('PATCH /api/resignation — Commission workflow (parity with promotion)', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockResignationFindUnique.mockReset();
    mockResignationUpdate.mockReset();
    mockEmployeeUpdate.mockReset();
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HHRMD_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    mockUserFindUnique.mockResolvedValue(HHRMD_USER);
    mockResignationFindUnique.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      status: 'Approved by HRRP - Awaiting Commission Review',
      reviewStage: 'hrrp_review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
    });
    mockResignationUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Request Received – Awaiting Commission Decision',
      reviewStage: 'commission_review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_ResignationRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_ResignationRequest_reviewedByIdToUser: null,
      User_ResignationRequest_hrrpReviewedByToUser: null,
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
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);

    const updateArgs = mockResignationUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('Request Received – Awaiting Commission Decision');
    expect(updateArgs.data.reviewStage).toBe('commission_review');
  });

  it('completes the workflow and marks the employee as Resigned on Commission approval', async () => {
    mockResignationUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Approved by Commission',
      reviewStage: 'completed',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_ResignationRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_ResignationRequest_reviewedByIdToUser: null,
      User_ResignationRequest_hrrpReviewedByToUser: null,
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
        commissionLetterKey: 'resignation/commission-letters/letter.pdf',
        commissionDecisionReason: 'Meets all requirements',
      }),
    );
    expect(res.status).toBe(200);

    const updateArgs = mockResignationUpdate.mock.calls[0][0];
    expect(updateArgs.data.reviewStage).toBe('completed');

    // Commission approval must mark the employee as Resigned.
    expect(mockEmployeeUpdate).toHaveBeenCalledTimes(1);
    const employeeArgs = mockEmployeeUpdate.mock.calls[0][0];
    expect(employeeArgs.where.id).toBe('emp-1');
    expect(employeeArgs.data.status).toBe('Resigned');
  });

  it('documents that the older module lacks a role-based auth check (P5 follow-up)', async () => {
    // KNOWN GAP: this PATCH handler does not call checkRoleAuthorization, so
    // an HRO can record a Commission decision in the database. The frontend
    // never offers the buttons to HRO, so the practical risk is low — but
    // a direct API call would succeed. Filed as P5 to add the auth check
    // (mirror the promotion pattern: see promotions/route.ts:482-498).
    // The test pins the current behavior so a future fix is a deliberate change.
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
        commissionLetterKey: 'resignation/commission-letters/letter.pdf',
      }),
    );
    expect(res.status).toBe(200);
  });
});
