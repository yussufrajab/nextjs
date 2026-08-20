/**
 * Route tests for GET /api/complaints/[id] — involved-party visibility (Req 9.2)
 * + complainant-identity masking (Req 9.6).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyAuth = vi.fn();
const mockComplaintFindUnique = vi.fn();
const mockLogAccessDenied = vi.fn();
const mockSafeAuditLog = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  verifyAuth: (...a: any[]) => mockVerifyAuth(...a),
}));

vi.mock('@/lib/error-handler', () => ({
  wrapHandler: (h: any) => h,
}));

vi.mock('@/lib/db', () => ({
  db: {
    complaint: {
      findUnique: (...a: any[]) => mockComplaintFindUnique(...a),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  logAccessDenied: (...a: any[]) => mockLogAccessDenied(...a),
  safeAuditLog: (...a: any[]) => mockSafeAuditLog(...a),
  getClientIp: () => '127.0.0.1',
  // logComplaintAction etc. are not used by GET but keep a stub for safety.
  logComplaintAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Real complaint-privacy (pure) + real workflow-access (uses the mocked
// audit-logger) exercise the actual redaction + denial path.

function authCtx(role: string, userId: string) {
  return {
    authenticated: true,
    context: {
      userId,
      username: userId,
      role,
      institutionId: 'inst-1',
    },
  };
}

function getRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:9002/api/complaints/${id}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'TestAgent/1.0' },
  });
}

function complaintRow(overrides: Record<string, any> = {}) {
  return {
    id: 'c1',
    complainantId: 'user-complainant',
    complainantPhoneNumber: '0777123456',
    nextOfKinPhoneNumber: '0788765432',
    complaintType: 'Malizane',
    subject: 'Subject',
    details: 'Details',
    status: 'Submitted',
    reviewStage: 'initial',
    attachments: [],
    officerComments: null,
    internalNotes: null,
    rejectionReason: null,
    assignedOfficerRole: 'DO',
    reviewedById: null,
    confidential: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    User_Complaint_complainantIdToUser: {
      name: 'Ali Juma',
      employeeId: 'emp-1',
      Employee: { zanId: '2214582327', department: 'HR', cadre: 'Officer' },
      Institution: { name: 'Commission' },
    },
    User_Complaint_reviewedByIdToUser: null,
    ...overrides,
  };
}

const PARAMS = { params: Promise.resolve({ id: 'c1' }) };

describe('GET /api/complaints/[id] — involved-party visibility (Req 9.2 + 9.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeAuditLog.mockResolvedValue(undefined);
    mockLogAccessDenied.mockResolvedValue(undefined);
  });

  it('returns 404 when the complaint does not exist', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('EMPLOYEE', 'user-complainant'));
    mockComplaintFindUnique.mockResolvedValue(null);

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    expect(res.status).toBe(404);
  });

  it('returns full identity to the complainant', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('EMPLOYEE', 'user-complainant'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow());

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.complainantIdentityRedacted).toBe(false);
    expect(body.employeeName).toBe('Ali Juma');
    expect(body.zanId).toBe('2214582327');
    expect(body.complainantPhoneNumber).toBe('0777123456');
    // complainantId is stripped from the response.
    expect(body.complainantId).toBeUndefined();
  });

  it('returns full identity to the assigned officer (role match)', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('DO', 'do-1'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow({ assignedOfficerRole: 'DO' }));

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.complainantIdentityRedacted).toBe(false);
    expect(body.employeeName).toBe('Ali Juma');
    expect(body.zanId).toBe('2214582327');
  });

  it('returns full identity for a co-reviewer (HHRMD on a DO-assigned complaint) — DO/HHRMD are the handling pool', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('HHRMD', 'hhrmd-1'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow({ assignedOfficerRole: 'DO' }));

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();

    // HHRMD is a handler role → allowed in, and now sees full identity.
    expect(res.status).toBe(200);
    expect(body.complainantIdentityRedacted).toBe(false);
    expect(body.employeeName).toBe('Ali Juma');
    expect(body.zanId).toBe('2214582327');
    expect(body.complainantId).toBeUndefined();
  });

  it('403s a non-involved party (HRO) and audits the denial via denyWorkflowAccess', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('HRO', 'hro-1'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow());

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    // The denial is written to the audit trail (Req 15.7 / 17.6).
    expect(mockLogAccessDenied).toHaveBeenCalledTimes(1);
    const audit = mockLogAccessDenied.mock.calls[0][0];
    expect(audit.blockReason).toBe('NOT_INVOLVED_PARTY');
    expect(audit.requestMethod).toBe('GET');
    expect(audit.attemptedRoute).toBe('/api/complaints/c1');
    // No complaint body returned for a denied viewer.
    expect(body.complainantIdentityRedacted).toBeUndefined();
  });

  it('403s a non-owning employee and audits the denial', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('EMPLOYEE', 'someone-else'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow());

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    expect(res.status).toBe(403);
    expect(mockLogAccessDenied).toHaveBeenCalledTimes(1);
    expect(mockLogAccessDenied.mock.calls[0][0].blockReason).toBe('NOT_INVOLVED_PARTY');
  });

  it('allows Admin (override tier) and shows full identity for non-confidential', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('Admin', 'admin-1'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow({ confidential: false }));

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.complainantIdentityRedacted).toBe(false);
    expect(body.employeeName).toBe('Ali Juma');
  });

  it('masks identity for Admin on a confidential complaint (whistleblower protection)', async () => {
    mockVerifyAuth.mockResolvedValue(authCtx('Admin', 'admin-1'));
    mockComplaintFindUnique.mockResolvedValue(complaintRow({ confidential: true }));

    const { GET } = await import('./route');
    const res = await GET(getRequest('c1'), PARAMS as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.complainantIdentityRedacted).toBe(true);
    expect(body.zanId).toBe('***2327');
  });
});