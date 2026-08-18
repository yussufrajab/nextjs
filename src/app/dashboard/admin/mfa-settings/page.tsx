'use client';

import { PageHeader } from '@/components/shared/page-header';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ShieldOff, RefreshCw, Lock, Unlock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'admin-mfa-settings' });

export default function MfaSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/mfa-settings');
      const result = await response.json();
      if (result.success && typeof result.data?.enabled === 'boolean') {
        setEnabled(result.data.enabled);
        setLoaded(true);
      }
    } catch (error) {
      log.error({ err: error }, 'Error fetching MFA policy');
      toast({
        title: 'Error',
        description: 'Failed to load MFA settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (next: boolean) => {
    const confirmed = window.confirm(
      next
        ? 'Enable MFA for ALL users? Every other user will be logged out and must log in again with MFA. Your admin session stays active.'
        : 'Disable MFA for ALL users? Every other user will be logged out and can log in with password only. Your admin session stays active.'
    );
    if (!confirmed) return;
    setIsSaving(true);
    const previous = enabled;
    setEnabled(next); // optimistic
    try {
      const response = await fetchWithCsrf('/api/admin/mfa-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: next ? 'MFA Enabled' : 'MFA Disabled',
          description: result.message,
        });
      } else {
        setEnabled(previous); // revert
        toast({
          title: 'Error',
          description: result.message || 'Failed to update MFA setting',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setEnabled(previous); // revert
      log.error({ err: error }, 'Error updating MFA policy');
      toast({
        title: 'Error',
        description: 'Failed to update MFA settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="MFA Settings"
          description="Control multi-factor authentication for all users"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading…</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="MFA Settings"
        description="Control multi-factor authentication for all users"
      />

      {/* Status summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldOff className="h-5 w-5 text-amber-600" />
            )}
            Current Status
          </CardTitle>
          <CardDescription>
            The current multi-factor authentication enforcement policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge
              variant={enabled ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {enabled ? 'MFA Required' : 'MFA Disabled'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPolicy}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {enabled ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            MFA Enforcement
          </CardTitle>
          <CardDescription>
            When enabled, every user must complete multi-factor authentication
            (a one-time code sent to their email) before they can log in. When
            disabled, users can log in with just their username and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? 'All users must verify with an email code on every login.'
                  : 'Users log in with password only — no verification code required.'}
              </p>
              <p className="text-xs text-amber-600 font-medium">
                Changing this setting immediately logs out every other user — they must log in again under the new policy. Your admin session is preserved.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={isSaving || !loaded}
              aria-label="Toggle MFA enforcement"
            />
          </div>

          {isSaving && (
            <div className="mt-3 flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}