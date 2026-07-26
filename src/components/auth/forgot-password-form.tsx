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
import { toast } from '@/hooks/use-toast';
import { fetchWithCsrf, ensureCsrfToken } from '@/lib/fetch-with-csrf';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  identifier: z.string().min(1, { message: 'Username or email is required.' }),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    ensureCsrfToken();
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '' },
  });

  async function onSubmit(data: Values) {
    setIsLoading(true);
    try {
      await ensureCsrfToken();
      const res = await fetchWithCsrf('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: data.identifier }),
      });
      const json = await res.json();
      // Always show the generic, non-enumerable confirmation.
      setSubmitted(true);
      toast({
        title: 'Check your email',
        description:
          json.message ||
          'If an account with that identifier exists and has an email on file, a reset link has been sent.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account with that identifier exists and has an email on file, a
          reset link has been sent. The link expires in 15 minutes and can be
          used only once.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSubmitted(false);
            form.reset({ identifier: '' });
          }}
        >
          Send another link
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username or Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </Form>
  );
}