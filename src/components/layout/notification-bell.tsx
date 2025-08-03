'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api-client';

interface Notification {
  id: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user || !user.id) {
      console.log('Skipping notifications fetch - no authenticated user or user ID');
      return;
    }
    try {
      const response = await apiClient.getNotifications(user.id);
      if (response.success && response.data) {
        setNotifications(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Notifications fetch error:', error);
      setNotifications([]);
      // Silently fail to avoid spamming user with toasts
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Fetch every minute
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark all as read when dropdown is opened
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      try {
        const response = await apiClient.markNotificationsAsRead(unreadIds);
        if (response.success) {
          // Optimistically update UI
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Could not mark notifications as read.', variant: 'destructive' });
      }
    }
  };
  
  const handleItemClick = (notification: Notification) => {
    if (notification.link) {
        router.push(notification.link);
    }
    setIsOpen(false);
  };


  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {Array.isArray(notifications) && notifications.length > 0 ? (
            notifications.map(notification => (
              <DropdownMenuItem 
                key={notification.id} 
                className={cn("flex items-start gap-3 whitespace-normal", !notification.isRead && "bg-accent")}
                onClick={() => handleItemClick(notification)}
              >
                <div className="mt-1 h-2 w-2 rounded-full bg-primary data-[read=true]:bg-transparent" data-read={notification.isRead} />
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
                <Mail className="h-8 w-8 text-muted-foreground mb-2"/>
                <p className="text-sm font-medium">No new notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
