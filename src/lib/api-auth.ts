/**
 * API Authentication Wrapper
 *
 * Provides verifyAuth() and withAuth() for protecting Next.js API routes.
 * Reads the HMAC-signed session token from the HttpOnly `session` cookie,
 * verifies the signature, validates the raw token against the DB Session
 * table via validateSession(), then looks up the User by the session row's
 * userId. The client-controlled `auth-storage` cookie is NOT used for
 * identity — only the DB session row is authoritative.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authLogger } from '@/lib/logger';
import { markSessionSuspicious, SESSION_COOKIE_NAME, SESSION_COOKIE_NAME_PROD, SESSION_COOKIE_NAME_DEV, verifySessionToken, validateSession } from '@/lib/session-manager';
import { getClientIp, logAccessDenied, logForbiddenRoute } from '@/lib/audit-logger';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import { verifyReauthToken, REAUTH_COOKIE_NAME } from '@/lib/reauth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContext {
  userId: string;
  role: string;
  institutionId: string | null;
  username: string;
}

export interface AuthResult {
  authenticated: boolean;
  context?: AuthContext;
  response?: NextResponse;
}

export interface WithAuthOptions {
  /** If provided, only these roles are allowed to access the route. */
  allowedRoles?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Factory functions instead of module-level constants.
// NextResponse bodies are ReadableStreams that can only be consumed once.
// Reusing a single instance across requests causes the body to be empty after
// the first request, resulting in "JSON.parse: unexpected end of data" errors
// on the client.
function unauthenticated(): AuthResult {
  return {
    authenticated: false,
    response: NextResponse.json(
      { success: false, error: 'Authentication required', errorCode: 'UNAUTHENTICATED' },
      { status: 401 }
    ),
  };
}

function invalidSession(): AuthResult {
  return {
    authenticated: false,
    response: NextResponse.json(
      { success: false, error: 'Invalid or expired session', errorCode: 'INVALID_SESSION' },
      { status: 401 }
    ),
  };
}

function forbidden(): AuthResult {
  return {
    authenticated: false,
    response: NextResponse.json(
      { success: false, error: 'Insufficient permissions', errorCode: 'FORBIDDEN' },
      { status: 403 }
    ),
  };
}

// ---------------------------------------------------------------------------
// verifyAuth
// ---------------------------------------------------------------------------

/**
 * Verify authentication from the request's signed `session` cookie.
 *
 * Supports both `NextRequest` (App Router) and plain `Request` objects.
 * After verifying the session against the DB, the function checks that the
 * user still exists and is active.
 */
