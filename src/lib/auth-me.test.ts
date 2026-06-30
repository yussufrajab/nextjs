import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMePayload, type MePayload } from './auth-me';

const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

const FULL_USER = {
  id: 'u1',
  username: 'ymrajab',
  name: 'Yussuf Mzee Rajab',
  email: 'yussuf.rajab@zanajira.go.tz',
  role: 'Admin',
  active: true,
  employeeId: null,
  institutionId: 'inst-1',
  createdAt: new Date('2025-08-10T04:26:50.826Z'),
  updatedAt: new Date('2026-06-30T02:59:41.551Z'),
  password: 'SHOULD-NOT-LEAK',
  passwordHistory: ['hash-1', 'hash-2'],
  isTemporaryPassword: false,
  temporaryPasswordExpiry: null,
  mustChangePassword: false,
  lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
  failedPasswordChangeAttempts: 0,
  passwordChangeLockoutUntil: null,
  loginLockedUntil: null,
};

describe('getMePayload', () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns null when the user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getMePayload('missing');
    expect(result).toBeNull();
    expect(mockInstitutionFindUnique).not.toHaveBeenCalled();
  });

  it('returns UI-safe fields and never password/passwordHistory/lockout', async () => {
    mockUserFindUnique.mockResolvedValue(FULL_USER);
    mockInstitutionFindUnique.mockResolvedValue({ name: 'TUME YA UTUMISHI SERIKALINI' });

    const result = (await getMePayload('u1')) as MePayload;

    expect(result).not.toBeNull();
    expect(result).toEqual({
      id: 'u1',
      username: 'ymrajab',
      name: 'Yussuf Mzee Rajab',
      role: 'Admin',
      active: true,
      employeeId: null,
      institutionId: 'inst-1',
      institutionName: 'TUME YA UTUMISHI SERIKALINI',
      mustChangePassword: false,
      isTemporaryPassword: false,
      temporaryPasswordExpiry: null,
      lastPasswordChange: '2026-05-14T07:51:39.477Z',
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHistory');
    expect(serialized).not.toContain('failedPasswordChangeAttempts');
    expect(serialized).not.toContain('passwordChangeLockoutUntil');
    expect(serialized).not.toContain('loginLocked');
  });

  it('selects only safe columns from the DB (no password column)', async () => {
    mockUserFindUnique.mockResolvedValue(FULL_USER);
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });
    await getMePayload('u1');
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: expect.objectContaining({
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        employeeId: true,
        institutionId: true,
        isTemporaryPassword: true,
        temporaryPasswordExpiry: true,
        mustChangePassword: true,
        lastPasswordChange: true,
      }),
    });
    const selectArg = mockUserFindUnique.mock.calls[0][0].select;
    expect(selectArg.password).toBeUndefined();
    expect(selectArg.passwordHistory).toBeUndefined();
  });

  it('handles a user with no institution', async () => {
    mockUserFindUnique.mockResolvedValue({ ...FULL_USER, institutionId: null });
    const result = (await getMePayload('u1')) as MePayload;
    expect(result.institutionId).toBeNull();
    expect(result.institutionName).toBeNull();
    expect(mockInstitutionFindUnique).not.toHaveBeenCalled();
  });

  it('coerces Date fields to ISO strings', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...FULL_USER,
      lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
      temporaryPasswordExpiry: new Date('2026-07-01T00:00:00.000Z'),
    });
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });
    const result = (await getMePayload('u1')) as MePayload;
    expect(result.lastPasswordChange).toBe('2026-05-14T07:51:39.477Z');
    expect(result.temporaryPasswordExpiry).toBe('2026-07-01T00:00:00.000Z');
  });
});