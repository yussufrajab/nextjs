'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PersonalInfoStep } from '@/components/manual-entry/personal-info-step';
import { EmploymentInfoStep } from '@/components/manual-entry/employment-info-step';
import { DocumentsStep } from '@/components/manual-entry/documents-step';
import { toast } from '@/hooks/use-toast';
import { refreshAuthCookie } from '@/lib/auth-cookie-helper';
import { Button } from '@/components/ui/button';

export default function AddEmployeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionData, setPermissionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check if user is HRO
    if (role !== 'HRO') {
      router.push('/dashboard');
      return;
    }

    // Debug: Log full user object
    console.log('[ADD-EMPLOYEE] Full user object:', user);
    console.log('[ADD-EMPLOYEE] User institutionId:', user?.institutionId);
    console.log('[ADD-EMPLOYEE] User keys:', user ? Object.keys(user) : 'no user');

    // Fetch permission from API
    const checkPermission = async () => {
      // ALWAYS try to refresh user data on page load to get latest state from database
      // This fixes the issue where localStorage has stale data
      if (!user?.institutionId) {
        console.error('[ADD-EMPLOYEE] No institutionId found in user object!');
        console.log('[ADD-EMPLOYEE] Attempting to refresh user data from database...');

        // Try to refresh user data from database
        setIsRefreshing(true);
        try {
          // Import auth store and refresh user data
          const { useAuthStore } = await import('@/store/auth-store');
          const success = await useAuthStore.getState().refreshUserData();

          if (success) {
            console.log('[ADD-EMPLOYEE] Auth state updated successfully!');
            // Get the updated user from the store
            const updatedUser = useAuthStore.getState().user;

            if (updatedUser?.institutionId) {
              console.log('[ADD-EMPLOYEE] User now has institutionId, continuing...');
              // Don't reload, just continue with the updated user
              setIsRefreshing(false);
              // Re-trigger permission check by calling checkPermission again
              // But this time with the updated user, so we need to refetch from state
              const finalUser = useAuthStore.getState().user;
              if (finalUser?.institutionId) {
                try {
                  const response = await fetch(
                    `/api/institutions/${finalUser.institutionId}/manual-entry-permission?t=${Date.now()}`,
                    {
                      cache: 'no-store',
                      headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                      },
                    }
                  );
                  const result = await response.json();

                  if (result.success) {
                    setHasPermission(result.data.hasPermission);
                    setPermissionData(result.data);
                  } else {
                    setHasPermission(false);
                  }
                } catch (error) {
                  console.error('Error checking permission:', error);
                  setHasPermission(false);
                } finally {
                  setIsLoading(false);
                }
                return;
              }
            }

            // If still no institutionId after refresh, show error
            console.error('[ADD-EMPLOYEE] Still no institutionId after refresh');
            setHasPermission(false);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
          } else {
            console.error('[ADD-EMPLOYEE] Failed to refresh user data from database');
          }
        } catch (refreshError) {
          console.error('[ADD-EMPLOYEE] Failed to refresh user data:', refreshError);
        }
        setIsRefreshing(false);

        console.error('[ADD-EMPLOYEE] User needs to logout and login again to refresh auth state');
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/institutions/${user.institutionId}/manual-entry-permission?t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          }
        );
        const result = await response.json();

        if (result.success) {
          setHasPermission(result.data.hasPermission);
          setPermissionData(result.data);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [role, user, router, refreshKey]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    try {
      const { useAuthStore } = await import('@/store/auth-store');
      const success = await useAuthStore.getState().refreshUserData();
      if (success) {
        toast({
          title: 'Success',
          description: 'User data refreshed successfully',
        });
        // Trigger re-check by updating refresh key
        setRefreshKey((prev) => prev + 1);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to refresh user data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh user data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Ensure auth cookie is synced before making API call
      refreshAuthCookie(user, role, true);

      const response = await fetch('/api/employees/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create employee');
      }

      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });

      setNewEmployeeId(result.data.id);
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({});
    setNewEmployeeId(null);
    setCurrentStep(1);
  };

  if (isLoading || isRefreshing) {
    return (
      <div>
        <PageHeader title="Add Employee" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">
              {isRefreshing
                ? 'Refreshing user data from database...'
                : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasPermission) {
    const errorMessage = !user?.institutionId
      ? 'Your user account is missing institution information. Automatic refresh failed. Please logout and login again to refresh your session.'
      : permissionData?.enabled === false
      ? 'Manual employee entry is not enabled for your institution. Please contact the administrator.'
      : permissionData?.isWithinTimeWindow === false
      ? `Manual entry is not available at this time. Available from ${permissionData.startDate ? new Date(permissionData.startDate).toLocaleString() : 'N/A'} to ${permissionData.endDate ? new Date(permissionData.endDate).toLocaleString() : 'N/A'}.`
      : 'You do not have permission to add employees manually.';

    return (
      <div>
        <PageHeader title="Add Employee" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{errorMessage}</p>
            {!user?.institutionId && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="font-semibold text-sm mb-2">Quick fix - Try this first:</p>
                  <Button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh User Data'}
                  </Button>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="font-semibold text-sm mb-2">If that doesn't work:</p>
                  <ol className="text-sm list-decimal list-inside space-y-1">
                    <li>Logout from the system</li>
                    <li>Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)</li>
                    <li>Login again</li>
                  </ol>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Personal Information' },
    { number: 2, title: 'Employment Details' },
    { number: 3, title: 'Documents' },
  ];

  return (
    <div>
      <PageHeader
        title="Add Employee"
        description="Manually enter employee data for your institution"
      />

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`flex items-center gap-2 ${
                    currentStep === step.number
                      ? 'text-primary font-semibold'
                      : currentStep > step.number
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      currentStep === step.number
                        ? 'border-primary bg-primary text-white'
                        : currentStep > step.number
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {step.number}
                  </div>
                  <span className="text-sm hidden md:inline">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / 3) * 100} />
          </div>
          <CardTitle>
            Step {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 &&
              'Enter the employee\'s personal information. Fields marked with * are required.'}
            {currentStep === 2 &&
              'Enter the employee\'s employment and job details.'}
            {currentStep === 3 &&
              'Upload employee documents (optional).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <PersonalInfoStep
              data={formData}
              onChange={handleChange}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <EmploymentInfoStep
              data={formData}
              onChange={handleChange}
              onNext={handleSubmit}
              onPrev={handlePrev}
              isSubmitting={isSubmitting}
            />
          )}
          {currentStep === 3 && newEmployeeId && (
            <DocumentsStep
              employeeId={newEmployeeId}
              employeeName={formData.name || 'Employee'}
              onComplete={handleReset}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
