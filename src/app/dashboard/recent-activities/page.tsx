'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
}

const getStatusVariant = (status: string) => {
  if (status.toLowerCase().includes('approved') || status.toLowerCase().includes('satisfied')) return 'default';
  if (status.toLowerCase().includes('rejected')) return 'destructive';
  return 'secondary';
};

const RecentActivitiesSkeleton = () => (
  <div>
    <PageHeader
      title="Recent Activities"
      description="An overview of the latest requests and their statuses."
      icon={Activity}
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

  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[]>([]);
  const [isPageLoading, setIsPageLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAuthLoading && (role === ROLES.EMPLOYEE || role === ROLES.PO)) {
      router.replace('/dashboard/profile');
    }
  }, [isAuthLoading, role, router]);

  React.useEffect(() => {
    if (isAuthLoading || !user) return;

    const isDashboardUser = role !== ROLES.EMPLOYEE && role !== ROLES.PO;
    if (!isDashboardUser) {
      setIsPageLoading(false);
      return;
    }

    const fetchRecentActivities = async () => {
      try {
        setIsPageLoading(true);

        const response = await fetch(
          `/api/dashboard/metrics?userRole=${role}&userInstitutionId=${user.institutionId}`,
          { credentials: 'include' }
        );

        const result = await response.json();
        console.log('Recent activities API response:', result);

        if (result.success && result.data?.recentActivities) {
          setRecentActivities(result.data.recentActivities);
        } else {
          console.error('Failed to fetch recent activities:', result.message);
          setRecentActivities([]);
        }
      } catch (error) {
        console.error('Recent activities fetch error:', error);
        toast({
          title: "Error",
          description: "Could not load recent activities.",
          variant: "destructive"
        });
        setRecentActivities([]);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchRecentActivities();
  }, [isAuthLoading, user, role]);

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
  const shouldShowInstitution = (role === ROLES.HRO || role === ROLES.HRRP) && institutionName;

  return (
    <div className="flex-1 space-y-4">
      <PageHeader
        title={shouldShowInstitution ? `Recent Activities - ${institutionName}` : "Recent Activities"}
        description="An overview of the latest requests and their statuses."
        icon={Activity}
      />

      <Card>
        <CardHeader>
          <CardTitle>Latest Requests</CardTitle>
          <CardDescription>
            View the most recent activities across all request types in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Link href={activity.href} passHref legacyBehavior>
                        <a className="font-medium text-primary hover:underline">
                          {activity.id}
                        </a>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{activity.type}</TableCell>
                    <TableCell>{activity.employee}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusVariant(activity.status)}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recent Activities</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                There are no recent activities to display at this time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
