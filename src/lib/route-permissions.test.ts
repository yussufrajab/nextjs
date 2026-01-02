/**
 * Unit Tests for Route Permissions (RBAC)
 *
 * Testing role-based access control for application routes
 */

import { describe, it, expect } from 'vitest';
import {
  canAccessRoute,
  getAllowedRolesForRoute,
  ROUTE_PERMISSIONS,
} from './route-permissions';
import { ROLES } from './constants';
import type { Role } from './types';

describe('route-permissions', () => {
  // =============================================================================
  // Route Permissions Configuration
  // =============================================================================

  describe('ROUTE_PERMISSIONS', () => {
    it('should have route permissions defined', () => {
      expect(ROUTE_PERMISSIONS).toBeDefined();
      expect(Array.isArray(ROUTE_PERMISSIONS)).toBe(true);
      expect(ROUTE_PERMISSIONS.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each permission', () => {
      ROUTE_PERMISSIONS.forEach((permission) => {
        expect(permission.pattern).toBeDefined();
        expect(permission.allowedRoles).toBeDefined();
        expect(Array.isArray(permission.allowedRoles)).toBe(true);
        expect(permission.allowedRoles.length).toBeGreaterThan(0);
      });
    });

    it('should have either string or RegExp patterns', () => {
      ROUTE_PERMISSIONS.forEach((permission) => {
        const isStringOrRegExp =
          typeof permission.pattern === 'string' ||
          permission.pattern instanceof RegExp;
        expect(isStringOrRegExp).toBe(true);
      });
    });
  });

  // =============================================================================
  // canAccessRoute Function
  // =============================================================================

  describe('canAccessRoute', () => {
    describe('Null/Invalid Role Handling', () => {
      it('should deny access for null role', () => {
        expect(canAccessRoute('/dashboard', null)).toBe(false);
        expect(canAccessRoute('/dashboard/profile', null)).toBe(false);
      });

      it('should deny access for undefined role', () => {
        expect(canAccessRoute('/dashboard', undefined as any)).toBe(false);
      });
    });

    describe('Admin Routes', () => {
      it('should allow Admin to access admin routes', () => {
        expect(canAccessRoute('/dashboard/admin', ROLES.ADMIN as Role)).toBe(
          true
        );
        expect(
          canAccessRoute('/dashboard/admin/users', ROLES.ADMIN as Role)
        ).toBe(true);
        expect(
          canAccessRoute('/dashboard/admin/settings', ROLES.ADMIN as Role)
        ).toBe(true);
      });

      it('should deny non-Admin users from admin routes', () => {
        expect(canAccessRoute('/dashboard/admin', ROLES.HRO)).toBe(false);
        expect(canAccessRoute('/dashboard/admin', ROLES.HHRMD)).toBe(false);
        expect(canAccessRoute('/dashboard/admin', ROLES.EMPLOYEE)).toBe(false);
        expect(canAccessRoute('/dashboard/admin/users', ROLES.CSCS)).toBe(
          false
        );
      });
    });

    describe('HR Officer Routes', () => {
      it('should allow HRO to access urgent actions', () => {
        expect(canAccessRoute('/dashboard/urgent-actions', ROLES.HRO)).toBe(
          true
        );
      });

      it('should allow HRO to access confirmation', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard/confirmation/new', ROLES.HRO)).toBe(
          true
        );
      });

      it('should allow HRO to access LWOP', () => {
        expect(canAccessRoute('/dashboard/lwop', ROLES.HRO)).toBe(true);
      });

      it('should allow HRO to access promotion', () => {
        expect(canAccessRoute('/dashboard/promotion', ROLES.HRO)).toBe(true);
      });

      it('should allow HRO to access cadre change', () => {
        expect(canAccessRoute('/dashboard/cadre-change', ROLES.HRO)).toBe(true);
      });

      it('should allow HRO to access retirement', () => {
        expect(canAccessRoute('/dashboard/retirement', ROLES.HRO)).toBe(true);
      });

      it('should allow HRO to access resignation', () => {
        expect(canAccessRoute('/dashboard/resignation', ROLES.HRO)).toBe(true);
      });

      it('should allow HRO to access service extension', () => {
        expect(canAccessRoute('/dashboard/service-extension', ROLES.HRO)).toBe(
          true
        );
      });
    });

    describe('HHRMD Routes', () => {
      it('should allow HHRMD to access approval routes', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.HHRMD)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/lwop', ROLES.HHRMD)).toBe(true);
        expect(canAccessRoute('/dashboard/promotion', ROLES.HHRMD)).toBe(true);
      });

      it('should allow HHRMD to access disciplinary routes', () => {
        expect(canAccessRoute('/dashboard/termination', ROLES.HHRMD)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/dismissal', ROLES.HHRMD)).toBe(true);
      });

      it('should allow HHRMD to access complaints', () => {
        expect(canAccessRoute('/dashboard/complaints', ROLES.HHRMD)).toBe(true);
      });

      it('should allow HHRMD to access institutions', () => {
        expect(canAccessRoute('/dashboard/institutions', ROLES.HHRMD)).toBe(
          true
        );
      });
    });

    describe('HRMO Routes', () => {
      it('should allow HRMO to access approval routes', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.HRMO)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/lwop', ROLES.HRMO)).toBe(true);
        expect(canAccessRoute('/dashboard/promotion', ROLES.HRMO)).toBe(true);
      });

      it('should NOT allow HRMO to access disciplinary routes', () => {
        expect(canAccessRoute('/dashboard/termination', ROLES.HRMO)).toBe(
          false
        );
        expect(canAccessRoute('/dashboard/dismissal', ROLES.HRMO)).toBe(false);
      });

      it('should NOT allow HRMO to access complaints', () => {
        expect(canAccessRoute('/dashboard/complaints', ROLES.HRMO)).toBe(false);
      });

      it('should allow HRMO to access institutions', () => {
        expect(canAccessRoute('/dashboard/institutions', ROLES.HRMO)).toBe(
          true
        );
      });
    });

    describe('DO Routes', () => {
      it('should allow DO to access disciplinary routes', () => {
        expect(canAccessRoute('/dashboard/termination', ROLES.DO)).toBe(true);
        expect(canAccessRoute('/dashboard/dismissal', ROLES.DO)).toBe(true);
      });

      it('should allow DO to access complaints', () => {
        expect(canAccessRoute('/dashboard/complaints', ROLES.DO)).toBe(true);
      });

      it('should allow DO to access institutions', () => {
        expect(canAccessRoute('/dashboard/institutions', ROLES.DO)).toBe(true);
      });

      it('should NOT allow DO to access general HR routes', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.DO)).toBe(false);
        expect(canAccessRoute('/dashboard/lwop', ROLES.DO)).toBe(false);
        expect(canAccessRoute('/dashboard/promotion', ROLES.DO)).toBe(false);
      });
    });

    describe('Employee Routes', () => {
      it('should allow EMPLOYEE to access complaints', () => {
        expect(canAccessRoute('/dashboard/complaints', ROLES.EMPLOYEE)).toBe(
          true
        );
      });

      it('should allow EMPLOYEE to access profile', () => {
        expect(canAccessRoute('/dashboard/profile', ROLES.EMPLOYEE)).toBe(true);
      });

      it('should allow EMPLOYEE to access track status', () => {
        expect(canAccessRoute('/dashboard/track-status', ROLES.EMPLOYEE)).toBe(
          true
        );
      });

      it('should allow EMPLOYEE to access dashboard home', () => {
        expect(canAccessRoute('/dashboard', ROLES.EMPLOYEE)).toBe(true);
      });

      it('should NOT allow EMPLOYEE to access HR routes', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.EMPLOYEE)).toBe(
          false
        );
        expect(canAccessRoute('/dashboard/lwop', ROLES.EMPLOYEE)).toBe(false);
        expect(canAccessRoute('/dashboard/promotion', ROLES.EMPLOYEE)).toBe(
          false
        );
      });

      it('should NOT allow EMPLOYEE to access institutions', () => {
        expect(canAccessRoute('/dashboard/institutions', ROLES.EMPLOYEE)).toBe(
          false
        );
      });
    });

    describe('CSCS Routes', () => {
      it('should allow CSCS to access most routes', () => {
        expect(canAccessRoute('/dashboard/urgent-actions', ROLES.CSCS)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/confirmation', ROLES.CSCS)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/termination', ROLES.CSCS)).toBe(true);
        expect(canAccessRoute('/dashboard/complaints', ROLES.CSCS)).toBe(true);
        expect(canAccessRoute('/dashboard/institutions', ROLES.CSCS)).toBe(
          true
        );
      });
    });

    describe('HRRP Routes', () => {
      it('should allow HRRP to access HR routes', () => {
        expect(canAccessRoute('/dashboard/urgent-actions', ROLES.HRRP)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/confirmation', ROLES.HRRP)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/institutions', ROLES.HRRP)).toBe(
          true
        );
      });
    });

    describe('PO Routes', () => {
      it('should allow PO to access read-only routes', () => {
        expect(canAccessRoute('/dashboard/profile', ROLES.PO)).toBe(true);
        expect(canAccessRoute('/dashboard/track-status', ROLES.PO)).toBe(true);
        expect(canAccessRoute('/dashboard/reports', ROLES.PO)).toBe(true);
      });

      it('should NOT allow PO to access HR action routes', () => {
        expect(canAccessRoute('/dashboard/confirmation', ROLES.PO)).toBe(false);
        expect(canAccessRoute('/dashboard/promotion', ROLES.PO)).toBe(false);
        expect(canAccessRoute('/dashboard/termination', ROLES.PO)).toBe(false);
      });
    });

    describe('Common Routes', () => {
      it('should allow all roles to access dashboard home', () => {
        expect(canAccessRoute('/dashboard', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.HHRMD)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.HRMO)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.DO)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.EMPLOYEE)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.CSCS)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.HRRP)).toBe(true);
        expect(canAccessRoute('/dashboard', ROLES.PO)).toBe(true);
      });

      it('should allow HR staff to access profile', () => {
        expect(canAccessRoute('/dashboard/profile', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard/profile', ROLES.HHRMD)).toBe(true);
        expect(canAccessRoute('/dashboard/profile', ROLES.HRMO)).toBe(true);
      });

      it('should allow HR staff to access reports', () => {
        expect(canAccessRoute('/dashboard/reports', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard/reports', ROLES.HHRMD)).toBe(true);
        expect(canAccessRoute('/dashboard/reports', ROLES.HRMO)).toBe(true);
        expect(canAccessRoute('/dashboard/reports', ROLES.PO)).toBe(true);
      });
    });

    describe('Pattern Matching', () => {
      it('should match exact string patterns', () => {
        expect(canAccessRoute('/dashboard', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard/profile', ROLES.HRO)).toBe(true);
      });

      it('should match string patterns with sub-paths', () => {
        expect(canAccessRoute('/dashboard/confirmation/123', ROLES.HRO)).toBe(
          true
        );
        expect(canAccessRoute('/dashboard/profile/edit', ROLES.EMPLOYEE)).toBe(
          true
        );
      });

      it('should match RegExp patterns', () => {
        expect(canAccessRoute('/dashboard/admin', ROLES.ADMIN as Role)).toBe(
          true
        );
        expect(
          canAccessRoute('/dashboard/admin/users', ROLES.ADMIN as Role)
        ).toBe(true);
        expect(
          canAccessRoute(
            '/dashboard/admin/settings/security',
            ROLES.ADMIN as Role
          )
        ).toBe(true);
      });

      it('should use first-match-wins strategy', () => {
        // More specific routes should match before general ones
        expect(canAccessRoute('/dashboard/urgent-actions', ROLES.HRO)).toBe(
          true
        );
        expect(
          canAccessRoute('/dashboard/urgent-actions', ROLES.EMPLOYEE)
        ).toBe(false);
      });
    });

    describe('Default Deny Behavior', () => {
      it('should deny access to routes that do not match any pattern', () => {
        expect(canAccessRoute('/some-random-route', ROLES.HRO)).toBe(false);
        expect(canAccessRoute('/api/secret', ROLES.ADMIN as Role)).toBe(false);
        expect(canAccessRoute('/not-a-route', ROLES.HHRMD)).toBe(false);
      });

      it('should deny access to routes without explicit permissions', () => {
        expect(canAccessRoute('/random-path', ROLES.HRO)).toBe(false);
        expect(canAccessRoute('/api/internal', ROLES.CSCS)).toBe(false);
        expect(canAccessRoute('/other/path', ROLES.DO)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle trailing slashes', () => {
        expect(canAccessRoute('/dashboard/', ROLES.HRO)).toBe(true);
        expect(canAccessRoute('/dashboard/profile/', ROLES.EMPLOYEE)).toBe(
          true
        );
      });

      it('should be case-sensitive', () => {
        expect(canAccessRoute('/Dashboard', ROLES.HRO)).toBe(false);
        expect(canAccessRoute('/DASHBOARD/PROFILE', ROLES.EMPLOYEE)).toBe(
          false
        );
      });

      it('should handle empty pathname', () => {
        expect(canAccessRoute('', ROLES.HRO)).toBe(false);
      });

      it('should handle root path', () => {
        expect(canAccessRoute('/', ROLES.HRO)).toBe(false);
      });
    });
  });

  // =============================================================================
  // getAllowedRolesForRoute Function
  // =============================================================================

  describe('getAllowedRolesForRoute', () => {
    it('should return allowed roles for admin route', () => {
      const roles = getAllowedRolesForRoute('/dashboard/admin');
      expect(roles).toContain(ROLES.ADMIN as Role);
      expect(roles.length).toBe(1);
    });

    it('should return allowed roles for confirmation route', () => {
      const roles = getAllowedRolesForRoute('/dashboard/confirmation');
      expect(roles).toContain(ROLES.HRO);
      expect(roles).toContain(ROLES.HHRMD);
      expect(roles).toContain(ROLES.HRMO);
      expect(roles).toContain(ROLES.CSCS);
      expect(roles).toContain(ROLES.HRRP);
      expect(roles.length).toBe(5);
    });

    it('should return allowed roles for termination route', () => {
      const roles = getAllowedRolesForRoute('/dashboard/termination');
      expect(roles).toContain(ROLES.HRO);
      expect(roles).toContain(ROLES.DO);
      expect(roles).toContain(ROLES.HHRMD);
      expect(roles).toContain(ROLES.CSCS);
      expect(roles).not.toContain(ROLES.HRMO); // HRMO NOT allowed
      expect(roles.length).toBe(4);
    });

    it('should return allowed roles for complaints route', () => {
      const roles = getAllowedRolesForRoute('/dashboard/complaints');
      expect(roles).toContain(ROLES.EMPLOYEE);
      expect(roles).toContain(ROLES.DO);
      expect(roles).toContain(ROLES.HHRMD);
      expect(roles).toContain(ROLES.CSCS);
    });

    it('should return allowed roles for dashboard home', () => {
      const roles = getAllowedRolesForRoute('/dashboard');
      expect(roles.length).toBeGreaterThanOrEqual(8); // All roles
      expect(roles).toContain(ROLES.HRO);
      expect(roles).toContain(ROLES.EMPLOYEE);
      expect(roles).toContain(ROLES.ADMIN as Role);
    });

    it('should return empty array for undefined routes', () => {
      const roles = getAllowedRolesForRoute('/undefined-route');
      expect(roles).toEqual([]);
      expect(roles.length).toBe(0);
    });

    it('should handle sub-paths correctly', () => {
      const roles = getAllowedRolesForRoute('/dashboard/admin/users');
      expect(roles).toContain(ROLES.ADMIN as Role);
      expect(roles.length).toBe(1);
    });

    it('should use first-match-wins for overlapping patterns', () => {
      const rolesUrgent = getAllowedRolesForRoute('/dashboard/urgent-actions');
      const rolesDashboard = getAllowedRolesForRoute('/dashboard');

      // urgent-actions is more specific and should match first
      expect(rolesUrgent.length).toBeLessThan(rolesDashboard.length);
    });

    it('should handle RegExp patterns', () => {
      const roles = getAllowedRolesForRoute('/dashboard/admin/settings');
      expect(roles).toContain(ROLES.ADMIN as Role);
    });

    it('should return empty array for empty pathname', () => {
      const roles = getAllowedRolesForRoute('');
      expect(roles).toEqual([]);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration: Access Control Scenarios', () => {
    it('should enforce HR workflow permissions correctly', () => {
      // HRO can submit
      expect(canAccessRoute('/dashboard/confirmation', ROLES.HRO)).toBe(true);

      // HHRMD and HRMO can approve
      expect(canAccessRoute('/dashboard/confirmation', ROLES.HHRMD)).toBe(true);
      expect(canAccessRoute('/dashboard/confirmation', ROLES.HRMO)).toBe(true);

      // Employee cannot access
      expect(canAccessRoute('/dashboard/confirmation', ROLES.EMPLOYEE)).toBe(
        false
      );
    });

    it('should enforce disciplinary action permissions correctly', () => {
      // HRO can submit
      expect(canAccessRoute('/dashboard/termination', ROLES.HRO)).toBe(true);

      // DO and HHRMD can handle
      expect(canAccessRoute('/dashboard/termination', ROLES.DO)).toBe(true);
      expect(canAccessRoute('/dashboard/termination', ROLES.HHRMD)).toBe(true);

      // HRMO cannot handle disciplinary actions
      expect(canAccessRoute('/dashboard/termination', ROLES.HRMO)).toBe(false);

      // Employee cannot access
      expect(canAccessRoute('/dashboard/termination', ROLES.EMPLOYEE)).toBe(
        false
      );
    });

    it('should enforce complaint workflow permissions correctly', () => {
      // Employee can submit
      expect(canAccessRoute('/dashboard/complaints', ROLES.EMPLOYEE)).toBe(
        true
      );

      // DO and HHRMD can handle
      expect(canAccessRoute('/dashboard/complaints', ROLES.DO)).toBe(true);
      expect(canAccessRoute('/dashboard/complaints', ROLES.HHRMD)).toBe(true);

      // HRO and HRMO cannot access complaints
      expect(canAccessRoute('/dashboard/complaints', ROLES.HRO)).toBe(false);
      expect(canAccessRoute('/dashboard/complaints', ROLES.HRMO)).toBe(false);
    });

    it('should allow read-only access for PO role', () => {
      // PO can view
      expect(canAccessRoute('/dashboard/profile', ROLES.PO)).toBe(true);
      expect(canAccessRoute('/dashboard/reports', ROLES.PO)).toBe(true);
      expect(canAccessRoute('/dashboard/track-status', ROLES.PO)).toBe(true);

      // PO cannot submit or approve
      expect(canAccessRoute('/dashboard/confirmation', ROLES.PO)).toBe(false);
      expect(canAccessRoute('/dashboard/promotion', ROLES.PO)).toBe(false);
    });
  });
});