export async function verifyAuth(
  request: NextRequest | Request
): Promise<AuthResult> {
  // 1. Read the signed `session` cookie (HttpOnly) ------------------------
  // SECURITY: the cookie name depends on NODE_ENV (prod uses `__Host-session`
  // to prevent subdomain cookie-injection; dev uses plain `session`).
  let signedSessionToken: string | undefined;

  if (request instanceof NextRequest && 'cookies' in request) {
    // Try the prod name first, then the dev name. This allows the same code
    // to read cookies in either environment.
    const prodVal = request.cookies.get(SESSION_COOKIE_NAME_PROD)?.value;
    const devVal = request.cookies.get(SESSION_COOKIE_NAME_DEV)?.value;
    if (process.env.DEBUG_AUTH) {
      authLogger.warn(
        { prod: prodVal?.substring(0, 10), dev: devVal?.substring(0, 10) },
        'verifyAuth cookies'
      );
    }
    signedSessionToken = prodVal ?? devVal;
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // Match either cookie name (prod or dev)
      const match =
        cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME_PROD}=([^;]+)`)) ??
        cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME_DEV}=([^;]+)`));
      if (match) {
        signedSessionToken = match[1];
      }
    }
  }

  if (!signedSessionToken) {
    return unauthenticated();
  }

  // 2. Verify the HMAC signature and extract the raw token ----------------
  const sessionToken = verifySessionToken(signedSessionToken);
  if (!sessionToken) {
    return invalidSession();
  }

  // 3. Validate the session against the DB --------------------------------
  let session: Awaited<ReturnType<typeof validateSession>>;
  try {
    session = await validateSession(sessionToken);
  } catch (error) {
    authLogger.error({ err: error }, 'Session validation failed');
    return invalidSession();
  }

  if (!session) {
    return invalidSession();
  }

  // 3b. Per-request IP/User-Agent binding check (session hijacking protection) -
  const requestIp = getClientIp(request.headers);

  // Compare IP if both values are available
  if (requestIp && session.ipAddress && requestIp !== session.ipAddress) {
    authLogger.warn({
      sessionId: session.id,
      userId: session.userId,
      expectedIp: session.ipAddress,
      actualIp: requestIp,
    }, 'Session hijacking detected: IP mismatch');
    await markSessionSuspicious(session.id);
    return invalidSession();
  }

  // Compare User-Agent if both values are available
  const requestUserAgent = request.headers.get('user-agent');
  if (requestUserAgent && session.userAgent && requestUserAgent !== session.userAgent) {
    authLogger.warn({
      sessionId: session.id,
      userId: session.userId,
      expectedUA: session.userAgent,
      actualUA: requestUserAgent,
    }, 'Session hijacking detected: User-Agent mismatch');
    await markSessionSuspicious(session.id);
    return invalidSession();
  }

  // 4. Look up the user by the SESSION's userId (authoritative) -----------
  const userId = session.userId;

  let user: { id: string; active: boolean; role: string; institutionId: string | null; username: string } | null;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, role: true, institutionId: true, username: true },
    });

    if (!user || !user.active) {
      return invalidSession();
    }
  } catch (error) {
    authLogger.error({ err: error }, 'Database error during auth verification');
    return invalidSession();
  }

  // 5. Success -------------------------------------------------------------
  return {
    authenticated: true,
    context: {
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
      username: user.username,
    },
  };
}

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

type HandlerFn = (
  request: NextRequest | Request,
  ctx: { auth: AuthContext }
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps an API route handler with authentication
 * and optional role-based access control.
 *
 * @example
 * ```ts
 * // Any authenticated user
 * export const GET = withAuth(async (req, { auth }) => {
 *   return NextResponse.json({ userId: auth.userId });
 * });
 *
 * // Only admins
 * export const DELETE = withAuth(
 *   async (req, { auth }) => {
 *     // ...
 *   },
 *   { allowedRoles: ['Admin'] }
 * );
 * ```
 */
export function withAuth(
  handler: HandlerFn,
  options?: WithAuthOptions
): (request: NextRequest | Request) => Promise<NextResponse> {
  return async (request) => {
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated) {
      // SECURITY: Log unauthenticated access attempts to audit trail
      const url = new URL(request.url);
      logAccessDenied({
        userId: null,
        username: null,
        userRole: null,
        attemptedRoute: url.pathname,
        blockReason: 'UNAUTHENTICATED',
        ipAddress: getClientIp(request.headers),
        requestMethod: request.method,
      }).catch(() => {}); // fail-safe: never break the request flow

      return authResult.response!;
    }

    // Role check (case-insensitive to handle casing mismatches between
    // ROLES constants and allowedRoles arrays)
    if (options?.allowedRoles?.length) {
      const roleUpper = authResult.context!.role.toUpperCase();
      const allowedUpper = options.allowedRoles.map(r => r.toUpperCase());
      if (!allowedUpper.includes(roleUpper)) {
        // SECURITY: Log role violation to audit trail
        const url = new URL(request.url);
        logForbiddenRoute({
          userId: authResult.context!.userId,
          username: authResult.context!.username,
          userRole: authResult.context!.role,
          attemptedRoute: url.pathname,
          ipAddress: getClientIp(request.headers),
          requestMethod: request.method,
          additionalData: {
            requiredRoles: options.allowedRoles,
            actualRole: authResult.context!.role,
          },
        }).catch(() => {}); // fail-safe

        return forbidden().response!;
      }
    }

    // SECURITY: CSRF protection for state-changing methods
    // All authenticated POST/PUT/PATCH/DELETE requests must include a valid CSRF token
    const method = request.method?.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      const csrfResult = await validateCSRF(request);
      if (!csrfResult.valid) {
        authLogger.warn({
          userId: authResult.context!.userId,
          method,
          url: request.url,
        }, 'CSRF validation failed for authenticated request');
        return csrfResult.response!;
      }
    }

    return handler(request, { auth: authResult.context! });
  };
}

