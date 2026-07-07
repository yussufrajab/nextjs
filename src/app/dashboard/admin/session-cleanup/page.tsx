'use client';

import { PageHeader } from '@/components/shared/page-header';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteGuard } from '@/components/auth/route-guard';
import {
  Trash2,
  RefreshCw,
  Loader2,
  Users,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import React, { useState, useEffect, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { clientLogger } from '@/lib/logger-client';
const log = clientLogger.child({ component: 'session-cleanup' });

function safeFormatDate(value: string | null | undefined, fmt: string): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? parseISO(value) : new Date(value);
  if (!isValid(date)) return '-';
  return format(date, fmt);
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  suspiciousSessions: number;
  perUserBreakdown: Array<{
    userId: string;
    username: string;
    name: string;
    sessionCount: number;
  }>;
}

interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  isSuspicious: boolean;
  lastActivity: string;
}

interface UserSessions {
  count: number;
  active: number;
  expired: number;
  sessions: SessionInfo[];
}

interface SessionsByUser {
  [username: string]: UserSessions;
}

export default function SessionCleanupPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessionsByUser, setSessionsByUser] = useState<SessionsByUser>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaningExpired, setIsCleaningExpired] = useState(false);
  const [isCleaningAll, setIsCleaningAll] = useState(false);
  const [cleaningUserId, setCleaningUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cleanup-sessions');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      log.error({ err: error }, 'Error fetching session stats:');
    }
  }, []);

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const response = await fetchWithCsrf('/api/admin/cleanup-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-sessions' }),
      });
      const result = await response.json();
      if (result.success) {
        setSessionsByUser(result.sessionsByUser);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to fetch sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Error fetching sessions:');
      toast({
        title: 'Error',
        description: 'Failed to fetch sessions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([fetchStats(), fetchSessions(false)]).finally(() =>
      setIsRefreshing(false)
    );
  }, [fetchStats, fetchSessions]);

  useEffect(() => {
    fetchStats();
    fetchSessions();
  }, [fetchStats, fetchSessions]);

  const handleCleanupExpired = async () => {
    setIsCleaningExpired(true);
    try {
      const response = await fetchWithCsrf('/api/admin/cleanup-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup-expired' }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Sessions Cleaned Up',
          description: `Removed ${result.count} expired session(s)`,
        });
        refreshAll();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to cleanup sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Error cleaning up expired sessions:');
      toast({
        title: 'Error',
        description: 'Failed to cleanup expired sessions',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningExpired(false);
    }
  };

  const handleCleanupAll = async () => {
    setIsCleaningAll(true);
    try {
      const response = await fetchWithCsrf('/api/admin/cleanup-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup-all' }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'All Sessions Terminated',
          description: `Terminated ${result.count} session(s). All users will need to log in again.`,
        });
        refreshAll();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to cleanup sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Error cleaning up all sessions:');
      toast({
        title: 'Error',
        description: 'Failed to cleanup all sessions',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningAll(false);
    }
  };

  const handleCleanupUser = async (userId: string, username: string) => {
    setCleaningUserId(userId);
    try {
      const response = await fetchWithCsrf('/api/admin/cleanup-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup-user', userId }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'User Sessions Terminated',
          description: `Terminated ${result.count} session(s) for ${username}`,
        });
        refreshAll();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to cleanup user sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Error cleaning up user sessions:');
      toast({
        title: 'Error',
        description: `Failed to cleanup sessions for ${username}`,
        variant: 'destructive',
      });
    } finally {
      setCleaningUserId(null);
    }
  };

  const filteredUsers = Object.entries(sessionsByUser).filter(
    ([, data]) => {
      if (statusFilter === 'active') return data.active > 0;
      if (statusFilter === 'expired') return data.expired > 0;
      return true;
    }
  );

  const allSessions = Object.entries(sessionsByUser).flatMap(
    ([username, data]) =>
      data.sessions.map((s) => ({ ...s, username }))
  );

  const filteredSessions = allSessions.filter((s) => {
    if (statusFilter === 'active') return !s.isExpired;
    if (statusFilter === 'expired') return s.isExpired;
    if (statusFilter === 'suspicious') return s.isSuspicious;
    return true;
  });

  return (
    <RouteGuard>
      <div className="space-y-6">
        <PageHeader
          title="Session Cleanup"
          description="View and manage user sessions. Clean up expired sessions to free database resources and maintain security."
        />

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sessions
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expired Sessions
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.expiredSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Suspicious Sessions
                </CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.suspiciousSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Cleanup Actions
            </CardTitle>
            <CardDescription>
              Remove expired sessions to free resources, or terminate all sessions
              to force re-authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCleanupExpired}
                disabled={isCleaningExpired}
                className="flex items-center gap-2"
              >
                {isCleaningExpired ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isCleaningExpired
                  ? 'Cleaning...'
                  : 'Cleanup Expired Sessions'}
              </Button>

              <Button
                variant="outline"
                onClick={refreshAll}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Terminate All Sessions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Terminate All Sessions?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately terminate ALL user sessions. Every
                      user will be logged out and required to sign in again. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCleanupAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isCleaningAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Terminating...
                        </>
                      ) : (
                        'Terminate All'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'expired', label: 'Expired' },
                { value: 'suspicious', label: 'Suspicious' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-User Summary */}
        {filteredUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sessions by User
              </CardTitle>
              <CardDescription>
                {filteredUsers.length} user(s) with sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(([username, data]) => {
                      const userBreakdown = stats?.perUserBreakdown.find(
                        (u) => u.username === username
                      );
                      const userId = userBreakdown?.userId || '';
                      return (
                        <TableRow key={username}>
                          <TableCell className="font-medium">
                            {username}
                            {data.sessions[0] && (
                              <span className="text-muted-foreground text-xs ml-2">
                                ({data.sessions.length} session
                                {data.sessions.length !== 1 ? 's' : ''})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{data.count}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              {data.active}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {data.expired}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={cleaningUserId === userId}
                                  className="text-destructive hover:text-destructive"
                                >
                                  {cleaningUserId === userId ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  Clear
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Clear sessions for {username}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will terminate all {data.count} session
                                    {data.count !== 1 ? 's' : ''} for{' '}
                                    {username}. They will need to log in again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleCleanupUser(userId, username)
                                    }
                                  >
                                    Confirm
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              Showing {filteredSessions.length} session(s)
              {statusFilter !== 'all' && ` (filtered: ${statusFilter})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No sessions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.username}
                        </TableCell>
                        <TableCell>{session.deviceInfo || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.ipAddress || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {safeFormatDate(session.createdAt, 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {safeFormatDate(session.lastActivity, 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {safeFormatDate(session.expiresAt, 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {session.isExpired ? (
                              <Badge variant="secondary">Expired</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">
                                Active
                              </Badge>
                            )}
                            {session.isSuspicious && (
                              <Badge variant="destructive" className="text-xs">
                                Suspicious
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}