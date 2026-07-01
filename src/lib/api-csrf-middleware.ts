import { NextRequest, NextResponse } from 'next/server';
import {
  validateCSRFTokens,
  requiresCSRFProtection,
  createCSRFError,
  logCSRFViolation,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getClientIp,
} from '@/lib/csrf-utils';
import { csrfLogger } from '@/lib/logger';
import { getAuthContext } from '@/lib/api-auth';

/**
 * CSRF Protection Middleware for API Routes
 *
 * Validates CSRF tokens on state-changing HTTP methods (POST, PUT, PATCH, DELETE)
 * Should be called at the beginning of API route handlers
 */

/**
 * Validate CSRF token for the current request
 *
 * @param request - Next.js request object
 * @returns Object with validation result and response (if validation fails)
 */
export async function validateCSRF(request: NextRequest | Request): Promise<{
  valid: boolean;
  response?: NextResponse;
}> {
  const method = request.method;

  // Skip CSRF validation for safe HTTP methods
  if (!requiresCSRFProtection(method)) {
    return { valid: true };
  }

  // Get CSRF token from cookie and header
  const cookieToken = getCookieToken(request);
  // Header token may be URL-encoded (document.cookie returns URL-encoded values
  // since Next.js response.cookies.set() URL-encodes cookie values)
  const rawHeaderToken = request.headers.get(CSRF_HEADER_NAME) || undefined;
  const headerToken = rawHeaderToken ? safeDecode(rawHeaderToken) : undefined;

  // Validate tokens
  const isValid = validateCSRFTokens(cookieToken, headerToken);

  if (!isValid) {
    // Extract user info for logging (if available from auth cookie)
    const { userId, username } = await extractUserInfo(request);
    const ipAddress = getClientIp(request.headers);
    const deviceInfo = JSON.parse(request.headers.get('x-device-info') || 'null');
    const url =
      request instanceof NextRequest
        ? request.nextUrl.pathname
        : new URL(request.url).pathname;

    // Determine reason for failure
    let reason = 'Unknown';
    if (!cookieToken && !headerToken) {
      reason = 'Missing CSRF tokens (both cookie and header)';
    } else if (!cookieToken) {
      reason = 'Missing CSRF cookie';
    } else if (!headerToken) {
      reason = 'Missing CSRF header';
    } else {
      reason = 'CSRF tokens do not match';
    }

    csrfLogger.warn({
      url,
      method,
      reason,
      userId,
      username,
    }, 'CSRF validation failed');

    // Log CSRF violation to audit trail
    await logCSRFViolation(userId, username, ipAddress, deviceInfo, url, reason);

    // Return error response
    return {
      valid: false,
      response: NextResponse.json(createCSRFError(reason), { status: 403 }),
    };
  }

  return { valid: true };
}

/**
 * Helper to get CSRF token from cookies
 */
function getCookieToken(request: NextRequest | Request): string | undefined {
  if (request instanceof NextRequest) {
    return request.cookies.get(CSRF_COOKIE_NAME)?.value;
  }

  // For standard Request objects, parse Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  const cookies = parseCookies(cookieHeader);
  return cookies[CSRF_COOKIE_NAME];
}

/**
 * Helper to parse cookie header
 * URL-decodes values to match NextRequest.cookies.get() behavior
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.split('=');
      const rawValue = rest.join('=').trim();
      cookies[name.trim()] = safeDecode(rawValue);
      return cookies;
    },
    {} as Record<string, string>
  );
}

/**
 * Safely URL-decode a value, returning the raw value if decoding fails
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Helper to extract user info from the signed session (for logging on CSRF
 * failure). Derives userId/username from verifyAuth — never from the legacy,
 * forgeable auth-storage cookie. Returns nulls when unauthenticated.
 */
async function extractUserInfo(request: NextRequest | Request): Promise<{
  userId: string | null;
  username: string | null;
}> {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx) return { userId: null, username: null };
    return { userId: ctx.userId, username: ctx.username };
  } catch {
    return { userId: null, username: null };
  }
}

/**
 * Wrapper function for easy use in API routes
 * Usage:
 *
 * export async function POST(req: Request) {
 *   const csrfCheck = await withCSRFProtection(req);
 *   if (!csrfCheck.valid) return csrfCheck.response!;
 *
 *   // Your API logic here...
 * }
 */
export async function withCSRFProtection(request: Request | NextRequest) {
  return await validateCSRF(request);
}

/**
 * Higher-order function to wrap API route handlers with CSRF protection
 *
 * Usage:
 * export const POST = withCSRF(async (req: Request) => {
 *   // Your API logic here...
 *   return NextResponse.json({ success: true });
 * });
 */
export function withCSRF<T extends (req: Request) => Promise<NextResponse>>(
  handler: T
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    const csrfCheck = await validateCSRF(req);
    if (!csrfCheck.valid) {
      return csrfCheck.response!;
    }

    return handler(req);
  };
}
