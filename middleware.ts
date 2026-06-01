import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Authentication and Authorization
 *
 * This middleware protects dashboard routes by:
 * 1. Checking if user is authenticated
 * 2. Validating user role has permission to access the route
 * 3. Redirecting unauthorized users appropriately
 * 4. Logging all unauthorized access attempts for security auditing
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
  }
) {
  // Data will be passed via URL params and logged on the client side
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
}

// Import types - using inline types since middleware can't import from @/lib
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
  | null;

interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
}

/**
 * Route permission configuration.
 * This is a copy of the canonical source in src/lib/route-permissions-config.ts.
 * Middleware cannot import from @/lib due to Next.js edge runtime constraints,
 * so this list must be kept in sync manually.
 *
 * When changing permissions, update BOTH this file AND route-permissions-config.ts.
 * A CI test verifies they stay in sync.
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
    allowedRoles: ['HRO', 'HRRP', 'CSCS'],
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'],
  },
  // Disciplinary actions
  {
    pattern: '/dashboard/termination',
    allowedRoles: ['HRO', 'DO', 'HHRMD', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/dismissal',
    allowedRoles: ['HRO', 'DO', 'HHRMD', 'CSCS'],
  },
  // Complaints
  {
    pattern: '/dashboard/complaints',
    allowedRoles: ['EMPLOYEE', 'DO', 'HHRMD', 'CSCS'],
  },
  // Institution management
  {
    pattern: '/dashboard/institutions',
    allowedRoles: ['HHRMD', 'CSCS', 'DO', 'HRMO', 'HRRP'],
  },
  // Manual employee entry
  {
    pattern: '/dashboard/add-employee',
    allowedRoles: ['HRO'],
  },
  // Profile access
  {
    pattern: '/dashboard/profile',
    allowedRoles: ['HRO', 'EMPLOYEE', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO'],
  },
  // Tracking and reports
  {
    pattern: '/dashboard/track-status',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'EMPLOYEE', 'PO'],
  },
  {
    pattern: '/dashboard/recent-activities',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP'],
  },
  {
    pattern: '/dashboard/reports',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO'],
  },
  // Dashboard home
  {
    pattern: '/dashboard',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'EMPLOYEE', 'CSCS', 'HRRP', 'PO', 'Admin' as Role],
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
 * Parse and validate the auth-storage cookie
 * Supports both the new server-set format and the legacy client-set format
 */
function parseAuthStorage(cookieValue: string | undefined): {
  role: Role | null;
  isAuthenticated: boolean;
  userId: string | null;
} {
  if (!cookieValue) {
    return { role: null, isAuthenticated: false, userId: null };
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    const authData = JSON.parse(decoded);

    // New server-set format: { userId, role, username, institutionId, isAuthenticated }
    if (authData.userId && authData.role && !authData.state) {
      return {
        role: authData.role as Role,
        isAuthenticated: authData.isAuthenticated === true,
        userId: authData.userId,
      };
    }

    // Legacy client-set format: { state: { user: { id, role }, role, isAuthenticated } }
    const state = authData.state || authData;

    return {
      role: state.role || state.user?.role || null,
      isAuthenticated: state.isAuthenticated || false,
      userId: state.user?.id || null,
    };
  } catch (error) {
    console.error('Failed to parse auth-storage cookie:', error);
    return { role: null, isAuthenticated: false, userId: null };
  }
}

// Maximum request body size (10MB)
const MAX_BODY_SIZE = 10 * 1024 * 1024;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check Content-Length for API routes to prevent oversized payloads
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_BODY_SIZE) {
        return NextResponse.json(
          { success: false, message: 'Request body too large' },
          { status: 413 }
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
    return NextResponse.next();
  }

  // Protect all dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // Get auth state from cookie (Zustand persist stores to localStorage,
    // but we also set a cookie for middleware)
    const authCookie = request.cookies.get('auth-storage')?.value;
    const { role, isAuthenticated, userId } = parseAuthStorage(authCookie);

    console.log('[Middleware] Checking access:', {
      pathname,
      role,
      isAuthenticated,
      userId,
    });

    // Get client info for audit logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Check authentication
    if (!isAuthenticated || !userId) {
      console.log('[Middleware] User not authenticated, redirecting to login');

      // Log unauthorized access attempt (unauthenticated)
      logUnauthorizedAttempt(request, {
        userId: null,
        username: null,
        userRole: null,
        attemptedRoute: pathname,
        blockReason: 'User not authenticated',
        ipAddress,
        userAgent,
        isAuthenticated: false,
        requestMethod: request.method,
        severity: 'WARNING', // Unauthenticated access attempt
      });

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check authorization for the specific route
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
        username: role, // We only have role from cookie, not username
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
      return NextResponse.redirect(dashboardUrl);
    }

    console.log('[Middleware] Access granted:', { pathname, role });
  }

  // Force no-cache for add-employee page to ensure validation updates are seen immediately
  if (pathname === '/dashboard/add-employee') {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
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
