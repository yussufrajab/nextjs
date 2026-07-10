import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockServiceExtensionFindUnique = vi.fn();
const mockServiceExtensionUpdate = vi.fn();
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
    serviceExtensionRequest: {
      findUnique: (...a: any[]) => mockServiceExtensionFindUnique(...a),
      update: (...a: any[]) => mockServiceExtensionUpdate(...a),
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
    serviceExtensionHrrpApproved: () => ({ message: 'm', link: 'l' }),
    serviceExtensionHrrpRejected: () => ({ message: 'm', link: 'l' }),
    serviceExtensionPendingHrrpReview: () => ({ message: 'm', link: 'l' }),
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
  return new NextRequest('http://localhost:9002/api/service-extension', {
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

describe('PATCH /api/service-extension — Commission workflow (parity with promotion)', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockServiceExtensionFindUnique.mockReset();
    mockServiceExtensionUpdate.mockReset();
    mockEmployeeUpdate.mockReset();
    mockValidateSession.mockResolvedValue({
      id: 's1',
      userId: HHRMD_USER.id,
      ipAddress: null,
      userAgent: null,
    });
    mockUserFindUnique.mockResolvedValue(HHRMD_USER);
    mockServiceExtensionFindUnique.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      status: 'Approved by HRRP - Awaiting Commission Review',
      reviewStage: 'hrrp_review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
    });
    mockServiceExtensionUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Request Received – Awaiting Commission Decision',
      reviewStage: 'commission_review',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_ServiceExtensionRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_ServiceExtensionRequest_reviewedByIdToUser: null,
      User_ServiceExtensionRequest_hrrpReviewedByToUser: null,
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

    const updateArgs = mockServiceExtensionUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('Request Received – Awaiting Commission Decision');
    expect(updateArgs.data.reviewStage).toBe('commission_review');
  });

  it('completes the workflow on Commission approval (no employee side-effect)', async () => {
    mockServiceExtensionUpdate.mockResolvedValue({
      id: 'req-1',
      employeeId: 'emp-1',
      submittedById: 'hro-1',
      status: 'Approved by Commission',
      reviewStage: 'completed',
      Employee: { id: 'emp-1', name: 'Emp', zanId: 'Z1', institutionId: 'inst-1' },
      User_ServiceExtensionRequest_submittedByIdToUser: { id: 'hro-1', name: 'HRO', username: 'hro-user' },
      User_ServiceExtensionRequest_reviewedByIdToUser: null,
      User_ServiceExtensionRequest_hrrpReviewedByToUser: null,
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
        commissionLetterKey: 'service-extension/commission-letters/letter.pdf',
        commissionDecisionReason: 'Meets all requirements',
      }),
    );
    expect(res.status).toBe(200);

    const updateArgs = mockServiceExtensionUpdate.mock.calls[0][0];
    expect(updateArgs.data.reviewStage).toBe('completed');

    // Service-extension approval does not change employee status.
    expect(mockEmployeeUpdate).not.toHaveBeenCalled();
  });

  it('blocks an HRO from recording a commission decision (UAT Req 3.5 / 8.3 / 18.3 / 25.3)', async () => {
    // Pre-fix: the older collection PATCH handler had no auth gate — only
    // [id]/route.ts (which the dashboard never calls) had one. An HRO could
    // record a Commission decision by direct API call. This test pins the
    // fix: an HRO attempting a commission decision now gets 403.
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
        commissionLetterKey: 'service-extension/commission-letters/letter.pdf',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('also blocks an HRRP from recording a commission decision (UAT Req 3.5 / 8.3 / 18.3 / 25.3)', async () => {
    mockUserFindUnique.mockResolvedValue({ ...HHRMD_USER, role: 'HRRP' });
    const { PATCH } = await import('./route');
    const res = await PATCH(
      authedRequest({
        id: 'req-1',
        userRole: 'HRRP',
        userId: 'hrrp-1',
        status: 'Approved by Commission',
        reviewStage: 'completed',
        reviewedById: 'hrrp-1',
        commissionLetterKey: 'service-extension/commission-letters/letter.pdf',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('allows an HRMO to record a commission decision (positive case for the auth gate)', async () => {
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
        commissionLetterKey: 'service-extension/commission-letters/letter.pdf',
        commissionDecisionReason: 'Meets all requirements',
      }),
    );
    expect(res.status).toBe(200);
  });
});
