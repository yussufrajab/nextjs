'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordRequiredPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState<'temporary' | 'expired' | 'policy'>('temporary');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.replace('/login');
      return;
    }

    // Determine reason for password change
    if (user.isTemporaryPassword) {
      setReason('temporary');
      if (user.temporaryPasswordExpiry) {
        setExpiryDate(new Date(user.temporaryPasswordExpiry));
      }
    } else if (user.mustChangePassword) {
      setReason('policy');
    }
  }, [user, router]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password');
      }

      toast({
        title: 'Success',
        description: 'Your password has been changed successfully. Please login again.',
      });

      // Logout and redirect to login
      await logout();
      router.replace('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Calculate days until expiry
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getMessage = () => {
    switch (reason) {
      case 'temporary':
        return {
          title: 'Temporary Password - Change Required',
          description:
            'You are using a temporary password. For security reasons, you must change your password before continuing.',
        };
      case 'expired':
        return {
          title: 'Password Expired',
          description: 'Your temporary password has expired. Please set a new password.',
        };
      case 'policy':
        return {
          title: 'Password Change Required',
          description: 'Your password must be changed to meet security policy requirements.',
        };
    }
  };

  const message = getMessage();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{message.title}</CardTitle>
          <CardDescription>{message.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert for temporary password with expiry */}
          {reason === 'temporary' && daysUntilExpiry !== null && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Password Expires Soon</AlertTitle>
              <AlertDescription>
                Your temporary password will expire in{' '}
                <span className="font-semibold">
                  {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                </span>
                .
              </AlertDescription>
            </Alert>
          )}

          {/* Important notice */}
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              You cannot access the system until you change your password. This page cannot be
              closed or skipped.
            </AlertDescription>
          </Alert>

          {/* Password Change Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your current password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your new password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                    <PasswordStrengthMeter password={field.value} showRequirements />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Logout
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
