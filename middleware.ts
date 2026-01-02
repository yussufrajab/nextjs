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
  const severityEmoji = data.severity === 'ERROR' ? '🔴' :
                        data.severity === 'CRITICAL' ? '🚨' : '⚠️';
  console.log(`[Middleware] ${severityEmoji} Blocked unauthorized access [${data.severity || 'WARNING'}]:`, {
    route: data.attemptedRoute,
    role: data.userRole,
    authenticated: data.isAuthenticated,
  });
}

// Import types - using inline types since middleware can't import from @/lib
type Role = "HRO" | "HHRMD" | "HRMO" | "DO" | "EMPLOYEE" | "CSCS" | "HRRP" | "PO" | "Admin" | null;

const ROLES = {
  HRO: 'HRO',
  HHRMD: 'HHRMD',
  HRMO: 'HRMO',
  DO: 'DO',
  EMPLOYEE: 'EMPLOYEE',
  CSCS: 'CSCS',
  HRRP: 'HRRP',
  PO: 'PO',
  ADMIN: 'Admin',
} as const;

interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
}

// Route permission configuration (matches src/lib/route-permissions.ts)
const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  {
    pattern: /^\/dashboard\/admin/,
    allowedRoles: [ROLES.ADMIN as Role],
  },
  // HR Officer routes - HHRMD and HRMO can approve, HRO can submit, CSCS and HRRP can view
  {
    pattern: '/dashboard/urgent-actions',
    allowedRoles: [ROLES.HRO, ROLES.HRRP, ROLES.CSCS],
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
  },
  // Disciplinary actions - HHRMD and DO only, NOT HRMO
  {
    pattern: '/dashboard/termination',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
  },
  {
    pattern: '/dashboard/dismissal',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
  },
  // Complaints - EMPLOYEE submits, DO/HHRMD handle, CSCS views
  {
    pattern: '/dashboard/complaints',
    allowedRoles: [ROLES.EMPLOYEE, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
  },
  // Institution management
  {
    pattern: '/dashboard/institutions',
    allowedRoles: [ROLES.HHRMD, ROLES.CSCS, ROLES.DO, ROLES.HRMO, ROLES.HRRP],
  },
  // Profile access
  {
    pattern: '/dashboard/profile',
    allowedRoles: [ROLES.HRO, ROLES.EMPLOYEE, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO],
  },
  // Tracking and reports - All roles can view their relevant data
  {
    pattern: '/dashboard/track-status',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO, ROLES.EMPLOYEE],
  },
  {
    pattern: '/dashboard/recent-activities',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP],
  },
  {
    pattern: '/dashboard/reports',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO],
  },
  // Dashboard home - accessible to all authenticated users
  {
    pattern: '/dashboard',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.EMPLOYEE, ROLES.CSCS, ROLES.HRRP, ROLES.PO, ROLES.ADMIN as Role],
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
      matches = pathname === permission.pattern || pathname.startsWith(permission.pattern + '/');
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
 */
function parseAuthStorage(cookieValue: string | undefined): { role: Role | null; isAuthenticated: boolean; userId: string | null } {
  if (!cookieValue) {
    return { role: null, isAuthenticated: false, userId: null };
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    const authData = JSON.parse(decoded);

    // Extract state from the Zustand persisted storage format
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/change-password-required') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/employee-login') ||
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

    console.log('[Middleware] Checking access:', { pathname, role, isAuthenticated, userId });

    // Get client info for audit logging
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
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
      console.log('[Middleware] User lacks permission for route:', { pathname, role });

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
