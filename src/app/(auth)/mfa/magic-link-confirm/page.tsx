'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/hooks/use-toast';
import { ROLES } from '@/lib/constants';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchWithCsrf, ensureCsrfToken } from '@/lib/fetch-with-csrf';

export default function MagicLinkConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [expired, setExpired] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setError('Invalid link. No token provided.');
      setExpired(true);
    }
  }, [token]);

  // Pre-fetch a CSRF token cookie (mid-login magic-link confirm) so the
  // confirm POST satisfies double-submit CSRF enforcement.
  React.useEffect(() => {
    ensureCsrfToken();
  }, []);

  async function handleConfirm() {
    if (!token) return;

    setIsLoading(true);
    setError('');

    try {
      await ensureCsrfToken();
      const response = await fetchWithCsrf('/api/auth/mfa/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'This link is invalid or has expired.');
        setExpired(true);
        setIsLoading(false);
        return;
      }

      // MFA verified — set auth state
      const authData = result.data;
      const userData = authData?.user;

      if (userData) {
        useAuthStore.setState({
          user: {
            ...userData,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
            updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          },
          role: userData.role,
          isAuthenticated: true,
        });

        // The server sets the signed `session` HttpOnly cookie via Set-Cookie
        // in completeLogin(). No client-side identity cookie is written.

        if (userData.mustChangePassword || userData.isTemporaryPassword) {
          if (userData.role !== 'EMPLOYEE') {
            toast({
              title: 'Password Change Required',
              description: 'You must change your password to continue.',
            });
            router.push('/change-password-required');
            return;
          } else {
            toast({
              title: 'Password Change Recommended',
              description: 'Please consider changing your password for security. You can update it from your profile.',
              duration: 5000,
            });
          }
        }

        toast({
          title: 'Login Successful',
          description: `Welcome back, ${userData.name || userData.fullName}!`,
        });

        if (userData.role === ROLES.EMPLOYEE) {
          router.push('/dashboard/profile');
        } else if (userData.role === ROLES.PO) {
          router.push('/dashboard/reports');
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo width={120} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-headline flex items-center justify-center gap-2">
            {expired ? (
              <>
                <AlertCircle className="h-6 w-6 text-destructive" />
                Link Expired
              </>
            ) : (
              <>
                <ShieldCheck className="h-6 w-6 text-primary" />
                Confirm Login
              </>
            )}
          </CardTitle>
          <CardDescription>
            {expired
              ? 'This magic link is no longer valid.'
              : 'Click the button below to complete your login.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive text-center mb-4">{error}</p>
          )}
          {!expired && (
            <Button className="w-full" disabled={isLoading} onClick={handleConfirm}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Login
            </Button>
          )}
          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push('/login')}
              className="text-muted-foreground"
            >
              Back to login
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Civil Service Commission. All rights reserved.
      </footer>
    </div>
  );
}