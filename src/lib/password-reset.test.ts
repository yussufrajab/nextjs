import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdateMany = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    passwordResetToken: {
      create: (...a: any[]) => mockCreate(...a),
      findUnique: (...a: any[]) => mockFindUnique(...a),
      updateMany: (...a: any[]) => mockUpdateMany(...a),
      update: (...a: any[]) => mockUpdate(...a),
      deleteMany: (...a: any[]) => mockDeleteMany(...a),
    },
  },
}));

beforeEach(() => {
  mockCreate.mockReset();
  mockFindUnique.mockReset();
  mockUpdateMany.mockReset();
  mockUpdate.mockReset();
  mockDeleteMany.mockReset();
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockCreate.mockResolvedValue({});
});

describe('password-reset tokens', () => {
  it('generateResetToken returns 64 hex chars and hashResetToken is stable + 64 hex', async () => {
    const { generateResetToken, hashResetToken } = await import('./password-reset');
    const t = generateResetToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken(t)).toBe(hashResetToken(t));
    expect(hashResetToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken(t)).not.toBe(t);
  });

  it('createPasswordResetToken invalidates prior unused tokens and stores the hash (not the raw token)', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { createPasswordResetToken, hashResetToken } = await import('./password-reset');
    const { token } = await createPasswordResetToken('u1', 'a@b.com', '1.2.3.4', 'ua');
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        tokenHash: hashResetToken(token),
        email: 'a@b.com',
        ipAddress: '1.2.3.4',
        userAgent: 'ua',
      }),
    });
    // raw token must never be persisted
    expect(JSON.stringify(mockCreate.mock.calls)).not.toContain(token);
  });

  it('resolveResetToken returns ok:true with the record for a valid unused unexpired token', async () => {
    const rec = { id: 't1', userId: 'u1', email: 'a@b.com', usedAt: null, attempts: 0, expiresAt: new Date(Date.now() + 60000) };
    mockFindUnique.mockResolvedValue(rec);
    const { resolveResetToken } = await import('./password-reset');
    const r = await resolveResetToken('raw');
    expect(r.ok).toBe(true);
    expect(r.record).toEqual(rec);
  });

  it('resolveResetToken rejects not-found / already-used / expired without mutating', async () => {
    const { resolveResetToken } = await import('./password-reset');
    mockFindUnique.mockResolvedValue(null);
    expect((await resolveResetToken('raw')).reason).toBe('not_found');
    expect(mockUpdate).not.toHaveBeenCalled();

    mockFindUnique.mockResolvedValue({ ...{ id: 't1', userId: 'u1', email: 'a@b', usedAt: new Date(), attempts: 0, expiresAt: new Date(Date.now() + 60000) } });
    expect((await resolveResetToken('raw')).reason).toBe('already_used');

    mockFindUnique.mockResolvedValue({ id: 't1', userId: 'u1', email: 'a@b', usedAt: null, attempts: 0, expiresAt: new Date(Date.now() - 1) });
    expect((await resolveResetToken('raw')).reason).toBe('expired');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('resolveResetToken invalidates an over-attempted token', async () => {
    mockFindUnique.mockResolvedValue({ id: 't1', userId: 'u1', email: 'a@b', usedAt: null, attempts: 99, expiresAt: new Date(Date.now() + 60000) });
    const { resolveResetToken } = await import('./password-reset');
    const r = await resolveResetToken('raw');
    expect(r.reason).toBe('too_many_attempts');
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't1' }, data: { usedAt: expect.any(Date) } });
  });

  it('consumePasswordResetToken wins the race only when updateMany flips exactly one row', async () => {
    const { consumePasswordResetToken } = await import('./password-reset');
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });
    expect((await consumePasswordResetToken('t1')).ok).toBe(true);
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    expect((await consumePasswordResetToken('t1')).ok).toBe(false);
  });

  it('incrementResetVerifyAttempts bumps attempts and invalidates at the cap', async () => {
    mockFindUnique.mockResolvedValue({ id: 't1', attempts: 4, usedAt: null });
    const { incrementResetVerifyAttempts } = await import('./password-reset');
    const r = await incrementResetVerifyAttempts('t1');
    expect(r.allowed).toBe(false);
    expect(r.remainingAttempts).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't1' }, data: { attempts: 5, usedAt: expect.any(Date) } });
  });

  it('concurrent consume: exactly one wins (two parallel calls, one count=1, one count=0)', async () => {
    const rec = { id: 't1', userId: 'u1', email: 'a@b', usedAt: null, attempts: 0, expiresAt: new Date(Date.now() + 60000) };
    mockFindUnique.mockResolvedValue(rec);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const { resolveResetToken, consumePasswordResetToken } = await import('./password-reset');
    const [a, b] = await Promise.all([resolveResetToken('raw'), resolveResetToken('raw')]);
    // both resolve ok; consuming must be serialized so only one wins
    const [c1, c2] = await Promise.all([consumePasswordResetToken('t1'), consumePasswordResetToken('t1')]);
    const wins = [c1, c2].filter((c) => c.ok).length;
    expect(wins).toBe(1);
  });
});