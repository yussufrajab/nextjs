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
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { ROLES } from '@/lib/constants';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { DeviceLimitDialog } from './device-limit-dialog';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: 'Username or email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login, logout } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDeviceLimitDialog, setShowDeviceLimitDialog] = React.useState(false);
  const [activeSessions, setActiveSessions] = React.useState<any[]>([]);
  const [pendingCredentials, setPendingCredentials] = React.useState<{
    username: string;
    password: string;
    userId?: string;
  } | null>(null);

  // Logout any existing user when component mounts
  React.useEffect(() => {
    logout();
  }, [logout]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    console.log('LoginForm onSubmit - data:', data);
    console.log(
      'Username:',
      data.username,
      'Password length:',
      data.password?.length
    );

    try {
      const user = await login(data.username, data.password);
      console.log('LoginForm onSubmit - returned user:', user);

      if (user) {
        // Check if password change is required
        if (user.mustChangePassword || user.isTemporaryPassword) {
          console.log('Password change required for user:', user.id);
          toast({
            title: 'Password Change Required',
            description: 'You must change your password to continue.',
            variant: 'default',
          });
          // Redirect to password change page
          router.push('/change-password-required');
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Login Successful',
          description: `Welcome back, ${user.name}!`,
        });
        if (user.role === ROLES.EMPLOYEE || user.role === ROLES.PO) {
          router.push('/dashboard/profile');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      // Check if error is session limit reached
      if (error.message === 'SESSION_LIMIT_REACHED') {
        console.log('Session limit reached, showing dialog');
        setActiveSessions(error.activeSessions || []);
        setPendingCredentials({
          username: data.username,
          password: data.password,
          userId: error.userId,
        });
        setShowDeviceLimitDialog(true);
        setIsLoading(false);
        return;
      }

      // Display the actual error message from the backend
      const errorMessage = error instanceof Error ? error.message : 'Invalid username/email or password.';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  const handleForceLogout = async (sessionId: string) => {
    try {
      console.log('Force logout for session:', sessionId);

      // Call API to force logout the selected session
      const response = await fetch('/api/auth/sessions/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: pendingCredentials?.userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to terminate session');
      }

      // Close dialog
      setShowDeviceLimitDialog(false);

      // Show success toast
      toast({
        title: 'Device Logged Out',
        description: 'Retrying login...',
      });

      // Wait a moment for session cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Auto-retry login with stored credentials
      if (pendingCredentials) {
        await onSubmit({
          username: pendingCredentials.username,
          password: pendingCredentials.password,
        });
      }
    } catch (error) {
      console.error('Force logout error:', error);
      toast({
        title: 'Error',
        description:
          'Failed to log out the selected device. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username or Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username or email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login
        </Button>
      </form>
      <DeviceLimitDialog
        open={showDeviceLimitDialog}
        onClose={() => {
          setShowDeviceLimitDialog(false);
          setPendingCredentials(null);
          setIsLoading(false);
        }}
        sessions={activeSessions}
        onForceLogout={handleForceLogout}
      />
    </Form>
  );
}
