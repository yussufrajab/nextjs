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

const loginFormSchema = z.object({
  username: z.string().min(1, { message: 'Username or email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login, logout } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

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
    console.log('Username:', data.username, 'Password length:', data.password?.length);
    const user = await login(data.username, data.password);
    console.log('LoginForm onSubmit - returned user:', user);

    if (user) {
      // Check if password change is required
      // @ts-ignore - password status fields added by password policy
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
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid username/email or password.',
        variant: 'destructive',
      });
      setIsLoading(false);
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
                <Input type="password" placeholder="Enter your password" {...field} />
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
    </Form>
  );
}
