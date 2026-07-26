/**
 * Tests for complainant-identity privacy on the read paths (Req 9.6 + 9.2).
 */

import { describe, it, expect } from 'vitest';
import {
  maskTrailing,
  toInitials,
  viewerSeesFullComplainantIdentity,
  redactComplainantPii,
} from '@/lib/complaint-privacy';
import { ROLES } from '@/lib/constants';

function baseRow(overrides: Record<string, any> = {}) {
  return {
    id: 'c1',
    complainantId: 'user-complainant',
    employeeId: 'emp-1',
    employeeName: 'Ali Juma',
    zanId: '2214582327',
    complainantPhoneNumber: '0777123456',
    nextOfKinPhoneNumber: '0788765432',
    assignedOfficerRole: ROLES.DO,
    confidential: false,
    subject: 'Subject',
    ...overrides,
  };
}

describe('maskTrailing', () => {
  it('masks to the last 4 characters', () => {
    expect(maskTrailing('0777123456')).toBe('***3456');
    expect(maskTrailing('2214582327')).toBe('***2327');
  });
  it('returns *** for empty / short / null', () => {
    expect(maskTrailing('')).toBe('***');
    expect(maskTrailing(null)).toBe('***');
    expect(maskTrailing(undefined)).toBe('***');
    expect(maskTrailing('123')).toBe('***');
    expect(maskTrailing('1234')).toBe('***');
  });
});

describe('toInitials', () => {
  it('renders a multi-part name as initials', () => {
    expect(toInitials('Ali Juma')).toBe('A. J.');
    expect(toInitials('Ali Juma Ali')).toBe('A. J. A.');
  });
  it('renders a single name as one initial', () => {
    expect(toInitials('Ali')).toBe('A.');
  });
  it('returns *** for empty / null', () => {
    expect(toInitials('')).toBe('***');
    expect(toInitials(null)).toBe('***');
    expect(toInitials('   ')).toBe('***');
  });
});

describe('viewerSeesFullComplainantIdentity', () => {
  it('complainant sees full identity', () => {
    expect(
      viewerSeesFullComplainantIdentity(baseRow({ confidential: true }), {
        viewerRole: ROLES.EMPLOYEE,
        viewerUserId: 'user-complainant',
        assignedOfficerId: null,
      })
    ).toBe(true);
  });

  it('specifically-assigned officer (user-id match) sees full identity', () => {
    expect(
      viewerSeesFullComplainantIdentity(baseRow({ assignedOfficerRole: ROLES.HHRMD }), {
        // A DO whose user id matches the assigned officer id still sees full.
        viewerRole: ROLES.DO,
        viewerUserId: 'do-1',
        assignedOfficerId: 'do-1',
      })
    ).toBe(true);
  });

  it('role-based owning officer (DO on DO-assigned) sees full identity', () => {
    expect(
      viewerSeesFullComplainantIdentity(baseRow({ assignedOfficerRole: ROLES.DO }), {
        viewerRole: ROLES.DO,
        viewerUserId: 'do-1',
        assignedOfficerId: null,
      })
    ).toBe(true);
  });

  it('co-reviewer (HHRMD on DO-assigned) is masked', () => {
    expect(
      viewerSeesFullComplainantIdentity(baseRow({ assignedOfficerRole: ROLES.DO }), {
        viewerRole: ROLES.HHRMD,
        viewerUserId: 'hhrmd-1',
        assignedOfficerId: null,
      })
    ).toBe(false);
  });

  it('Admin/CSCS see full identity for non-confidential complaints', () => {
    for (const role of [ROLES.ADMIN, ROLES.CSCS]) {
      expect(
        viewerSeesFullComplainantIdentity(baseRow({ confidential: false }), {
          viewerRole: role,
          viewerUserId: 'admin-1',
          assignedOfficerId: null,
        })
      ).toBe(true);
    }
  });

  it('Admin/CSCS are masked for confidential complaints (whistleblower protection)', () => {
    for (const role of [ROLES.ADMIN, ROLES.CSCS]) {
      expect(
        viewerSeesFullComplainantIdentity(baseRow({ confidential: true }), {
          viewerRole: role,
          viewerUserId: 'admin-1',
          assignedOfficerId: null,
        })
      ).toBe(false);
    }
  });

  it('non-owning employee is masked', () => {
    expect(
      viewerSeesFullComplainantIdentity(baseRow(), {
        viewerRole: ROLES.EMPLOYEE,
        viewerUserId: 'someone-else',
        assignedOfficerId: null,
      })
    ).toBe(false);
  });
});

