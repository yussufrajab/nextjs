/**
 * Client-side route guard hook
 * Provides an additional layer of protection beyond middleware
 * Useful for client-side route validation and UX
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './use-auth';
import { canAccessRoute } from '@/lib/route-permissions';

interface RouteGuardOptions {
  /**
   * If true, redirects to dashboard when access is denied
   * If false, shows an error state
   */
  redirectOnDenied?: boolean;

  /**
   * Custom redirect path when access is denied
   */
  redirectTo?: string;

  /**
   * Callback when access is denied
   */
  onAccessDenied?: () => void;
}

interface RouteGuardState {
  /**
   * Whether the current user has access to this route
   */
  hasAccess: boolean;

  /**
   * Whether the route guard is still checking access
   */
  isChecking: boolean;

  /**
   * Error message if access is denied
   */
  errorMessage: string | null;
}

/**
 * Hook to guard a route based on user role
 *
 * @example
 * ```tsx
 * function AdminPage() {
 *   const { hasAccess, isChecking } = useRouteGuard({ redirectOnDenied: true });
 *
 *   if (isChecking) return <LoadingSpinner />;
 *   if (!hasAccess) return null; // Already redirected
 *
 *   return <div>Admin Content</div>;
 * }
 * ```
 */
export function useRouteGuard(
  options: RouteGuardOptions = {}
): RouteGuardState {
  const {
    redirectOnDenied = true,
    redirectTo = '/dashboard',
    onAccessDenied,
  } = options;

  const { role, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<RouteGuardState>({
    hasAccess: false,
    isChecking: true,
    errorMessage: null,
  });

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) {
      setState((prev) => ({ ...prev, isChecking: true }));
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setState({
        hasAccess: false,
        isChecking: false,
        errorMessage: 'You must be logged in to access this page.',
      });
      return;
    }

    // Check if user has permission to access this route
    const hasPermission = canAccessRoute(pathname, role);

    if (!hasPermission) {
      setState({
        hasAccess: false,
        isChecking: false,
        errorMessage: 'You do not have permission to access this page.',
      });

      // Call the access denied callback
      onAccessDenied?.();

      // Redirect if configured
      if (redirectOnDenied) {
        const redirectUrl = new URL(redirectTo, window.location.origin);
        redirectUrl.searchParams.set('error', 'unauthorized');
        redirectUrl.searchParams.set('attempted', pathname);
        router.replace(redirectUrl.pathname + redirectUrl.search);
      }

      return;
    }

    // User has access
    setState({
      hasAccess: true,
      isChecking: false,
      errorMessage: null,
    });
  }, [
    isLoading,
    isAuthenticated,
    role,
    pathname,
    redirectOnDenied,
    redirectTo,
    onAccessDenied,
    router,
  ]);

  return state;
}

/**
 * Hook to check if current user can access a specific route
 * Does not redirect or change state, just returns boolean
 *
 * @example
 * ```tsx
 * function Navigation() {
 *   const canAccessAdmin = useCanAccessRoute('/dashboard/admin/users');
 *
 *   return (
 *     <nav>
 *       {canAccessAdmin && <Link href="/dashboard/admin/users">Users</Link>}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useCanAccessRoute(routePath: string): boolean {
  const { role } = useAuth();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    setCanAccess(canAccessRoute(routePath, role));
  }, [routePath, role]);

  return canAccess;
}
