'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Monitor, Smartphone, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveSession {
  id: string;
  deviceInfo: string | null;
  lastActivity: Date | string;
  ipAddress: string | null;
  createdAt: Date | string;
  isSuspicious: boolean;
}

interface DeviceLimitDialogProps {
  open: boolean;
  onClose: () => void;
  sessions: ActiveSession[];
  onForceLogout: (sessionId: string) => Promise<void>;
}

export function DeviceLimitDialog({
  open,
  onClose,
  sessions,
  onForceLogout,
}: DeviceLimitDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleForceLogout = async () => {
    if (!selectedSessionId) return;

    setIsLoggingOut(true);
    try {
      await onForceLogout(selectedSessionId);
    } catch (error) {
      console.error('Force logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Monitor className="h-5 w-5" />;
    if (deviceInfo.includes('Mobile') || deviceInfo.includes('Tablet')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Device Limit Reached</DialogTitle>
          <DialogDescription>
            You are already signed in on 3 devices. Please log out from one
            device to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedSessionId === session.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{getDeviceIcon(session.deviceInfo)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {session.deviceInfo || 'Unknown Device'}
                      </span>
                      {session.isSuspicious && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Suspicious
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div>
                        Last active:{' '}
                        {formatDistanceToNow(new Date(session.lastActivity), {
                          addSuffix: true,
                        })}
                      </div>
                      {session.ipAddress && (
                        <div>IP: {session.ipAddress}</div>
                      )}
                      <div>
                        Logged in:{' '}
                        {formatDistanceToNow(new Date(session.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {selectedSessionId === session.id && (
                  <div className="ml-2">
                    <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoggingOut}>
            Cancel
          </Button>
          <Button
            onClick={handleForceLogout}
            disabled={!selectedSessionId || isLoggingOut}
          >
            {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Out Selected Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
