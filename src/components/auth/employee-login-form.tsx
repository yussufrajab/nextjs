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
import { fetchWithCsrf, ensureCsrfToken } from '@/lib/fetch-with-csrf';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, User, CreditCard, Hash, Mail } from 'lucide-react';

const employeeLoginSchema = z.object({
  zanId: z.string().min(1, { message: 'ZAN ID is required.' }),
  zssfNumber: z.string().min(1, { message: 'ZSSF Number is required.' }),
  payrollNumber: z.string().min(1, { message: 'Payroll Number is required.' }),
});

const governmentEmailSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Government email is required.' })
    .email({ message: 'Please enter a valid email address.' }),
});

type EmployeeLoginValues = z.infer<typeof employeeLoginSchema>;
type GovernmentEmailValues = z.infer<typeof governmentEmailSchema>;

export function EmployeeLoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  // Step 1: collect credentials. Step 2: capture government email (only when
  // the server reports EMAIL_REQUIRED — i.e. no email is stored yet).
  const [step, setStep] = React.useState<1 | 2>(1);
  const [pendingUserId, setPendingUserId] = React.useState('');
  const [pendingCreds, setPendingCreds] = React.useState<EmployeeLoginValues | null>(null);

  // Clear any existing auth state when component mounts (without API call)
  React.useEffect(() => {
    // Clear auth state locally without making API call
    useAuthStore.setState({
      user: null,
      role: null,
      isAuthenticated: false,
    });
  }, []);

  // Pre-fetch a CSRF token cookie so employee login satisfies double-submit
  // CSRF enforcement (no post-login cookie exists yet). Re-ensured in onSubmit.
  React.useEffect(() => {
    ensureCsrfToken();
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
      await ensureCsrfToken();
      const response = await fetchWithCsrf('/api/auth/employee-login', {
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

        // Server needs a government email before MFA can be sent.
        if (result.code === 'EMAIL_REQUIRED') {
          setPendingUserId(result.data?.userId || '');
          setPendingCreds(data);
          setStep(2);
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
    } catch (_error) {
      toast({
        title: 'Login Error',
        description: 'An error occurred during login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 2) {
    return (
      <GovernmentEmailStep
        pendingUserId={pendingUserId}
        pendingCreds={pendingCreds}
        onBack={() => setStep(1)}
        onComplete={(target: string) => router.push(target)}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

interface GovernmentEmailStepProps {
  pendingUserId: string;
  pendingCreds: EmployeeLoginValues | null;
  onBack: () => void;
  onComplete: (target: string) => void;
}

function GovernmentEmailStep({
  pendingUserId,
  pendingCreds,
  onBack,
  onComplete,
}: GovernmentEmailStepProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const emailForm = useForm<GovernmentEmailValues>({
    resolver: zodResolver(governmentEmailSchema),
    defaultValues: { email: '' },
  });

  async function onEmailSubmit(data: GovernmentEmailValues) {
    if (!pendingCreds) return;
    setIsLoading(true);

    try {
      await ensureCsrfToken();
      const response = await fetchWithCsrf('/api/auth/employee-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Re-send the credentials plus the captured government email so the
        // server can persist it and then start MFA.
        body: JSON.stringify({ ...pendingCreds, email: data.email }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.code === 'MFA_REQUIRED') {
        const params = new URLSearchParams({
          userId: result.data?.userId || pendingUserId,
          email: result.data?.email || '',
        });
        onComplete(`/mfa-verify?${params.toString()}`);
        setIsLoading(false);
        return;
      }

      // 400 (bad domain) or 409 (duplicate) — show the server message and let
      // the employee correct the address without losing their credentials.
      toast({
        title: 'Email Error',
        description: result.message || 'Could not save the email address. Please try again.',
        variant: 'destructive',
      });
    } catch (_error) {
      toast({
        title: 'Email Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4" noValidate>
        <div className="mb-2 text-sm text-muted-foreground">
          Please provide your Government Email Address. It will be saved to your
          profile and used for verification when submitting complaints.
        </div>
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Government Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@gov.go.tz"
                  {...field}
                  className="pl-4"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Must end with .go.tz or .ac.tz (government or academic domain).
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue
        </Button>
        <Button
          type="button"
          variant="link"
          className="w-full text-muted-foreground"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
      </form>
    </Form>
  );
}
