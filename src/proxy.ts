import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  verifySessionToken,
  validateSession,
  SESSION_COOKIE_NAME_PROD,
  SESSION_COOKIE_NAME_DEV,
} from '@/lib/session-manager';
import {
  logUnauthorizedAccess,
  logForbiddenRoute,
  safeAuditLog,
} from '@/lib/audit-logger';

/**
 * Next.js Proxy (middleware) for Authentication and Authorization
 *
 * This proxy protects dashboard routes by:
 * 1. Verifying the HMAC-signed `session` cookie (cryptographically unforgeable)
 * 2. Validating that session against the DB Session table (revocation, expiry,
 *    idle timeout) and loading the authoritative User role from the DB
 * 3. Validating the DB-sourced role has permission to access the route
 * 4. Redirecting unauthorized users appropriately
 * 5. Logging all unauthorized access attempts for security auditing
 *
 * SECURITY (Req 2.6 / 3.5): the role used for page gating is read from the
 * DB-validated session, NOT from the client-controlled, forgeable
 * `auth-storage` cookie. The `session` cookie is HttpOnly + HMAC-signed with
 * `SESSION_SECRET`, so an attacker cannot forge a role to reach a dashboard
 * page they are not entitled to.
 *
 * This proxy runs on the Node.js runtime (the Next.js 16 `proxy` file is
 * always Node.js — the edge runtime is not supported for it) so it can import
 * `@/lib` helpers and query the database via Prisma on every dashboard
 * navigation. The DB hit is the price of server-side session validation on
 * every request — the alternative (trusting a client cookie) is insecure.
 */

// Audit logging - store data to be logged after redirect
function logUnauthorizedAttempt(
  request: NextRequest,
  data: {
    userId?: string | null;
    username?: string | null;
    userRole?: string | null;
    attemptedRoute: string;
    blockReason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    isAuthenticated: boolean;
    requestMethod: string;
    severity?: string;
    additionalData?: Record<string, any>;
  }
) {
  // Operational console log (kept for live debugging).
  const severityEmoji =
    data.severity === 'ERROR'
      ? '🔴'
      : data.severity === 'CRITICAL'
        ? '🚨'
        : '⚠️';
  console.log(
    `[Middleware] ${severityEmoji} Blocked unauthorized access [${data.severity || 'WARNING'}]:`,
    {
      route: data.attemptedRoute,
      role: data.userRole,
      authenticated: data.isAuthenticated,
    }
  );

  // SECURITY (Req 15.7 / 17.6): also write the denial to the tamper-evident
  // audit trail so edge-blocks are reconstructable (not console-only). Fire-
  // and-forget — a DB/audit outage must never break the redirect. Authenticated
  // but wrong-role → FORBIDDEN_ROUTE; unauthenticated → UNAUTHORIZED_ACCESS.
  const deviceInfo = data.userAgent ? { userAgent: data.userAgent } : null;
  if (data.isAuthenticated) {
    void safeAuditLog(
      logForbiddenRoute({
        userId: data.userId,
        username: data.username,
        userRole: data.userRole,
        attemptedRoute: data.attemptedRoute,
        ipAddress: data.ipAddress,
        deviceInfo,
        requestMethod: data.requestMethod,
        additionalData: data.additionalData,
      }),
      'proxy:forbidden-route'
    );
  } else {
    void safeAuditLog(
      logUnauthorizedAccess({
        userId: data.userId,
        username: data.username,
        userRole: data.userRole,
        attemptedRoute: data.attemptedRoute,
        blockReason: data.blockReason,
        ipAddress: data.ipAddress,
        deviceInfo,
        isAuthenticated: false,
        requestMethod: data.requestMethod,
        severity: data.severity || 'WARNING',
        additionalData: data.additionalData,
      }),
      'proxy:unauthorized-access'
    );
  }
}

// Local Role union used for route gating. The canonical source is
// `src/lib/route-permissions-config.ts` (single source of truth); this inline
// copy stays in sync with it — see the note on ROUTE_PERMISSIONS below.
type Role =
  | 'HRO'
  | 'HHRMD'
  | 'HRMO'
  | 'DO'
  | 'EMPLOYEE'
  | 'CSCS'
  | 'HRRP'
  | 'PO'
  | 'Admin'
  | 'HRO_PEMBA'
  | 'HRRP_PEMBA'
  | null;

interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
}

/**
 * Route permission configuration.
 * This is a copy of the canonical source in src/lib/route-permissions-config.ts.
 * It is duplicated here (rather than imported) to keep the middleware's route
 * gating explicit and to match the existing CI sync test; the two must be kept
 * in sync. When changing permissions, update BOTH this file AND
 * route-permissions-config.ts. A CI test verifies they stay in sync.
 */
