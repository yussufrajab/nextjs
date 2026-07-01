'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, User, CreditCard, Hash } from 'lucide-react';

const employeeLoginSchema = z.object({
  zanId: z.string().min(1, { message: 'ZAN ID is required.' }),
  zssfNumber: z.string().min(1, { message: 'ZSSF Number is required.' }),
  payrollNumber: z.string().min(1, { message: 'Payroll Number is required.' }),
});

type EmployeeLoginValues = z.infer<typeof employeeLoginSchema>;

export function EmployeeLoginForm() {
  const router = useRouter();
  const { setUserManually } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

  // Clear any existing auth state when component mounts (without API call)
  React.useEffect(() => {
    // Clear auth state locally without making API call
    useAuthStore.setState({
      user: null,
      role: null,
      isAuthenticated: false,
    });
  }, []);

  const form = useForm<EmployeeLoginValues>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: {
      zanId: '',
      zssfNumber: '',
      payrollNumber: '',
    },
  });

  async function onSubmit(data: EmployeeLoginValues) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Check if MFA is required
        if (result.code === 'MFA_REQUIRED') {
          const params = new URLSearchParams({
            userId: result.data?.userId || '',
            email: result.data?.email || '',
          });
          router.push(`/mfa-verify?${params.toString()}`);
          setIsLoading(false);
          return;
        }
        // Use the auth store to set user data with session and CSRF tokens
        // Handle both response formats: direct (result.user) and completeLogin (result.data.user)
        const userData = result.user || result.data?.user;

        useAuthStore.setState({
          user: userData,
          role: userData?.role,
          isAuthenticated: true,
        });

        // The server sets the signed `session` HttpOnly cookie via Set-Cookie
        // in completeLogin(). No client-side identity cookie is written.

        toast({
          title: 'Login Successful',
          description: `Welcome, ${userData?.name || ''}!`,
        });

        // Redirect to employee dashboard/profile
        router.push('/dashboard/profile');
      } else {
        toast({
          title: 'Login Failed',
          description: result.message || 'Invalid employee credentials.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Login Error',
        description: 'An error occurred during login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="zanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                ZAN ID
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your ZAN ID"
                  {...field}
                  className="pl-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zssfNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                ZSSF Number
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your ZSSF Number"
                  {...field}
                  className="pl-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payrollNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Payroll Number
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your Payroll Number"
                  {...field}
                  className="pl-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login as Employee
        </Button>
      </form>
    </Form>
  );
}