// ---------------------------------------------------------------------------
// getAuthContext (audit/logging attribution)
// ---------------------------------------------------------------------------

/**
 * Best-effort authoritative auth context for audit/logging attribution.
 *
 * Returns the userId/username/role derived from the signed `session` cookie
 * via verifyAuth, or null when the request is unauthenticated. Use this
 * instead of parsing the legacy, forgeable `auth-storage` cookie for audit
 * context (who performed an action). This does NOT enforce authorization —
 * it is for attribution only; routes that need to gate access must use
 * withAuth/verifyAuth directly.
 */
export async function getAuthContext(
  request: NextRequest | Request
): Promise<{ userId: string; username: string; role: string } | null> {
  const result = await verifyAuth(request);
  if (!result.authenticated || !result.context) return null;
  return {
    userId: result.context.userId,
    username: result.context.username,
    role: result.context.role,
  };
}

// ---------------------------------------------------------------------------
// requireReauth (step-up re-authentication for sensitive actions)
// ---------------------------------------------------------------------------

/**
 * Enforce step-up re-authentication on a sensitive action.
 *
 * Reads the HMAC-signed `reauth` cookie, verifies it against `requiredScope`,
 * and binds the token's userId to the authenticated session's userId (so a
 * re-auth token issued to user A cannot be replayed by a hijacked session of
 * user B).
 *
 * Returns `null` when step-up re-auth is satisfied (caller may proceed), or a
 * `NextResponse` with `{ errorCode: 'REAUTH_REQUIRED', requiredScope }` and
 * status 401 when it is not. The 401 (not 403) lets the frontend distinguish
 * "you may do this, but re-prove your identity first" from "you are not
 * allowed at all".
 *
 * Usage inside a `withAuth` handler:
 * ```ts
 * export const DELETE = withAuth(async (req, { auth }) => {
 *   const denied = requireReauth(req, 'users.delete', auth);
 *   if (denied) return denied;
 *   // ... perform the sensitive action
 * }, { allowedRoles: ['Admin'] });
 * ```
 */
export function requireReauth(
  request: NextRequest | Request,
  requiredScope: string,
  auth: { userId: string; username: string; role: string }
): NextResponse | null {
  // Read the `reauth` cookie (httpOnly, sameSite=strict) -------------------
  let reauthToken: string | undefined;
  if (request instanceof NextRequest && 'cookies' in request) {
    reauthToken = request.cookies.get(REAUTH_COOKIE_NAME)?.value;
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${REAUTH_COOKIE_NAME}=([^;]+)`));
      if (match) {
        reauthToken = match[1];
      }
    }
  }

  const payload = verifyReauthToken(reauthToken, requiredScope);

  // Reject if the token is absent/invalid/expired/wrong-scope, or if it was
  // issued to a different user than the current authenticated session. The
  // userId binding prevents replay across accounts.
  if (!payload || payload.userId !== auth.userId) {
    const url = new URL(request.url);
    logAccessDenied({
      userId: auth.userId,
      username: auth.username,
      userRole: auth.role,
      attemptedRoute: url.pathname,
      blockReason: 'REAUTH_REQUIRED',
      ipAddress: getClientIp(request.headers),
      requestMethod: request.method,
      additionalData: { requiredScope },
    }).catch(() => {}); // fail-safe: never break the request flow

    return NextResponse.json(
      {
        success: false,
        error: 'Re-authentication required for this action',
        errorCode: 'REAUTH_REQUIRED',
        requiredScope,
      },
      { status: 401 }
    );
  }

  return null;
}