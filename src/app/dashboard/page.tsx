
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  TrendingUp,
  CalendarOff,
  ShieldAlert,
  MessageSquareWarning,
  AlertTriangle,
  Replace,
  UserMinus,
  UserX,
  CalendarPlus,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLES } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

interface DashboardStats {
  totalEmployees: number;
  pendingConfirmations: number;
  pendingPromotions: number;
  employeesOnLwop: number;
  pendingTerminations: number;
  openComplaints: number;
  pendingCadreChanges: number;
  pendingRetirements: number;
  pendingResignations: number;
  pendingServiceExtensions: number;
}

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

const DashboardSkeleton = () => (
  <div>
    <PageHeader title="Dashboard" description="Manage all your HR processes in one place." />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
      {[...Array(10)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-1/2 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>An overview of the latest requests and their statuses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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

export default function DashboardPage() {
  const { isLoading: isAuthLoading, user, role } = useAuth();
  const router = useRouter();

  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[]>([]);
  const [urgentCount, setUrgentCount] = React.useState(0);
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

    const fetchDashboardData = async () => {
        try {
            console.log('=== Testing API connectivity ===');
            // First test a simple endpoint
            try {
                const testResponse = await fetch('/api/test');
                const testData = await testResponse.json();
                console.log('Test API response:', testData);
            } catch (testError) {
                console.error('Test API failed:', testError);
            }
            
            console.log('=== Fetching dashboard data ===');
            
            // Test direct API call to bypass API client
            try {
                const directResponse = await fetch('/api/dashboard/metrics', {
                    credentials: 'include'
                });
                const directData = await directResponse.json();
                console.log('Direct API response:', directData);
                
                if (directData.success && directData.data) {
                    setStats(directData.data.stats);
                    setRecentActivities(directData.data.recentActivities);
                    return; // Skip the API client call if direct call works
                }
            } catch (directError) {
                console.error('Direct API call failed:', directError);
            }
            
            const response = await apiClient.getDashboardSummary();
            console.log('Dashboard response:', response);
            
            if (!response.success || !response.data) {
                throw new Error(response.message || "Failed to fetch dashboard summary");
            }
            
            // Check the response structure and handle accordingly
            if (response.data.stats && response.data.recentActivities) {
                setStats(response.data.stats);
                setRecentActivities(response.data.recentActivities);
            } else {
                // Handle case where data structure is different
                console.log('Unexpected data structure:', response.data);
                setStats(response.data.stats || null);
                setRecentActivities(response.data.recentActivities || []);
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            // Ensure recentActivities stays as array to prevent map error
            setRecentActivities([]);
        }
    };
    
    const fetchUrgentCount = async () => {
        if (role === ROLES.HRO || role === ROLES.HRRP) {
            if (!user.institutionId) return;
            try {
                // Note: This endpoint would need to be implemented in the Spring Boot backend
                // For now, we'll skip this until the backend endpoint is available
                console.log("Urgent actions endpoint not yet implemented in Spring Boot backend");
                setUrgentCount(0);
            } catch (error) {
                console.error("Could not load urgent actions count.");
            }
        }
    };

    const loadAllData = async () => {
        setIsPageLoading(true);
        await Promise.all([fetchDashboardData(), fetchUrgentCount()]);
        setIsPageLoading(false);
    }

    loadAllData();

  }, [isAuthLoading, user, role]);

  if (isAuthLoading || isPageLoading || role === ROLES.EMPLOYEE || role === ROLES.PO) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4">
      <PageHeader
        title="Dashboard"
        description="Manage all your HR processes in one place."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
{(role === ROLES.HRO || role === ROLES.HHRMD || role === ROLES.HRMO || role === ROLES.CSCS || role === ROLES.DO || role === ROLES.PO) ? (
          <Link href="/dashboard/profile">
            <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEmployees ?? '...'}</div>
                <p className="text-xs text-muted-foreground">Updated just now</p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmployees ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        )}
        <Link href="/dashboard/confirmation">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Confirmations</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingConfirmations ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/promotion">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Promotions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingPromotions ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/lwop">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees on LWOP</CardTitle>
              <CalendarOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.employeesOnLwop ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/termination">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Terminations</CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingTerminations ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/cadre-change">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Cadre Changes</CardTitle>
              <Replace className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingCadreChanges ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/retirement">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Retirements</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingRetirements ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/resignation">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Resignations</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingResignations ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/service-extension">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Service Extensions</CardTitle>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingServiceExtensions ?? '...'}</div>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </CardContent>
          </Card>
        </Link>
        {(role === ROLES.HRO || role === ROLES.HRRP) ? (
          <Link href="/dashboard/urgent-actions">
            <Card className="hover:bg-accent hover:text-accent-foreground transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{urgentCount}</div>
                <p className="text-xs text-muted-foreground">Items needing review</p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/dashboard/complaints">
            <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
                <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.openComplaints ?? '...'}</div>
                <p className="text-xs text-muted-foreground">Updated just now</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
      
      <div className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>An overview of the latest requests and their statuses.</CardDescription>
          </CardHeader>
          <CardContent>
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
                {Array.isArray(recentActivities) && recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Link href={activity.href} passHref legacyBehavior>
                          <a className="font-medium text-primary hover:underline">{activity.id}</a>
                        </Link>
                      </TableCell>
                      <TableCell>{activity.type}</TableCell>
                      <TableCell>{activity.employee}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStatusVariant(activity.status)}>{activity.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No recent activities to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
