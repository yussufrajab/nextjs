import { describe, it, expect } from 'vitest';
import {
  canSeeComplainantIdentity,
  redactComplainantIdentity,
  resolveConfidential,
  REDACTED_COMPLAINANT_NAME,
} from '@/lib/complaint-confidentiality';
import { ROLES } from '@/lib/constants';

const baseCtx = (overrides: Partial<Parameters<typeof canSeeComplainantIdentity>[2]> = {}) => ({
  complainantId: 'user-complainant',
  assignedOfficerRole: ROLES.DO,
  confidential: false,
  ...overrides,
});

describe('canSeeComplainantIdentity', () => {
  it('complainant always sees their own identity', () => {
    expect(
      canSeeComplainantIdentity(
        ROLES.EMPLOYEE,
        'user-complainant',
        baseCtx({ confidential: true })
      )
    ).toBe(true);
  });

  it('non-owning employee is redacted', () => {
    expect(
      canSeeComplainantIdentity(ROLES.EMPLOYEE, 'someone-else', baseCtx())
    ).toBe(false);
  });

  it('exactly-assigned officer (DO) sees identity', () => {
    expect(canSeeComplainantIdentity(ROLES.DO, 'do-1', baseCtx({ assignedOfficerRole: ROLES.DO }))).toBe(true);
  });

  it('co-reviewer officer (HHRMD) viewing a DO-assigned complaint is redacted', () => {
    expect(
      canSeeComplainantIdentity(ROLES.HHRMD, 'hhrmd-1', baseCtx({ assignedOfficerRole: ROLES.DO }))
    ).toBe(false);
  });

  it('HHRMD viewing their own assigned complaint sees identity', () => {
    expect(
      canSeeComplainantIdentity(ROLES.HHRMD, 'hhrmd-1', baseCtx({ assignedOfficerRole: ROLES.HHRMD }))
    ).toBe(true);
  });

  it('CSCS sees identity for non-confidential complaints', () => {
    expect(canSeeComplainantIdentity(ROLES.CSCS, 'cscs-1', baseCtx({ confidential: false }))).toBe(true);
  });

  it('Admin sees identity for non-confidential complaints', () => {
    expect(canSeeComplainantIdentity(ROLES.ADMIN, 'admin-1', baseCtx({ confidential: false }))).toBe(true);
  });

  it('CSCS is redacted for confidential complaints', () => {
    expect(canSeeComplainantIdentity(ROLES.CSCS, 'cscs-1', baseCtx({ confidential: true }))).toBe(false);
  });

  it('Admin is redacted for confidential complaints', () => {
    expect(canSeeComplainantIdentity(ROLES.ADMIN, 'admin-1', baseCtx({ confidential: true }))).toBe(false);
  });

  it('exactly-assigned officer still sees identity on confidential complaints', () => {
    expect(
      canSeeComplainantIdentity(ROLES.DO, 'do-1', baseCtx({ assignedOfficerRole: ROLES.DO, confidential: true }))
    ).toBe(true);
  });

  it('non-handler officer roles (HRMO) are redacted', () => {
    expect(canSeeComplainantIdentity(ROLES.HRMO, 'hrmo-1', baseCtx())).toBe(false);
  });

  it('null/empty inputs are redacted (fail-closed)', () => {
    expect(canSeeComplainantIdentity(null, 'u', baseCtx())).toBe(false);
    expect(canSeeComplainantIdentity(ROLES.DO, null, baseCtx())).toBe(false);
  });

  it('unassigned complaint: officers (non-escalation) redacted, escalation sees non-confidential', () => {
    expect(canSeeComplainantIdentity(ROLES.DO, 'do-1', baseCtx({ assignedOfficerRole: null }))).toBe(false);
    expect(canSeeComplainantIdentity(ROLES.CSCS, 'cscs-1', baseCtx({ assignedOfficerRole: null, confidential: false }))).toBe(true);
  });
});

describe('resolveConfidential', () => {
  it('harassment complaints are always confidential', () => {
    expect(resolveConfidential('Unyanyasaji', false)).toBe(true);
    expect(resolveConfidential('Unyanyasaji', undefined)).toBe(true);
  });

  it('non-harassment complaints respect the submitter request', () => {
    expect(resolveConfidential('Uongozi Mbaya', true)).toBe(true);
    expect(resolveConfidential('Uongozi Mbaya', false)).toBe(false);
    expect(resolveConfidential('Uongozi Mbaya', undefined)).toBe(false);
  });
});

describe('redactComplainantIdentity', () => {
  it('clears all PII fields and marks the row redacted', () => {
    const row = redactComplainantIdentity({
      id: 'c1',
      employeeId: 'emp1',
      employeeName: 'Ali Juma',
      zanId: '2214582327',
      complainantPhoneNumber: '0777123456',
      nextOfKinPhoneNumber: '0777987654',
      subject: 'harassment',
    });
    expect(row.employeeId).toBeNull();
    expect(row.employeeName).toBe(REDACTED_COMPLAINANT_NAME);
    expect(row.zanId).toBeNull();
    expect(row.complainantPhoneNumber).toBeNull();
    expect(row.nextOfKinPhoneNumber).toBeNull();
    expect(row.complainantIdentityRedacted).toBe(true);
    // non-PII fields preserved
    expect(row.id).toBe('c1');
    expect(row.subject).toBe('harassment');
  });
});