const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  {
    pattern: /^\/dashboard\/admin/,
    allowedRoles: ['Admin' as Role],
  },
  // HR Officer routes
  {
    pattern: '/dashboard/urgent-actions',
    allowedRoles: ['HRO', 'HRRP', 'CSCS', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  // Disciplinary actions
  {
    pattern: '/dashboard/termination',
    allowedRoles: ['HRO', 'DO', 'HHRMD', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/dismissal',
    allowedRoles: ['HRO', 'DO', 'HHRMD', 'CSCS', 'HRO_PEMBA'],
  },
  // Complaints
  {
    pattern: '/dashboard/complaints',
    allowedRoles: ['EMPLOYEE', 'DO', 'HHRMD', 'CSCS'],
  },
  // Institution management
  {
    pattern: '/dashboard/institutions',
    allowedRoles: ['HHRMD', 'CSCS', 'DO', 'HRMO', 'HRRP', 'HRRP_PEMBA'],
  },
  // Manual employee entry
  {
    pattern: '/dashboard/add-employee',
    allowedRoles: ['HRO', 'HRO_PEMBA'],
  },
  // Profile access
  {
    pattern: '/dashboard/profile',
    allowedRoles: ['HRO', 'EMPLOYEE', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  // Tracking and reports
  {
    pattern: '/dashboard/track-status',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'EMPLOYEE', 'PO', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/recent-activities',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  {
    pattern: '/dashboard/reports',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO', 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
  // Dashboard home
  {
    pattern: '/dashboard',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'EMPLOYEE', 'CSCS', 'HRRP', 'PO', 'Admin' as Role, 'HRO_PEMBA', 'HRRP_PEMBA'],
  },
];

/**
 * Check if a user with the given role can access a route
 */
function canAccessRoute(pathname: string, userRole: Role | null): boolean {
  if (!userRole) {
    return false;
  }

  // Find the first matching route permission
  for (const permission of ROUTE_PERMISSIONS) {
    let matches = false;

    if (typeof permission.pattern === 'string') {
      // Exact match or starts with for string patterns
      matches =
        pathname === permission.pattern ||
        pathname.startsWith(permission.pattern + '/');
    } else {
      // RegExp match
      matches = permission.pattern.test(pathname);
    }

    if (matches) {
      return permission.allowedRoles.includes(userRole);
    }
  }

  // If no specific permission found, deny access by default
  return false;
}

/**
 * Read the HMAC-signed `session` cookie from the request.
 *
 * The cookie name depends on NODE_ENV: production uses the `__Host-`-prefixed
 * name (browser-enforced Secure/Path=/ invariant), development uses the plain
 * `session` name (localhost is HTTP, so the `__Host-` prefix is unusable). We
 * try the production name first and fall back to the development name so the
 * same middleware code works in both environments.
 */
function readSignedSessionCookie(request: NextRequest): string | undefined {
  return (
    request.cookies.get(SESSION_COOKIE_NAME_PROD)?.value ??
    request.cookies.get(SESSION_COOKIE_NAME_DEV)?.value
  );
}

/**
 * Validate the request's `session` cookie end-to-end and return the
 * authoritative user identity/role from the database.
 *
 * Steps (mirrors `verifyAuth` in `src/lib/api-auth.ts`, minus the IP/UA
 * binding which is enforced at the API layer where the real client IP is
 * reliably available):
 *   1. Read the HMAC-signed `session` cookie.
 *   2. Verify the HMAC signature + embedded expiry (`verifySessionToken`) —
 *      rejects forged or expired cookies pre-DB.
 *   3. Look the raw token up in the DB Session table (`validateSession`) —
 *      enforces absolute expiry, idle timeout, and revocation (row must
 *      exist), and refreshes `lastActivity`.
 *   4. Confirm the bound User exists and is active; return its role.
 *
 * Returns `{ role, userId, username }` on success, or `null` when the request
 * is unauthenticated / the session is invalid. The caller decides the redirect
 * target.
 */
async function validateRequestSession(
  request: NextRequest
): Promise<{
  role: Role;
  userId: string;
  username: string;
} | null> {
  const signedToken = readSignedSessionCookie(request);
  if (!signedToken) {
    return null;
  }

  // 2. HMAC + embedded-expiry verification (constant-time signature compare).
  const sessionToken = verifySessionToken(signedToken);
  if (!sessionToken) {
    return null;
  }

  // 3. DB validation: revocation, absolute expiry, idle timeout.
  let session: Awaited<ReturnType<typeof validateSession>>;
  try {
    session = await validateSession(sessionToken);
  } catch (error) {
    console.error('[Middleware] Session validation failed:', error);
    return null;
  }

  if (!session) {
    return null;
  }

  // 4. The session row is the source of truth for identity. Load the
  //    authoritative role/active state from the bound User — never trust a
  //    client-supplied claim.
  const user = session.User;
  if (!user || !user.active) {
    return null;
  }

  return {
    role: user.role as Role,
    userId: user.id,
    username: user.username,
  };
}

// Maximum request body size (10MB)
const MAX_BODY_SIZE = 10 * 1024 * 1024;

/**
 * Q14 — Content-Security-Policy (Report-Only).
 *
 * The enforcing CSP is set in `next.config.ts` and still permits 'unsafe-inline'
 * for script-src/style-src. To collect real violation data BEFORE switching to
 * strict enforcement, we additionally emit a stricter nonce-based policy as
 * `Content-Security-Policy-Report-Only`. The browser reports violations to
 * /api/csp-report but does NOT block them, so the running UI is unaffected.
 *
 * The proxy runs on the Node.js runtime. We still generate the nonce with the
 * Web Crypto API (`crypto.getRandomValues`) and base64-encode it with `btoa`
 * — both are globally available in Node.js, and this keeps the CSP helper
 * independent of any specific runtime.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildCspReportOnly(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://www.gstatic.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join('; ');
}

/**
 * Attach the CSP-Report-Only header to a response (per-request nonce) and
 * return the same response so callers can `return withCspReportOnly(res)`.
 */
function withCspReportOnly(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy-Report-Only', buildCspReportOnly(generateNonce()));
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check Content-Length for API routes to prevent oversized payloads
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_BODY_SIZE) {
        return withCspReportOnly(
          NextResponse.json(
            { success: false, message: 'Request body too large' },
            { status: 413 }
          )
        );
      }
    }
  }

  // Allow access to public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/employee-login') ||
    pathname.startsWith('/change-password-required') ||
    pathname.startsWith('/mfa-verify') ||
    pathname.startsWith('/mfa/magic-link-confirm') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/employee-login') ||
    pathname.startsWith('/api/auth/mfa') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico'
  ) {
    return withCspReportOnly(NextResponse.next());
  }

  // Protect all dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // SECURITY (Req 2.6 / 3.5): validate the HMAC-signed `session` cookie
    // against the database and read the role from the DB User row — never from
    // the client-controlled `auth-storage` cookie, which is forgeable.
    const session = await validateRequestSession(request);

    // Get client info for audit logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Unauthenticated / invalid session → redirect to login.
    if (!session) {
      console.log('[Middleware] Invalid or missing session, redirecting to login');

      logUnauthorizedAttempt(request, {
        userId: null,
        username: null,
        userRole: null,
        attemptedRoute: pathname,
        blockReason: 'Invalid or missing session cookie',
        ipAddress,
        userAgent,
        isAuthenticated: false,
        requestMethod: request.method,
        severity: 'WARNING', // Unauthenticated access attempt
      });

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return withCspReportOnly(NextResponse.redirect(loginUrl));
    }

    const { role, userId, username } = session;

    console.log('[Middleware] Checking access:', {
      pathname,
      role,
      userId,
    });

    // Check authorization for the specific route using the DB-sourced role
    const hasAccess = canAccessRoute(pathname, role);

    if (!hasAccess) {
      console.log('[Middleware] User lacks permission for route:', {
        pathname,
        role,
      });

      // Determine severity based on route sensitivity
      // Admin routes are more critical (ERROR), others are WARNING
      const isAdminRoute = pathname.startsWith('/dashboard/admin');
      const severity = isAdminRoute ? 'ERROR' : 'WARNING';

      // Prepare audit data
      const auditData = {
        userId,
        username,
        userRole: role || undefined,
        attemptedRoute: pathname,
        blockReason: `Role "${role}" does not have permission to access "${pathname}"`,
        ipAddress,
        userAgent,
        isAuthenticated: true,
        requestMethod: request.method,
        severity,
      };

      // Log to console
      logUnauthorizedAttempt(request, auditData);

      // Redirect to dashboard with error message and audit data
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized');
      dashboardUrl.searchParams.set('attempted', pathname);
      dashboardUrl.searchParams.set('auditData', JSON.stringify(auditData));
      return withCspReportOnly(NextResponse.redirect(dashboardUrl));
    }

    console.log('[Middleware] Access granted:', { pathname, role });
  }

  // Force no-cache for add-employee page to ensure validation updates are seen immediately
  if (pathname === '/dashboard/add-employee') {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return withCspReportOnly(response);
  }

  return withCspReportOnly(NextResponse.next());
}

// Configure which paths the proxy should run on. The Next.js 16 `proxy` file
// always runs on the Node.js runtime (the edge runtime is not supported for
// it, and a `runtime` key here is rejected), which is what lets us import
// `@/lib` helpers and query the DB via Prisma — required for server-side
// session validation on every dashboard navigation (Req 2.6 / 3.5).
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
