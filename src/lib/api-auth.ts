/**
 * API Authentication Wrapper
 *
 * Provides verifyAuth() and withAuth() for protecting Next.js API routes.
 * Reads auth state from the `auth-storage` cookie set by the Zustand auth store,
 * verifies the user still exists and is active in the database, and optionally
 * enforces role-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authLogger } from '@/lib/logger';

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
 * Verify authentication from the request's `auth-storage` cookie.
 *
 * Supports both `NextRequest` (App Router) and plain `Request` objects.
 * After parsing the cookie the function checks that the user still exists
 * and is active in the database.
 */
export async function verifyAuth(
  request: NextRequest | Request
): Promise<AuthResult> {
  // 1. Read the auth-storage cookie ------------------------------------------
  let cookieValue: string | undefined;

  if (request instanceof NextRequest) {
    cookieValue = request.cookies.get('auth-storage')?.value;
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/auth-storage=([^;]+)/);
      if (match) {
        cookieValue = match[1];
      }
    }
  }

  if (!cookieValue) {
    return unauthenticated();
  }

  // 2. Parse JSON from cookie ------------------------------------------------
  let parsed: any;
  try {
    const decoded = decodeURIComponent(cookieValue);
    parsed = JSON.parse(decoded);
  } catch {
    return invalidSession();
  }

  const state = parsed.state || parsed;

  // 3. Extract auth fields ---------------------------------------------------
  // Support both:
  //   New server-set format: { userId, role, username, institutionId, isAuthenticated }
  //   Legacy format:         { state: { user: { id, role, institutionId, username } } }
  const userId: string | undefined = state.user?.id || state.userId;
  const role: string | undefined = state.user?.role || state.role;
  const institutionId: string | null = state.user?.institutionId ?? state.institutionId ?? null;
  const username: string | undefined = state.user?.username || state.username;

  if (!userId || !role) {
    return invalidSession();
  }

  // 4. Verify user exists and is active in database --------------------------
  let user: { id: string; active: boolean; role: string; institutionId: string | null } | null;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, role: true, institutionId: true },
    });

    if (!user || !user.active) {
      return invalidSession();
    }
  } catch (error) {
    authLogger.error({ err: error }, 'Database error during auth verification');
    return invalidSession();
  }

  // 5. Success ---------------------------------------------------------------
  // Use institutionId from cookie if available, fall back to database value
  // Must guard against null vs undefined: cookie may explicitly set null
  const resolvedInstitutionId = institutionId !== undefined ? institutionId : (user.institutionId ?? null);
  return {
    authenticated: true,
    context: {
      userId,
      role: user.role,
      institutionId: resolvedInstitutionId,
      username: username || '',
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
      return authResult.response!;
    }

    // Role check (case-insensitive to handle casing mismatches between
    // ROLES constants and allowedRoles arrays)
    if (options?.allowedRoles?.length) {
      const roleUpper = authResult.context!.role.toUpperCase();
      const allowedUpper = options.allowedRoles.map(r => r.toUpperCase());
      if (!allowedUpper.includes(roleUpper)) {
        return forbidden().response!;
      }
    }

    return handler(request, { auth: authResult.context! });
  };
}