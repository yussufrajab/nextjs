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
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || undefined;

  // Validate tokens
  const isValid = validateCSRFTokens(cookieToken, headerToken);

  if (!isValid) {
    // Extract user info for logging (if available from auth cookie)
    const { userId, username } = extractUserInfo(request);
    const ipAddress = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent');
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

    console.warn('[CSRF] Validation failed:', {
      url,
      method,
      reason,
      userId,
      username,
    });

    // Log CSRF violation to audit trail
    await logCSRFViolation(userId, username, ipAddress, userAgent, url, reason);

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
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.split('=');
      cookies[name.trim()] = rest.join('=').trim();
      return cookies;
    },
    {} as Record<string, string>
  );
}

/**
 * Helper to extract user info from auth cookie (for logging)
 */
function extractUserInfo(request: NextRequest | Request): {
  userId: string | null;
  username: string | null;
} {
  try {
    let authCookie: string | undefined;

    if (request instanceof NextRequest) {
      authCookie = request.cookies.get('auth-storage')?.value;
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        authCookie = cookies['auth-storage'];
      }
    }

    if (!authCookie) {
      return { userId: null, username: null };
    }

    const decoded = decodeURIComponent(authCookie);
    const authData = JSON.parse(decoded);
    const state = authData.state || authData;

    return {
      userId: state.user?.id || null,
      username: state.user?.username || null,
    };
  } catch (error) {
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
