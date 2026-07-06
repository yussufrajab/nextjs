/**
 * Step-up re-authentication
 *
 * For sensitive operations (user delete, role change, password reset, etc.),
 * the user must re-prove identity within the last N minutes. This module
 * implements a short-lived HMAC-signed cookie that carries:
 *   - userId
 *   - scope (which operation the re-auth authorizes)
 *   - issuedAt
 *
 * The cookie is bound to a SCOPE: a re-auth for "users.delete" cannot be
 * reused for "admin.reset-password". The browser stores it in memory
 * (httpOnly, no localStorage).
 *
 * Cookie format (signed): <userId>.<scope>.<issuedAt>.<expiry>.<signature>
 *   - userId:   CUID of the user
 *   - scope:    dotted string, e.g. "users.delete" or "admin.reset-password"
 *   - issuedAt: unix-ms when the re-auth was issued
 *   - expiry:   unix-ms when the re-auth expires (default 5 min)
 *   - signature: base64 HMAC-SHA256 of "<userId>.<scope>.<issuedAt>.<expiry>"
 *
 * The cookie is single-use scoped: the route handler must declare which scope
 * it requires, and a mismatch rejects the request.
 *
 * SESSION_SECRET (or a derived sub-key) is used for HMAC. We derive a separate
 * key via HKDF-style hashing to avoid reusing the same key for two purposes.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const REAUTH_COOKIE_NAME = 'reauth';
export const REAUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required for step-up re-auth');
  }
  // Derive a sub-key so we never reuse the session HMAC key for re-auth
  return createHmac('sha256', secret).update('reauth-v1').digest('base64');
}

export interface ReauthPayload {
  userId: string;
  scope: string;
  issuedAt: number;
  expiry: number;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Issue a re-auth token. The result is a string suitable for the `reauth`
 * cookie value.
 *
 * Format: userId:scope:issuedAt:expiry:signature
 *   - Uses ":" as separator (CUIDs contain only alphanumerics + "_", no colon)
 *   - scope is also colon-free (we use dotted notation like "users.delete")
 */
export function issueReauthToken(userId: string, scope: string, ttlMs: number = REAUTH_TTL_MS): string {
  const issuedAt = Date.now();
  const expiry = issuedAt + ttlMs;
  const payload = `${userId}:${scope}:${issuedAt}:${expiry}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

/**
 * Verify a re-auth cookie value. Returns the payload on success, null on
 * any failure (malformed, expired, bad signature, scope mismatch).
 */
export function verifyReauthToken(
  token: string | null | undefined,
  requiredScope: string
): ReauthPayload | null {
  if (!token) return null;

  const parts = token.split(':');
  if (parts.length !== 5) return null;
  const [userId, scope, issuedAtStr, expiryStr, provided] = parts;

  if (scope !== requiredScope) return null;

  const issuedAt = Number(issuedAtStr);
  const expiry = Number(expiryStr);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry)) return null;

  if (Date.now() > expiry) return null;

  const expected = sign(`${userId}:${scope}:${issuedAt}:${expiry}`);
  if (!safeEqual(provided, expected)) return null;

  return { userId, scope, issuedAt, expiry };
}

/**
 * Cookie options for the reauth cookie. The cookie is:
 *  - httpOnly (not readable by JavaScript)
 *  - sameSite=strict (not sent cross-site)
 *  - path=/ (default)
 *  - secure in production
 *  - maxAge aligned to the token TTL
 */
export function getReauthCookieOptions(isProduction: boolean, ttlSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: ttlSeconds,
  };
}
