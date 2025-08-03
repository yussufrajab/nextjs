'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { getNavItemsForRole } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/icons/logo';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AppSidebar() {
  const pathname = usePathname();
  const { role, logout, user } = useAuth();
  const { state: sidebarState } = useSidebar(); // 'expanded' or 'collapsed'

  const navItems = React.useMemo(() => getNavItemsForRole(role), [role]);

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <ShadSidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          {sidebarState === 'expanded' && (
            <h1 className="text-xl font-bold font-headline">{APP_NAME}</h1>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-grow p-0">
        <ScrollArea className="h-full">
        <SidebarMenu className="px-2">
          {navItems.map((item) =>
            item.children ? (
              <SidebarGroup key={item.title}>
                <SidebarGroupLabel className="flex items-center">
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </SidebarGroupLabel>
                <SidebarMenuSub>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.title}>
                      <Link href={child.href} legacyBehavior passHref>
                        <SidebarMenuSubButton
                          isActive={isActive(child.href)}
                          disabled={child.disabled}
                          className="w-full justify-start"
                        >
                          {child.title}
                          {child.label && (
                            <span className="ml-auto text-xs text-muted-foreground">{child.label}</span>
                          )}
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarGroup>
            ) : (
              <SidebarMenuItem key={item.title}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    disabled={item.disabled}
                    className="w-full justify-start"
                    tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                  >
                    <item.icon className={cn("transition-all", sidebarState === 'collapsed' ? 'mx-auto' : 'mr-2')} />
                    {sidebarState === 'expanded' && item.title}
                    {sidebarState === 'expanded' && item.label && (
                       <span className="ml-auto text-xs text-muted-foreground">{item.label}</span>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}
          tooltip={sidebarState === 'collapsed' ? 'Logout' : undefined}
        >
          <LogOut className={cn("transition-all", sidebarState === 'collapsed' ? 'mx-auto' : 'mr-2 h-4 w-4')} />
          {sidebarState === 'expanded' && 'Logout'}
        </Button>
      </SidebarFooter>
    </ShadSidebar>
  );
}
