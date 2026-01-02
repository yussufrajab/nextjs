/**
 * Client-side Route Guard Component
 * Wraps pages to provide role-based access control
 */

'use client';

import React from 'react';
import { useRouteGuard } from '@/hooks/use-route-guard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface RouteGuardProps {
  /**
   * Child components to render if access is granted
   */
  children: React.ReactNode;

  /**
   * Whether to show error UI or just return null when access is denied
   * Default: true
   */
  showErrorUI?: boolean;

  /**
   * Custom error message to display
   */
  errorMessage?: string;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
}

/**
 * Route Guard Component
 *
 * Wraps page content to enforce role-based access control.
 * Shows loading state while checking, and error state if access is denied.
 *
 * @example
 * ```tsx
 * export default function AdminPage() {
 *   return (
 *     <RouteGuard>
 *       <h1>Admin Dashboard</h1>
 *       {/* Admin content here *\/}
 *     </RouteGuard>
 *   );
 * }
 * ```
 */
export function RouteGuard({
  children,
  showErrorUI = true,
  errorMessage,
  loadingComponent,
}: RouteGuardProps) {
  const router = useRouter();
  const {
    hasAccess,
    isChecking,
    errorMessage: guardError,
  } = useRouteGuard({
    redirectOnDenied: false, // Handle redirect manually in this component
  });

  // Show loading state
  if (isChecking) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    if (!showErrorUI) {
      return null;
    }

    const displayMessage = errorMessage || guardError || 'Access denied';

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>{displayMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You do not have the required permissions to access this page.
              Please contact your administrator if you believe this is an error.
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
}
