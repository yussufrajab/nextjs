'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PasswordExpirationBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/password-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          const result = await response.json();
          setStatus(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch password status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [user?.id]);

  if (loading || !status) return null;

  // Don't show banner for temporary passwords (they have their own expiry)
  if (status.isTemporaryPassword) return null;

  // Show critical banner if in grace period
  if (status.isInGracePeriod) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Password Expired - Grace Period Active</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your password has expired. You have {status.gracePeriodDaysRemaining} day
            {status.gracePeriodDaysRemaining !== 1 ? 's' : ''} remaining to change it before your
            account is locked.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/change-password-required')}
            className="ml-4"
          >
            Change Password Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning banner if expiring soon (14 days or less)
  if (status.daysUntilExpiration !== null && status.daysUntilExpiration <= 14) {
    const isUrgent = status.daysUntilExpiration <= 3;

    return (
      <Alert variant={isUrgent ? 'destructive' : 'default'} className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>
          {isUrgent ? 'Password Expiring Soon' : 'Password Expiration Notice'}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your password will expire in {status.daysUntilExpiration} day
            {status.daysUntilExpiration !== 1 ? 's' : ''} (on{' '}
            {new Date(status.passwordExpiresAt).toLocaleDateString()}). Please change it soon.
          </span>
          <Button
            variant={isUrgent ? 'default' : 'outline'}
            size="sm"
            onClick={() => router.push('/change-password-required')}
            className="ml-4"
          >
            Change Password
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
