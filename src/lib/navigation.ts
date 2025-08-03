
import {
  LayoutDashboard,
  UserCheck,
  CalendarOff,
  TrendingUp,
  MessageSquareWarning,
  Users,
  Briefcase,
  LogOut as LogOutIcon, 
  CalendarPlus,
  UserX,
  Ban,
  UserCog,
  BarChart3,
  ShieldCheck, 
  Replace,
  UserMinus,
  ListChecks,
  ShieldAlert,
  AlertTriangle,
  LineChart,
  Building,
} from 'lucide-react';
import type { NavItem, Role } from './types';
import { ROLES } from './constants';

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard, // Could use LineChart for PO if specific dashboard exists
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.ADMIN as Role],
    description: 'Overview of your activities and quick access to modules.',
  },
  {
    title: 'Admin Management',
    icon: ShieldCheck,
    roles: [ROLES.ADMIN as Role],
    children: [
        {
            title: 'User Management',
            href: '/dashboard/admin/users',
            icon: Users,
            roles: [ROLES.ADMIN as Role],
            description: 'Create and manage user accounts and roles.'
        },
        {
            title: 'Institution Management',
            href: '/dashboard/admin/institutions',
            icon: Building,
            roles: [ROLES.ADMIN as Role],
            description: 'Create and manage institutions.'
        }
    ]
  },
  {
    title: 'Urgent Actions',
    href: '/dashboard/urgent-actions',
    icon: AlertTriangle,
    roles: [ROLES.HRO, ROLES.HRMO, ROLES.HRRP],
    description: 'View employees needing immediate attention.',
  },
  {
    title: 'Employee Profiles',
    href: '/dashboard/profile',
    icon: UserCog,
    roles: [ROLES.HRO, ROLES.EMPLOYEE, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO],
    description: 'View and manage employee profile information.',
  },
  {
    title: 'Employee Confirmation',
    href: '/dashboard/confirmation',
    icon: UserCheck,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO], 
    description: 'Manage employee confirmation processes.',
  },
  {
    title: 'Leave Without Pay (LWOP)',
    href: '/dashboard/lwop',
    icon: CalendarOff,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Process and manage LWOP requests for employees.',
  },
  {
    title: 'Promotion',
    href: '/dashboard/promotion',
    icon: TrendingUp,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Handle employee promotion applications and approvals.',
  },
  {
    title: 'Complaints',
    href: '/dashboard/complaints',
    icon: MessageSquareWarning,
    roles: [ROLES.EMPLOYEE, ROLES.DO, ROLES.HHRMD],
    description: 'Submit, view, and manage employee complaints.',
  },
  {
    title: 'Change of Cadre',
    href: '/dashboard/cadre-change',
    icon: Replace,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Manage requests for change of employee cadre.',
  },
  {
    title: 'Retirement',
    href: '/dashboard/retirement',
    icon: UserMinus,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Process employee retirement applications.',
  },
  {
    title: 'Resignation',
    href: '/dashboard/resignation',
    icon: UserX, 
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Handle employee resignation submissions.',
  },
  {
    title: 'Service Extension',
    href: '/dashboard/service-extension',
    icon: CalendarPlus,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO],
    description: 'Manage requests for employee service extensions.',
  },
  {
    title: 'Termination and Dismissal',
    href: '/dashboard/termination',
    icon: ShieldAlert,
    roles: [ROLES.HRO, ROLES.DO, ROLES.HHRMD],
    description: 'Process terminations for confirmed staff and dismissals for probationers.',
  },
  {
    title: 'Track Status',
    href: '/dashboard/track-status',
    icon: ListChecks,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO],
    description: 'Track the status of submitted requests.',
  },
  {
    title: 'Reports & Analytics',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.DO, ROLES.CSCS, ROLES.HRRP, ROLES.PO],
    description: 'Generate and view various system reports.',
  },
];

export function getNavItemsForRole(role: Role | null): NavItem[] {
  console.log('getNavItemsForRole called with role:', role, 'type:', typeof role);
  
  if (!role) {
    console.log('getNavItemsForRole: No role provided, returning empty array');
    return [];
  }
  
  console.log('Available roles in ROLES constant:', Object.values(ROLES));
  console.log('Role comparison - input role:', role, 'HRMO constant:', ROLES.HRMO, 'equal?', role === ROLES.HRMO);
  
  const filteredItems = NAV_ITEMS.filter(item => {
    const hasRole = item.roles.includes(role);
    console.log(`Item "${item.title}": roles=${JSON.stringify(item.roles)}, includes ${role}? ${hasRole}`);
    return hasRole;
  });
  
  console.log('Filtered nav items for role', role, ':', filteredItems.map(item => item.title));
  return filteredItems;
}
