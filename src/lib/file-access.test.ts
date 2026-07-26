/**
 * Unit tests for src/lib/file-access.ts — per-object MinIO authorization
 * (Req 10.1–10.2, 17.3, 27.1, 30.1).
 *
 * Asserts the role matrix that closes the generic-route IDOR:
 *  - Unrestricted roles (central/commission + officers) read anything.
 *  - HRO/HRRP are institution-scoped (employee-documents AND generic uploads).
 *  - EMPLOYEE is self-only (own employee record / own upload).
 *  - Unknown role is denied.
 *  - templates/ are readable by any authenticated user.
 *  - At-risk roles with an unresolvable owner are DENIED (fail-closed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const employeeFindUnique = vi.fn();
const userFindUnique = vi.fn();
const fileHashFindUnique = vi.fn();
const complaintFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    employee: { findUnique: (...a: any[]) => employeeFindUnique(...a) },
    user: { findUnique: (...a: any[]) => userFindUnique(...a) },
    fileHash: { findUnique: (...a: any[]) => fileHashFindUnique(...a) },
    complaint: { findFirst: (...a: any[]) => complaintFindFirst(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  logUnauthorizedAccess: vi.fn(),
  safeAuditLog: async (p: Promise<void>) => {
    try {
      await p;
    } catch {
      /* swallow — exercised helper */
    }
  },
  getClientIp: () => '127.0.0.1',
}));

beforeEach(() => {
  employeeFindUnique.mockReset();
  userFindUnique.mockReset();
  fileHashFindUnique.mockReset();
  complaintFindFirst.mockReset();
  // Default: the key is not a complaint attachment → fall through to the
  // uploader-owner check. Individual tests override with mockResolvedValueOnce.
  complaintFindFirst.mockResolvedValue(null);
});

function auth(overrides: Partial<Record<string, any>> = {}) {
  return {
    userId: 'u-hro',
    role: 'HRO',
    institutionId: 'inst-A',
    username: 'hro',
    ...overrides,
  };
}

const empDocKey = (employeeId: string) => `employee-documents/${employeeId}_1700000000_abc_photo.pdf`;
const empPhotoKey = (employeeId: string) => `employee-photos/${employeeId}.jpg`;

describe('checkFileAccess — unrestricted roles', () => {
  it.each(['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO'])(
    '%s may read any employee-documents key without a DB lookup',
    async (role) => {
      const { checkFileAccess } = await import('./file-access');
      const result = await checkFileAccess(auth({ role }), empDocKey('emp-1'));
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('unrestricted_role');
      expect(employeeFindUnique).not.toHaveBeenCalled();
    }
  );

  it.each(['ADMIN', 'HRO', 'EMPLOYEE'])(
    '%s may read system templates', async (role) => {
      const { checkFileAccess } = await import('./file-access');
      const result = await checkFileAccess(auth({ role }), 'templates/promotion-form-template.docx');
      expect(result.allowed).toBe(true);
    }
  );
});

