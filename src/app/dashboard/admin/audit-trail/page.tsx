'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteGuard } from '@/components/auth/route-guard';
import { Search, Download, RefreshCw, AlertTriangle, ShieldAlert, Info, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  attemptedRoute: string;
  requestMethod?: string | null;
  isAuthenticated: boolean;
  wasBlocked: boolean;
  blockReason?: string | null;
  timestamp: string;
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
  const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
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
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
    end: new Date().toISOString().split('T')[0],
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

      if (dateRange.start) params.append('startDate', new Date(dateRange.start).toISOString());
      if (dateRange.end) params.append('endDate', new Date(dateRange.end + 'T23:59:59').toISOString());
      if (severityFilter && severityFilter !== 'all') params.append('severity', severityFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('eventCategory', categoryFilter);
      if (eventTypeFilter && eventTypeFilter !== 'all') params.append('eventType', eventTypeFilter);
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
      console.error('Error fetching audit logs:', error);
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

      if (dateRange.start) params.append('startDate', new Date(dateRange.start).toISOString());
      if (dateRange.end) params.append('endDate', new Date(dateRange.end + 'T23:59:59').toISOString());

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [currentPage, severityFilter, categoryFilter, eventTypeFilter, dateRange]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleRefresh = () => {
    fetchAuditLogs(false);
    fetchStats();
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Export',
      description: 'Export functionality coming soon',
    });
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blocked Attempts</CardTitle>
                <ShieldAlert className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.blockedAttempts.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.criticalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Info className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalEvents > 0
                    ? (((stats.totalEvents - stats.blockedAttempts) / stats.totalEvents) * 100).toFixed(1)
                    : 0}%
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Search Username/IP</label>
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
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    <SelectItem value="AUTHORIZATION">Authorization</SelectItem>
                    <SelectItem value="ACCESS">Access</SelectItem>
                    <SelectItem value="DATA_MODIFICATION">Data Modification</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Event Type</label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="UNAUTHORIZED_ACCESS">Unauthorized Access</SelectItem>
                    <SelectItem value="ACCESS_DENIED">Access Denied</SelectItem>
                    <SelectItem value="FORBIDDEN_ROUTE">Forbidden Route</SelectItem>
                    <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                    <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                    <SelectItem value="REQUEST_APPROVED">Request Approved</SelectItem>
                    <SelectItem value="REQUEST_REJECTED">Request Rejected</SelectItem>
                    <SelectItem value="REQUEST_SUBMITTED">Request Submitted</SelectItem>
                    <SelectItem value="REQUEST_UPDATED">Request Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-end">
                <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const isRequestEvent = log.eventType === 'REQUEST_APPROVED' || log.eventType === 'REQUEST_REJECTED';

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                            </TableCell>
                            <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                            <TableCell className="font-medium">{log.eventType}</TableCell>
                            <TableCell>{log.username || log.userId || 'Anonymous'}</TableCell>
                            <TableCell>
                              {log.userRole ? (
                                <Badge variant="outline">{log.userRole}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md">
                              {isRequestEvent && log.additionalData ? (
                                <div className="text-xs space-y-1">
                                  <div className="font-medium">
                                    {log.additionalData.requestType} Request
                                  </div>
                                  {log.additionalData.employeeName && (
                                    <div className="text-muted-foreground">
                                      Employee: {log.additionalData.employeeName}
                                      {log.additionalData.employeeZanId && ` (${log.additionalData.employeeZanId})`}
                                    </div>
                                  )}
                                  {log.additionalData.reviewStage && (
                                    <div className="text-muted-foreground">
                                      Stage: {log.additionalData.reviewStage}
                                    </div>
                                  )}
                                  {log.eventType === 'REQUEST_REJECTED' && log.blockReason && (
                                    <div className="text-orange-600">
                                      Reason: {log.blockReason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs space-y-1">
                                  <div className="font-mono truncate">{log.attemptedRoute}</div>
                                  {log.blockReason && (
                                    <div className="text-muted-foreground truncate">
                                      {log.blockReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.ipAddress || '-'}</TableCell>
                            <TableCell>
                              {log.eventType === 'REQUEST_APPROVED' ? (
                                <Badge variant="default" className="bg-green-600">Approved</Badge>
                              ) : log.eventType === 'REQUEST_REJECTED' ? (
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
                Page {currentPage} of {totalPages.toLocaleString()} • {totalLogs.toLocaleString()} total events
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
                        variant={pageNum === currentPage ? "default" : "outline"}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
