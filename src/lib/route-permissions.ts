/**
 * Route Permission Configuration
 * Defines which roles can access which routes
 */

import type { Role } from './types';
import { ROLES } from './constants';

export interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
  description?: string;
}

/**
 * Route permission configuration
 * Routes are matched in order - first match wins
 * More specific routes should come before more general ones
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  {
    pattern: /^\/dashboard\/admin/,
    allowedRoles: [ROLES.ADMIN as Role],
    description: 'Admin management pages',
  },

  // HR Officer routes - HHRMD and HRMO can approve, HRO can submit
  {
    pattern: '/dashboard/urgent-actions',
    allowedRoles: [ROLES.HRO, ROLES.HRRP, ROLES.CSCS],
    description: 'Urgent actions page',
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Employee confirmation - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Leave without pay - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Promotions - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Change of cadre - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Retirement - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Resignation - HRO submits, HHRMD/HRMO approve',
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Service extension - HRO submits, HHRMD/HRMO approve',
  },

  // Disciplinary actions - HHRMD and DO only, NOT HRMO
  {
    pattern: '/dashboard/termination',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
    description: 'Termination - HRO submits, DO/HHRMD approve',
  },
  {
    pattern: '/dashboard/dismissal',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
    description: 'Dismissal - HRO submits, DO/HHRMD approve',
  },

  // Complaints - EMPLOYEE submits, DO/HHRMD handle
  {
    pattern: '/dashboard/complaints',
    allowedRoles: [ROLES.EMPLOYEE, ROLES.DO, ROLES.HHRMD, ROLES.CSCS],
    description: 'Complaints - EMPLOYEE submits, DO/HHRMD handle',
  },

  // Institution management
  {
    pattern: '/dashboard/institutions',
    allowedRoles: [ROLES.HHRMD, ROLES.CSCS, ROLES.DO, ROLES.HRMO, ROLES.HRRP],
    description: 'Institutions',
  },

  // Profile access
  {
    pattern: '/dashboard/profile',
    allowedRoles: [
      ROLES.HRO,
      ROLES.EMPLOYEE,
      ROLES.HHRMD,
      ROLES.HRMO,
      ROLES.DO,
      ROLES.CSCS,
      ROLES.HRRP,
    ],
    description: 'Employee profiles',
  },

  // Tracking and reports - All roles can view their relevant data
  {
    pattern: '/dashboard/track-status',
    allowedRoles: [
      ROLES.HRO,
      ROLES.HHRMD,
      ROLES.HRMO,
      ROLES.DO,
      ROLES.CSCS,
      ROLES.HRRP,
      ROLES.EMPLOYEE,
    ],
    description: 'Track status of submitted requests',
  },
  {
    pattern: '/dashboard/recent-activities',
    allowedRoles: [
      ROLES.HRO,
      ROLES.HHRMD,
      ROLES.HRMO,
      ROLES.DO,
      ROLES.CSCS,
      ROLES.HRRP,
    ],
    description: 'Recent activities overview',
  },
  {
    pattern: '/dashboard/reports',
    allowedRoles: [
      ROLES.HRO,
      ROLES.HHRMD,
      ROLES.HRMO,
      ROLES.DO,
      ROLES.CSCS,
      ROLES.HRRP,
      ROLES.PO,
    ],
    description: 'System-wide reports and analytics - PO has read-only access',
  },

  // Dashboard home - accessible to all authenticated users
  {
    pattern: '/dashboard',
    allowedRoles: [
      ROLES.HRO,
      ROLES.HHRMD,
      ROLES.HRMO,
      ROLES.DO,
      ROLES.EMPLOYEE,
      ROLES.CSCS,
      ROLES.HRRP,
      ROLES.PO,
      ROLES.ADMIN as Role,
    ],
    description: 'Dashboard home',
  },
];

/**
 * Check if a user with the given role can access a route
 */
export function canAccessRoute(
  pathname: string,
  userRole: Role | null
): boolean {
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
 * Get the allowed roles for a route
 */
export function getAllowedRolesForRoute(pathname: string): Role[] {
  for (const permission of ROUTE_PERMISSIONS) {
    let matches = false;

    if (typeof permission.pattern === 'string') {
      matches =
        pathname === permission.pattern ||
        pathname.startsWith(permission.pattern + '/');
    } else {
      matches = permission.pattern.test(pathname);
    }

    if (matches) {
      return permission.allowedRoles;
    }
  }

  return [];
}
