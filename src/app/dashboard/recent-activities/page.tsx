'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  TrendingUp,
  CalendarOff,
  MessageSquareWarning,
  ShieldAlert,
  Replace,
  UserMinus,
  UserX,
  CalendarPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLES } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface RecentActivity {
  id: string;
  type: string;
  employee: string;
  status: string;
  href: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalActivities: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const getStatusVariant = (status: string) => {
  if (
    status.toLowerCase().includes('approved') ||
    status.toLowerCase().includes('satisfied')
  )
    return 'default';
  if (status.toLowerCase().includes('rejected')) return 'destructive';
  return 'secondary';
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'Confirmation':
      return <UserCheck className="h-4 w-4 text-muted-foreground" />;
    case 'Promotion':
      return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    case 'LWOP':
      return <CalendarOff className="h-4 w-4 text-muted-foreground" />;
    case 'Complaint':
      return <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />;
    case 'Termination':
    case 'Dismissal':
      return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    case 'Change of Cadre':
      return <Replace className="h-4 w-4 text-muted-foreground" />;
    case 'Retirement':
      return <UserMinus className="h-4 w-4 text-muted-foreground" />;
    case 'Resignation':
      return <UserX className="h-4 w-4 text-muted-foreground" />;
    case 'Service Extension':
      return <CalendarPlus className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatActivityDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown date';
  }
};

const RecentActivitiesSkeleton = () => (
  <div>
    <PageHeader
      title="Recent Activities"
      description="An overview of the latest requests and their statuses."
    />
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="ml-auto h-6 w-1/5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function RecentActivitiesPage() {
  const { isLoading: isAuthLoading, user, role } = useAuth();
  const router = useRouter();

  const [recentActivities, setRecentActivities] = React.useState<
    RecentActivity[]
  >([]);
  const [pagination, setPagination] = React.useState<PaginationInfo | null>(
    null
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isPageLoading, setIsPageLoading] = React.useState(true);

  React.useEffect(() => {
    if (
      !isAuthLoading &&
      (role === ROLES.EMPLOYEE || role === ROLES.PO || role === ROLES.ADMIN)
    ) {
      router.replace('/dashboard/profile');
    }
  }, [isAuthLoading, role, router]);

  const fetchRecentActivities = React.useCallback(
    async (page: number) => {
      if (isAuthLoading || !user) return;

      const isDashboardUser =
        role !== ROLES.EMPLOYEE && role !== ROLES.PO && role !== ROLES.ADMIN;
      if (!isDashboardUser) {
        setIsPageLoading(false);
        return;
      }

      try {
        setIsPageLoading(true);

        const response = await fetch(
          `/api/dashboard/metrics?userRole=${role}&userInstitutionId=${user.institutionId}&page=${page}&limit=10`,
          { credentials: 'include' }
        );

        const result = await response.json();
        console.log('Recent activities API response:', result);

        if (result.success && result.data?.recentActivities) {
          setRecentActivities(result.data.recentActivities);
          setPagination(result.data.pagination);
        } else {
          console.error('Failed to fetch recent activities:', result.message);
          setRecentActivities([]);
          setPagination(null);
        }
      } catch (error) {
        console.error('Recent activities fetch error:', error);
        toast({
          title: 'Error',
          description: 'Could not load recent activities.',
          variant: 'destructive',
        });
        setRecentActivities([]);
        setPagination(null);
      } finally {
        setIsPageLoading(false);
      }
    },
    [isAuthLoading, user, role]
  );

  React.useEffect(() => {
    fetchRecentActivities(currentPage);
  }, [fetchRecentActivities, currentPage]);

  const handlePrevPage = () => {
    if (pagination?.hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  if (isAuthLoading || isPageLoading) {
    return <RecentActivitiesSkeleton />;
  }

  // Get institution name for display
  const getInstitutionName = () => {
    if (!user?.institution) return '';
    if (typeof user.institution === 'string') return user.institution;
    return user.institution.name;
  };

  const institutionName = getInstitutionName();
  const shouldShowInstitution =
    (role === ROLES.HRO || role === ROLES.HRRP) && institutionName;

  return (
    <div className="flex-1 space-y-4">
      <PageHeader
        title={
          shouldShowInstitution
            ? `Recent Activities - ${institutionName}`
            : 'Recent Activities'
        }
        description="An overview of the latest requests and their statuses."
      />

      <Card>
        <CardHeader>
          <CardTitle>Latest Requests</CardTitle>
          <CardDescription>
            View the most recent activities across all request types in the
            system.
            {pagination && (
              <span className="ml-2 text-muted-foreground">
                (Showing {recentActivities.length} of{' '}
                {pagination.totalActivities} activities)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Employee/User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Activity Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => router.push(activity.href)}
                  >
                    <TableCell>
                      <Link
                        href={activity.href}
                        className="font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activity.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.type)}
                        <span className="font-medium">{activity.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{activity.employee}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(activity.status)}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatActivityDate(activity.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Recent Activities
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                There are no recent activities to display at this time.
              </p>
            </div>
          )}
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={!pagination.hasPrevPage}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from(
                  { length: Math.min(pagination.totalPages, 5) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (
                      pagination.currentPage >=
                      pagination.totalPages - 2
                    ) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pageNum === pagination.currentPage
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => handlePageClick(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage}
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
  );
}
