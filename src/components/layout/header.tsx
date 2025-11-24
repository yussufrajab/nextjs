'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { NotificationBell } from './notification-bell'; // Import the new component
import { useSidebar } from '../ui/sidebar';

export function AppHeader() {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8">
        <div className="mr-4 flex">
          <SidebarTrigger className="md:hidden" />
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Add breadcrumbs or page title here if needed */}
          <nav className="flex items-center space-x-2">
            <NotificationBell />
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
