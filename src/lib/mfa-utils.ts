import crypto from 'crypto';
import { db } from '@/lib/db';

const MFA_TOKEN_EXPIRY_MINUTES = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 10;
const MFA_OTP_RATE_LIMIT_SECONDS = Number(process.env.MFA_OTP_RATE_LIMIT_SECONDS) || 60;
const MFA_OTP_RATE_LIMIT_MAX_REQUESTS = Number(process.env.MFA_OTP_RATE_LIMIT_MAX_REQUESTS) || 3;
const MFA_OTP_MAX_VERIFY_ATTEMPTS = Number(process.env.MFA_OTP_MAX_VERIFY_ATTEMPTS) || 5;

export function generateOtpToken(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export async function createMfaToken(
  userId: string,
  tokenType: 'OTP' | 'MAGIC_LINK',
  email: string,
  ipAddress: string | null,
  userAgent: string | null,
  expiryMinutes?: number
): Promise<{ token: string; expiresAt: Date }> {
  // Invalidate existing unused tokens of the same type for this user
  await db.mfaToken.updateMany({
    where: {
      userId,
      tokenType,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const token = tokenType === 'OTP' ? generateOtpToken() : generateMagicLinkToken();
  const expiresAt = new Date(Date.now() + (expiryMinutes ?? MFA_TOKEN_EXPIRY_MINUTES) * 60 * 1000);

  await db.mfaToken.create({
    data: {
      userId,
      token,
      tokenType,
      email,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { token, expiresAt };
}

export async function verifyMfaToken(
  token: string,
  tokenType: 'OTP' | 'MAGIC_LINK'
): Promise<{ valid: boolean; userId: string; email: string; reason?: string }> {
  const mfaToken = await db.mfaToken.findUnique({
    where: { token },
  });

  if (!mfaToken) {
    return { valid: false, userId: '', email: '', reason: 'Token not found' };
  }

  if (mfaToken.tokenType !== tokenType) {
    return { valid: false, userId: mfaToken.userId, email: mfaToken.email, reason: 'Token type mismatch' };
  }

  if (mfaToken.usedAt) {
    return { valid: false, userId: mfaToken.userId, email: mfaToken.email, reason: 'Token already used' };
  }

  if (new Date() > mfaToken.expiresAt) {
    return { valid: false, userId: mfaToken.userId, email: mfaToken.email, reason: 'Token expired' };
  }

  // Mark token as used
  await db.mfaToken.update({
    where: { id: mfaToken.id },
    data: { usedAt: new Date() },
  });

  return { valid: true, userId: mfaToken.userId, email: mfaToken.email };
}

export async function checkOtpRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = new Date(Date.now() - MFA_OTP_RATE_LIMIT_SECONDS * 1000);

  const recentCount = await db.mfaToken.count({
    where: {
      userId,
      tokenType: 'OTP',
      createdAt: { gte: windowStart },
    },
  });

  if (recentCount >= MFA_OTP_RATE_LIMIT_MAX_REQUESTS) {
    // Find the most recent token to calculate retry time
    const mostRecent = await db.mfaToken.findFirst({
      where: {
        userId,
        tokenType: 'OTP',
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    const retryAfterSeconds = mostRecent
      ? Math.ceil((mostRecent.createdAt.getTime() + MFA_OTP_RATE_LIMIT_SECONDS * 1000 - Date.now()) / 1000)
      : MFA_OTP_RATE_LIMIT_SECONDS;

    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 0) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function incrementOtpVerifyAttempts(
  tokenId: string
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const mfaToken = await db.mfaToken.findUnique({ where: { id: tokenId } });

  if (!mfaToken) {
    return { allowed: false, remainingAttempts: 0 };
  }

  const newAttempts = mfaToken.attempts + 1;

  if (newAttempts >= MFA_OTP_MAX_VERIFY_ATTEMPTS) {
    // Invalidate the token
    await db.mfaToken.update({
      where: { id: tokenId },
      data: { attempts: newAttempts, usedAt: new Date() },
    });
    return { allowed: false, remainingAttempts: 0 };
  }

  await db.mfaToken.update({
    where: { id: tokenId },
    data: { attempts: newAttempts },
  });

  return { allowed: true, remainingAttempts: MFA_OTP_MAX_VERIFY_ATTEMPTS - newAttempts };
}

export async function cleanupExpiredMfaTokens(): Promise<number> {
  const result = await db.mfaToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      usedAt: null,
    },
  });
  return result.count;
}