describe('redactComplainantPii', () => {
  it('returns the row unchanged (with redacted=false) for the complainant', () => {
    const out = redactComplainantPii(baseRow(), {
      viewerRole: ROLES.EMPLOYEE,
      viewerUserId: 'user-complainant',
      assignedOfficerId: null,
    });
    expect(out.complainantIdentityRedacted).toBe(false);
    expect(out.employeeName).toBe('Ali Juma');
    expect(out.zanId).toBe('2214582327');
    expect(out.complainantPhoneNumber).toBe('0777123456');
    // complainantId is stripped from the output.
    expect((out as any).complainantId).toBeUndefined();
  });

  it('returns full identity for the specifically-assigned officer', () => {
    const out = redactComplainantPii(baseRow({ assignedOfficerRole: ROLES.HHRMD }), {
      viewerRole: ROLES.HHRMD,
      viewerUserId: 'hhrmd-1',
      assignedOfficerId: 'hhrmd-1',
    });
    expect(out.complainantIdentityRedacted).toBe(false);
    expect(out.employeeName).toBe('Ali Juma');
    expect(out.zanId).toBe('2214582327');
    expect((out as any).complainantId).toBeUndefined();
  });

  it('masks PII for a co-reviewer (HHRMD on DO-assigned, non-confidential)', () => {
    const out = redactComplainantPii(baseRow({ assignedOfficerRole: ROLES.DO }), {
      viewerRole: ROLES.HHRMD,
      viewerUserId: 'hhrmd-1',
      assignedOfficerId: null,
    });
    expect(out.complainantIdentityRedacted).toBe(true);
    expect(out.employeeId).toBeNull();
    expect(out.employeeName).toBe('A. J.');
    expect(out.zanId).toBe('***2327');
    expect(out.complainantPhoneNumber).toBe('***3456');
    expect(out.nextOfKinPhoneNumber).toBe('***5432');
    expect((out as any).complainantId).toBeUndefined();
  });

  it('masks PII for a non-owning employee', () => {
    const out = redactComplainantPii(baseRow(), {
      viewerRole: ROLES.EMPLOYEE,
      viewerUserId: 'someone-else',
      assignedOfficerId: null,
    });
    expect(out.complainantIdentityRedacted).toBe(true);
    expect(out.employeeName).toBe('A. J.');
    expect(out.zanId).toBe('***2327');
    expect(out.employeeId).toBeNull();
  });

  it('masks PII for Admin on a confidential complaint', () => {
    const out = redactComplainantPii(baseRow({ confidential: true }), {
      viewerRole: ROLES.ADMIN,
      viewerUserId: 'admin-1',
      assignedOfficerId: null,
    });
    expect(out.complainantIdentityRedacted).toBe(true);
    expect(out.zanId).toBe('***2327');
  });

  it('preserves non-PII fields (subject, status, assignedOfficerRole) under masking', () => {
    const out = redactComplainantPii(baseRow(), {
      viewerRole: ROLES.EMPLOYEE,
      viewerUserId: 'someone-else',
      assignedOfficerId: null,
    });
    expect(out.subject).toBe('Subject');
    expect(out.assignedOfficerRole).toBe(ROLES.DO);
  });
});