'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteGuard } from '@/components/auth/route-guard';
import {
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Info,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { clientLogger } from '@/lib/logger-client';
const log = clientLogger.child({ component: 'audit-trail' });

/**
 * Today's date as `YYYY-MM-DD` in the VIEWER's local timezone (not UTC).
 * Used for the default end of the audit date range so "today" is correct for
 * users east of UTC (e.g. EAT/UTC+3), where `new Date().toISOString()` is still
 * the previous calendar day in the early morning.
 */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convert a `YYYY-MM-DD` (local calendar day) value to an ISO timestamp at the
 * START of that local day (00:00:00 local → UTC). Date-only strings parsed by
 * `new Date(...)` are treated as UTC midnight, which would cut off the first
 * hours of each local day for users east of UTC; appending `T00:00:00` makes
 * the parser use local time, matching what the user sees on the calendar.
 */
function startOfDayIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

/** Convert a `YYYY-MM-DD` local day to the ISO timestamp at its END (23:59:59 local → UTC). */
function endOfDayIso(day: string): string {
  return new Date(`${day}T23:59:59`).toISOString();
}

interface AuditLog {
  id: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  deviceInfo?: {
    browser?: string;
    os?: string;
    deviceType?: string;
    userAgent?: string;
    screenResolution?: string;
  } | null;
  attemptedRoute: string;
  requestMethod?: string | null;
  isAuthenticated: boolean;
  wasBlocked: boolean;
  blockReason?: string | null;
  timestamp: string;
  entityType?: string | null;
  entityId?: string | null;
  additionalData?: {
    requestType?: string;
    requestId?: string;
    employeeId?: string;
    employeeName?: string;
    employeeZanId?: string;
    reviewStage?: string;
    action?: string;
    rejectionReason?: string;
    [key: string]: any;
  } | null;
}

interface AuditStats {
  totalEvents: number;
  blockedAttempts: number;
  criticalEvents: number;
  eventsByType: Array<{ eventType: string; _count: number }>;
  eventsBySeverity: Array<{ severity: string; _count: number }>;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-orange-600" />;
    case 'WARNING':
      return <ShieldAlert className="h-4 w-4 text-yellow-600" />;
    case 'INFO':
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
};

const getSeverityBadge = (severity: string) => {
  const variants: Record<
    string,
    'destructive' | 'default' | 'secondary' | 'outline'
  > = {
    CRITICAL: 'destructive',
    ERROR: 'destructive',
    WARNING: 'secondary',
    INFO: 'default',
  };

  return (
    <Badge variant={variants[severity] || 'default'} className="gap-1">
      {getSeverityIcon(severity)}
      {severity}
    </Badge>
  );
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  // Default to the FULL audit history (no start bound) up to today. The
  // previous default of "last 7 days" hid most activity events behind recent
  // auth noise (logins/access-denied), making it look like activities weren't
  // logged — an admin should see every event by default. `end` uses the LOCAL
  // date so "today" is correct in the viewer's timezone.
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: todayLocal(),
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 50;

  const fetchAuditLogs = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      // Build query parameters
      const params = new URLSearchParams({
        limit: logsPerPage.toString(),
        offset: ((currentPage - 1) * logsPerPage).toString(),
      });

      if (dateRange.start)
        params.append('startDate', startOfDayIso(dateRange.start));
      if (dateRange.end)
        params.append('endDate', endOfDayIso(dateRange.end));
if (categoryFilter && categoryFilter !== 'all')
        params.append('eventCategory', categoryFilter);
      if (eventTypeFilter && eventTypeFilter !== 'all')
        params.append('eventType', eventTypeFilter);
      if (searchTerm) params.append('username', searchTerm);

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setTotalLogs(data.data.total);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch audit logs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Error fetching audit logs:');
      toast({
        title: 'Error',
        description: 'An error occurred while fetching audit logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        statsOnly: 'true',
      });

      if (dateRange.start)
        params.append('startDate', startOfDayIso(dateRange.start));
      if (dateRange.end)
        params.append('endDate', endOfDayIso(dateRange.end));

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      log.error({ err: error }, 'Error fetching audit stats:');
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [currentPage, categoryFilter, eventTypeFilter, dateRange]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleRefresh = () => {
    fetchAuditLogs(false);
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ limit: totalLogs.toString(), offset: '0' });

      if (dateRange.start)
        params.append('startDate', startOfDayIso(dateRange.start));
      if (dateRange.end)
        params.append('endDate', endOfDayIso(dateRange.end));
      if (categoryFilter && categoryFilter !== 'all')
        params.append('eventCategory', categoryFilter);
      if (eventTypeFilter && eventTypeFilter !== 'all')
        params.append('eventType', eventTypeFilter);
      if (searchTerm) params.append('username', searchTerm);

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        toast({ title: 'Error', description: 'Failed to export audit logs', variant: 'destructive' });
        return;
      }

      const rows: AuditLog[] = data.data.logs;
      const headers = ['Timestamp', 'Severity', 'Event Type', 'Category', 'Username', 'Role', 'IP Address', 'Browser', 'OS', 'Device Type', 'Route', 'Method', 'Status', 'Block Reason'];

      const escape = (v: string | null | undefined) => {
        const s = v ?? '';
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const csvLines = [
        headers.join(','),
        ...rows.map((log) =>
          [
            escape(format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')),
            escape(log.severity),
            escape(log.eventType),
            escape(log.eventCategory),
            escape(log.username || log.userId),
            escape(log.userRole),
            escape(log.ipAddress),
            escape(log.deviceInfo?.browser || ''),
            escape(log.deviceInfo?.os || ''),
            escape(log.deviceInfo?.deviceType || ''),
            escape(log.attemptedRoute),
            escape(log.requestMethod),
            escape(log.wasBlocked ? 'Blocked' : 'Allowed'),
            escape(log.blockReason),
          ].join(',')
        ),
      ];

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export Complete', description: `Exported ${rows.length} audit log entries` });
    } catch {
      toast({ title: 'Error', description: 'Failed to export audit logs', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <RouteGuard>
      <div className="space-y-6">
        <PageHeader
          title="Audit Trail"
          description="Monitor security events, unauthorized access attempts, and data modifications (request approvals/rejections)"
        />

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Events
                </CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalEvents.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Blocked Attempts
                </CardTitle>
                <ShieldAlert className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.blockedAttempts.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Critical Events
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.criticalEvents.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <Info className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalEvents > 0
                    ? (
                        ((stats.totalEvents - stats.blockedAttempts) /
                          stats.totalEvents) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  By Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {Object.entries(
                    (logs || []).reduce((acc, log) => {
                      acc[log.eventCategory] = (acc[log.eventCategory] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="text-muted-foreground">{category.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter and search audit logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">
                  Search Username/IP
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by username or IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Category
                </label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="AUTHENTICATION">
                      Authentication
                    </SelectItem>
                    <SelectItem value="AUTHORIZATION">Authorization</SelectItem>
                    <SelectItem value="ACCESS">Access</SelectItem>
                    <SelectItem value="DATA_MODIFICATION">
                      Data Modification
                    </SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Event Type
                </label>
                <Select
                  value={eventTypeFilter}
                  onValueChange={setEventTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="UNAUTHORIZED_ACCESS">
                      Unauthorized Access
                    </SelectItem>
                    <SelectItem value="ACCESS_DENIED">Access Denied</SelectItem>
                    <SelectItem value="FORBIDDEN_ROUTE">
                      Forbidden Route
                    </SelectItem>
                    <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                    <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                    <SelectItem value="REQUEST_APPROVED">
                      Request Approved
                    </SelectItem>
                    <SelectItem value="REQUEST_REJECTED">
                      Request Rejected
                    </SelectItem>
                    <SelectItem value="REQUEST_SUBMITTED">
                      Request Submitted
                    </SelectItem>
                    <SelectItem value="REQUEST_UPDATED">
                      Request Updated
                    </SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="SESSION_EXPIRED">Session Expired</SelectItem>
                    <SelectItem value="REQUEST_WITHDRAWN">Request Withdrawn</SelectItem>
                    <SelectItem value="EMPLOYEE_CREATED">Employee Created</SelectItem>
                    <SelectItem value="EMPLOYEE_UPDATED">Employee Updated</SelectItem>
                    <SelectItem value="EMPLOYEE_DELETED">Employee Deleted</SelectItem>
                    <SelectItem value="EMPLOYEE_VIEWED">Employee Viewed</SelectItem>
                    <SelectItem value="USER_CREATED">User Created</SelectItem>
                    <SelectItem value="USER_UPDATED">User Updated</SelectItem>
                    <SelectItem value="USER_DELETED">User Deleted</SelectItem>
                    <SelectItem value="COMPLAINT_SUBMITTED">Complaint Submitted</SelectItem>
                    <SelectItem value="COMPLAINT_UPDATED">Complaint Updated</SelectItem>
                    <SelectItem value="COMPLAINT_RESOLVED">Complaint Resolved</SelectItem>
                    <SelectItem value="PASSWORD_CHANGED">Password Changed</SelectItem>
                    <SelectItem value="ADMIN_PASSWORD_RESET">Admin Password Reset</SelectItem>
                    <SelectItem value="ACCOUNT_LOCKED">Account Locked</SelectItem>
                    <SelectItem value="ACCOUNT_UNLOCKED">Account Unlocked</SelectItem>
                    <SelectItem value="FILE_UPLOADED">File Uploaded</SelectItem>
                    <SelectItem value="FILE_DELETED">File Deleted</SelectItem>
                    <SelectItem value="INSTITUTION_CREATED">Institution Created</SelectItem>
                    <SelectItem value="INSTITUTION_UPDATED">Institution Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-end">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Showing {logs.length} of {totalLogs.toLocaleString()} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No audit logs found matching your filters
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const hasRichDetails =
                          log.additionalData &&
                          [
                            'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_SUBMITTED',
                            'REQUEST_UPDATED', 'REQUEST_WITHDRAWN',
                            'COMPLAINT_SUBMITTED', 'COMPLAINT_UPDATED', 'COMPLAINT_RESOLVED',
                            'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DELETED',
                            'EMPLOYEE_VIEWED',
                            'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
                            'INSTITUTION_CREATED', 'INSTITUTION_UPDATED',
                            'FILE_UPLOADED', 'FILE_DELETED',
                            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
                            'PASSWORD_CHANGED', 'ADMIN_PASSWORD_RESET',
                          ].includes(log.eventType);

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {format(
                                new Date(log.timestamp),
                                'yyyy-MM-dd HH:mm:ss'
                              )}
                            </TableCell>
                            <TableCell>
                              {getSeverityBadge(log.severity)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.eventType}
                            </TableCell>
                            <TableCell>
                              {log.username || log.userId || 'Anonymous'}
                            </TableCell>
                            <TableCell>
                              {log.userRole ? (
                                <Badge variant="outline">{log.userRole}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md">
                              {hasRichDetails ? (
                                <div className="text-xs space-y-1">
                                  <div className="font-medium">
                                    {log.additionalData?.requestType
                                      ? `${log.additionalData.requestType} Request`
                                      : log.additionalData?.action || log.eventType}
                                  </div>
                                  {log.additionalData?.employeeName && (
                                    <div className="text-muted-foreground">
                                      Employee:{' '}
                                      {log.additionalData.employeeName}
                                      {log.additionalData.employeeZanId &&
                                        ` (${log.additionalData.employeeZanId})`}
                                    </div>
                                  )}
                                  {log.additionalData?.reviewStage && (
                                    <div className="text-muted-foreground">
                                      Stage: {log.additionalData.reviewStage}
                                    </div>
                                  )}
                                  {log.eventType === 'REQUEST_REJECTED' &&
                                    log.blockReason && (
                                      <div className="text-orange-600">
                                        Reason: {log.blockReason}
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <div className="text-xs space-y-1">
                                  <div className="font-mono truncate">
                                    {log.attemptedRoute}
                                  </div>
                                  {log.blockReason && (
                                    <div className="text-muted-foreground truncate">
                                      {log.blockReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.ipAddress || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {log.deviceInfo ? (
                                <span title={`OS: ${log.deviceInfo.os || 'Unknown'}\nBrowser: ${log.deviceInfo.browser || 'Unknown'}\nResolution: ${log.deviceInfo.screenResolution || 'Unknown'}\nUA: ${log.deviceInfo.userAgent || 'Unknown'}`}>
                                  {log.deviceInfo.browser || 'Unknown'} / {log.deviceInfo.os || 'Unknown'}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {['REQUEST_APPROVED', 'COMPLAINT_RESOLVED', 'INSTITUTION_CREATED', 'INSTITUTION_UPDATED', 'EMPLOYEE_CREATED', 'EMPLOYEE_VIEWED', 'USER_CREATED', 'FILE_UPLOADED', 'ACCOUNT_UNLOCKED', 'LOGOUT', 'PASSWORD_CHANGED', 'LOGIN_SUCCESS'].includes(log.eventType) ? (
                                <Badge variant="default" className="bg-green-600">Success</Badge>
                              ) : ['REQUEST_REJECTED', 'ACCOUNT_LOCKED', 'EMPLOYEE_DELETED', 'USER_DELETED', 'LOGIN_FAILED'].includes(log.eventType) ? (
                                <Badge variant="destructive">Rejected</Badge>
                              ) : log.wasBlocked ? (
                                <Badge variant="destructive">Blocked</Badge>
                              ) : (
                                <Badge variant="default">Allowed</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
          {!isLoading && totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages.toLocaleString()} •{' '}
                {totalLogs.toLocaleString()} total events
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pageNum === currentPage ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </RouteGuard>
  );
}
