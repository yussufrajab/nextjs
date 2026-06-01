/**
 * Route Permission Configuration
 * Defines which roles can access which routes.
 *
 * The canonical permission list is now in route-permissions-config.ts.
 * This file re-exports it and provides helper functions.
 */

import type { Role } from './types';
import { ROUTE_PERMISSIONS } from './route-permissions-config';

export type { RoutePermission } from './route-permissions-config';
export { ROUTE_PERMISSIONS };

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
