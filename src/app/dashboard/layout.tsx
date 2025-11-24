'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { DebugLogger } from '@/lib/debug-logger';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    DebugLogger.log('DASHBOARD_LAYOUT_AUTH_STATE', { isLoading, isAuthenticated, role });
    if (!isLoading && !isAuthenticated) {
      DebugLogger.log('DASHBOARD_LAYOUT_REDIRECTING_TO_LOGIN');
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router, role]);

  if (isLoading || !isAuthenticated) {
    // Show a loading state or a skeleton screen
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden md:block w-64 h-screen" />
        <div className="flex-1 flex flex-col">
          <Skeleton className="h-14 w-full" />
          <div className="p-8">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
