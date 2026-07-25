/**
 * Self-service password-reset token utilities (server-only).
 *
 * Tokens are 256-bit random (`crypto.randomBytes(32).toString('hex')`) and are
 * stored as a SHA-256 hash — the raw token is never persisted, only carried in
 * the emailed reset link. A token is resolved WITHOUT consuming it so the
 * reset route can validate the proposed new password first; only a passing
 * validation then atomically consumes the token (race-safe single-use).
 *
 * Mirrors the MfaToken single-use pattern but with hashed-at-rest tokens and a
 * resolve/consume split.
 */
import crypto from 'crypto';
import { db } from '@/lib/db';
import type { PasswordResetToken as PrismaPasswordResetToken } from '@prisma/client';

const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES =
  Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 15;
const PASSWORD_RESET_MAX_VERIFY_ATTEMPTS =
  Number(process.env.PASSWORD_RESET_MAX_VERIFY_ATTEMPTS) || 5;

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(
  userId: string,
  email: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ token: string; expiresAt: Date }> {
  // Invalidate any prior unused reset tokens for this user so only one active
  // reset link exists at a time (mirrors createMfaToken).
  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateResetToken();
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(token),
      email,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { token, expiresAt };
}

export type ResolveResetTokenReason =
  | 'not_found'
  | 'already_used'
  | 'expired'
  | 'too_many_attempts';

export interface ResolveResetTokenResult {
  ok: boolean;
  record?: PrismaPasswordResetToken;
  reason?: ResolveResetTokenReason;
}

/**
 * Resolve a raw token to its record WITHOUT consuming it. Used so the route can
 * run new-password validation first; only a passing validation then consumes.
 */
export async function resolveResetToken(
  rawToken: string
): Promise<ResolveResetTokenResult> {
  if (!rawToken) return { ok: false, reason: 'not_found' };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(rawToken) },
  });
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.usedAt) return { ok: false, reason: 'already_used', record };
  if (new Date() > record.expiresAt) return { ok: false, reason: 'expired', record };

  if (record.attempts >= PASSWORD_RESET_MAX_VERIFY_ATTEMPTS) {
    // Invalidate an over-attempted token so it cannot be retried further.
    await db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, reason: 'too_many_attempts', record };
  }

  return { ok: true, record };
}

/**
 * Atomically claim a resolved token. Only the request that flips `usedAt`
 * null→now wins; a concurrent caller gets `ok:false` with `already_used`.
 * This is the single-use guarantee under concurrency.
 */
export async function consumePasswordResetToken(
  tokenId: string
): Promise<{ ok: boolean; reason?: 'already_used' }> {
  const claim = await db.passwordResetToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count !== 1) return { ok: false, reason: 'already_used' };
  return { ok: true };
}

/**
 * Bump the failed-verification attempt counter for a token. Once the cap is
 * reached the token is invalidated. Called by the route when new-password
 * validation fails (the token is NOT consumed, so the user may retry with a
 * stronger password up to the cap).
 */
export async function incrementResetVerifyAttempts(
  tokenId: string
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const record = await db.passwordResetToken.findUnique({
    where: { id: tokenId },
  });
  if (!record) return { allowed: false, remainingAttempts: 0 };

  const attempts = record.attempts + 1;
  if (attempts >= PASSWORD_RESET_MAX_VERIFY_ATTEMPTS) {
    await db.passwordResetToken.update({
      where: { id: tokenId },
      data: { attempts, usedAt: new Date() },
    });
    return { allowed: false, remainingAttempts: 0 };
  }

  await db.passwordResetToken.update({
    where: { id: tokenId },
    data: { attempts },
  });
  return {
    allowed: true,
    remainingAttempts: PASSWORD_RESET_MAX_VERIFY_ATTEMPTS - attempts,
  };
}

export async function cleanupExpiredResetTokens(): Promise<number> {
  const result = await db.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, usedAt: null },
  });
  return result.count;
}