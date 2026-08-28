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
 * Both the Next.js proxy (src/proxy.ts) and route-permissions.ts import from
 * this file. When adding or changing permissions, update ONLY this file.
 *
 * Pemba-scoped roles (`HRO_PEMBA`, `HRRP_PEMBA`) behave like `HRO`/`HRRP` for
 * page-level access: they are added to every route that lists the matching
 * base role. The island-level data scoping is enforced in the API route
 * handlers (see `pembaIslandWhere` in role-utils.ts), not here — this
 * list only gates which pages the role may load.
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
    allowedRoles: [ROLES.HRO, ROLES.HRRP, ROLES.CSCS, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Urgent actions page',
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Employee confirmation - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/lwop',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Leave without pay - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Promotions - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/cadre-change',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Change of cadre - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/retirement',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Retirement - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/resignation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Resignation - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },
  {
    pattern: '/dashboard/service-extension',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Service extension - HRO submits to HRRP, HRRP approves and forwards to Commission (HHRMD/HRMO)',
  },

  // Disciplinary actions - HHRMD and DO only, NOT HRMO
  {
    pattern: '/dashboard/termination',
    allowedRoles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD, ROLES.CSCS, ROLES.HRRP, ROLES.HRO_PEMBA, ROLES.HRRP_PEMBA],
    description: 'Termination - HRO submits to HRRP, HRRP approves and forwards to Commission (DO/HHRMD)',
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
    allowedRoles: [ROLES.HHRMD, ROLES.CSCS, ROLES.DO, ROLES.HRMO, ROLES.HRRP, ROLES.HRRP_PEMBA],
    description: 'Institutions',
  },

  // Manual employee entry - HRO only (and the Pemba-scoped HRO variant)
  {
    pattern: '/dashboard/add-employee',
    allowedRoles: [ROLES.HRO, ROLES.HRO_PEMBA],
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
      ROLES.HRO_PEMBA,
      ROLES.HRRP_PEMBA,
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
      ROLES.HRO_PEMBA,
      ROLES.HRRP_PEMBA,
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
      ROLES.HRO_PEMBA,
      ROLES.HRRP_PEMBA,
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
      ROLES.HRO_PEMBA,
      ROLES.HRRP_PEMBA,
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
      ROLES.HRO_PEMBA,
      ROLES.HRRP_PEMBA,
    ],
    description: 'Dashboard home',
  },
];