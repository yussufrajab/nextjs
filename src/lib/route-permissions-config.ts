import type { Role } from './types';
import { ROLES } from './constants';

export interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
  description?: string;
}

/**
 * Canonical route permission configuration.
 * This is the SINGLE SOURCE OF TRUTH for RBAC route permissions.
 *
 * Both middleware.ts and route-permissions.ts import from this file.
 * When adding or changing permissions, update ONLY this file.
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
    description: 'Employee confirmation - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Leave without pay - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Promotions - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Change of cadre - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Retirement - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Resignation - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Service extension - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },

  // Disciplinary actions - HHRMD and DO only, NOT HRMO
  {
    pattern: '/dashboard/termination',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS, ROLES.HRRP],
    description: 'Termination - HRO submits to HRRP, HRRP approves and forwards to Commission (DO/HHRMD)',
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

  // Manual employee entry - HRO only
  {
    pattern: '/dashboard/add-employee',
    allowedRoles: [ROLES.HRO],
    description: 'Manual employee entry',
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
      ROLES.PO,
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
      ROLES.PO,
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
