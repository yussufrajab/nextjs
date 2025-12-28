import { randomBytes, createHmac } from 'crypto';

/**
 * CSRF (Cross-Site Request Forgery) Protection Utilities
 *
 * Implements double-submit cookie pattern for CSRF protection:
 * 1. Generate secure random token on login
 * 2. Store token in cookie (readable by JavaScript)
 * 3. Client sends token in request header
 * 4. Server validates cookie matches header
 */

// CSRF token configuration
export const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits
export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_SECRET_ENV = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

/**
 * Generate a cryptographically secure CSRF token
 *
 * @returns Base64-encoded random token
 */
export function generateCSRFToken(): string {
  const tokenBytes = randomBytes(CSRF_TOKEN_LENGTH);
  return tokenBytes.toString('base64');
}

/**
 * Generate a signed CSRF token for additional security
 * Uses HMAC to sign the token with a secret
 *
 * @param token - Original CSRF token
 * @returns Signed token (token.signature)
 */
export function signCSRFToken(token: string): string {
  const hmac = createHmac('sha256', CSRF_SECRET_ENV);
  hmac.update(token);
  const signature = hmac.digest('base64');
  return `${token}.${signature}`;
}

/**
 * Verify a signed CSRF token
 *
 * @param signedToken - Token with signature (token.signature)
 * @returns True if signature is valid
 */
export function verifyCSRFToken(signedToken: string): boolean {
  try {
    const parts = signedToken.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [token, providedSignature] = parts;

    // Generate expected signature
    const hmac = createHmac('sha256', CSRF_SECRET_ENV);
    hmac.update(token);
    const expectedSignature = hmac.digest('base64');

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(providedSignature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('[CSRF] Token verification error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Validate CSRF token from request
 * Compares cookie value with header value
 *
 * @param cookieToken - Token from cookie
 * @param headerToken - Token from request header
 * @returns True if tokens match and are valid
 */
export function validateCSRFTokens(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  // Both must be present
  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Missing CSRF token:', {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken
    });
    return false;
  }

  // Verify signature of cookie token
  if (!verifyCSRFToken(cookieToken)) {
    console.warn('[CSRF] Invalid cookie token signature');
    return false;
  }

  // Cookie and header must match exactly
  if (cookieToken !== headerToken) {
    console.warn('[CSRF] Cookie and header tokens do not match');
    return false;
  }

  return true;
}

/**
 * Check if HTTP method requires CSRF protection
 * GET, HEAD, OPTIONS are safe methods that don't modify state
 */
export function requiresCSRFProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Get CSRF token cookie options
 */
export function getCSRFCookieOptions(isProduction: boolean = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: false, // JavaScript needs to read this token
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict' as const, // Prevent cross-site sending
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days (same as session)
  };
}

/**
 * Create a CSRF error response
 */
export function createCSRFError(reason: string) {
  return {
    success: false,
    message: 'CSRF token validation failed',
    error: 'CSRF_VALIDATION_FAILED',
    details: process.env.NODE_ENV === 'development' ? reason : undefined,
  };
}

/**
 * Extract client IP address from request headers
 * (Re-exported for convenience, also available in audit-logger)
 */
export function getClientIp(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    null
  );
}

/**
 * Log CSRF validation failure for security monitoring
 */
export async function logCSRFViolation(
  userId: string | null,
  username: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  attemptedRoute: string,
  reason: string
): Promise<void> {
  try {
    // Import audit logger (dynamic to avoid circular dependencies)
    const { logAuditEvent, AuditEventCategory, AuditSeverity } = await import('@/lib/audit-logger');

    await logAuditEvent({
      eventType: 'CSRF_VIOLATION',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.WARNING,
      userId,
      username,
      userRole: null,
      ipAddress,
      userAgent,
      attemptedRoute,
      requestMethod: 'POST', // Assume POST for CSRF violations
      isAuthenticated: !!userId,
      wasBlocked: true,
      blockReason: `CSRF token validation failed: ${reason}`,
      additionalData: {
        csrfViolationType: reason,
      },
    });
  } catch (error) {
    console.error('[CSRF] Failed to log CSRF violation:', error);
  }
}