describe('checkFileAccess — employee-documents / employee-photos', () => {
  it('HRO same institution → allow (institution_match)', async () => {
    employeeFindUnique.mockResolvedValueOnce({ institutionId: 'inst-A' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), empDocKey('emp-1'));
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('institution_match');
    expect(result.ownerEmployeeId).toBe('emp-1');
  });

  it('HRO different institution → denied_institution_mismatch', async () => {
    employeeFindUnique.mockResolvedValueOnce({ institutionId: 'inst-B' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), empDocKey('emp-1'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_institution_mismatch');
    expect(result.ownerInstitutionId).toBe('inst-B');
  });

  it('HRO unknown employee → denied_no_owner', async () => {
    employeeFindUnique.mockResolvedValueOnce(null);
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), empDocKey('emp-1'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_no_owner');
  });

  it('HRRP is institution-scoped like HRO', async () => {
    employeeFindUnique.mockResolvedValueOnce({ institutionId: 'inst-A' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth({ role: 'HRRP' }), empDocKey('emp-1'));
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('institution_match');
  });

  it('EMPLOYEE own record → owner_self', async () => {
    userFindUnique.mockResolvedValueOnce({ employeeId: 'emp-me' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      empDocKey('emp-me')
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner_self');
  });

  it('EMPLOYEE other record → denied_not_owner', async () => {
    userFindUnique.mockResolvedValueOnce({ employeeId: 'emp-me' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      empDocKey('emp-other')
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_not_owner');
  });

  it('employee-photos/<id>.jpg parses the employeeId from before the dot', async () => {
    employeeFindUnique.mockResolvedValueOnce({ institutionId: 'inst-A' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), empPhotoKey('emp-1'));
    expect(result.allowed).toBe(true);
    expect(employeeFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'emp-1' } })
    );
  });
});

describe('checkFileAccess — generic uploads (FileHash.uploadedBy)', () => {
  it('HRO same-institution uploader → allow', async () => {
    fileHashFindUnique.mockResolvedValueOnce({ uploadedBy: 'u-other' });
    userFindUnique.mockResolvedValueOnce({ institutionId: 'inst-A' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), 'complaints/1700000000_abc_note.pdf');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('institution_match');
  });

  it('HRO different-institution uploader → denied_institution_mismatch', async () => {
    fileHashFindUnique.mockResolvedValueOnce({ uploadedBy: 'u-other' });
    userFindUnique.mockResolvedValueOnce({ institutionId: 'inst-B' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), 'complaints/1700000000_abc_note.pdf');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_institution_mismatch');
  });

  it('HRO with no FileHash row → denied_no_owner (fail-closed)', async () => {
    fileHashFindUnique.mockResolvedValueOnce(null);
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth(), 'complaints/1700000000_abc_note.pdf');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_no_owner');
  });

  it('EMPLOYEE own upload → owner_self', async () => {
    fileHashFindUnique.mockResolvedValueOnce({ uploadedBy: 'u-emp' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'complaints/1700000000_abc_note.pdf'
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner_self');
  });

  it('EMPLOYEE someone else upload → denied_not_owner', async () => {
    fileHashFindUnique.mockResolvedValueOnce({ uploadedBy: 'u-someone-else' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'complaints/1700000000_abc_note.pdf'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_not_owner');
  });

  it('EMPLOYEE with no FileHash row → denied_not_owner (fail-closed)', async () => {
    fileHashFindUnique.mockResolvedValueOnce(null);
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'complaints/1700000000_abc_note.pdf'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_not_owner');
  });
});

describe('checkFileAccess — complaint attachments', () => {
  it('complainant EMPLOYEE may read an officer-uploaded attachment on their own complaint', async () => {
    // The complaint carries the key; no FileHash row is needed because the
    // grant is the complaint relationship, not the uploader.
    complaintFindFirst.mockResolvedValueOnce({ complainantId: 'u-emp' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'complaints/1700000000_officer_letter.pdf'
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner_self');
    // The uploader-owner path is never consulted.
    expect(fileHashFindUnique).not.toHaveBeenCalled();
  });

  it('non-complainant EMPLOYEE is denied a complaint attachment', async () => {
    complaintFindFirst.mockResolvedValueOnce({ complainantId: 'u-someone-else' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'complaints/1700000000_abc_note.pdf'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_not_owner');
  });

  it('a key that is not a complaint attachment falls through to the uploader-owner check', async () => {
    complaintFindFirst.mockResolvedValueOnce(null);
    fileHashFindUnique.mockResolvedValueOnce({ uploadedBy: 'u-emp' });
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(
      auth({ userId: 'u-emp', role: 'EMPLOYEE', institutionId: null }),
      'uploads/1700000000_abc_note.pdf'
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner_self');
    expect(fileHashFindUnique).toHaveBeenCalled();
  });
});

describe('checkFileAccess — unknown role', () => {
  it('denies an unrecognized role for an employee-documents key', async () => {
    const { checkFileAccess } = await import('./file-access');
    const result = await checkFileAccess(auth({ role: 'GUEST' }), empDocKey('emp-1'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('denied_unknown_role');
  });
});