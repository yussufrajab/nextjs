'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'reauth-dialog' });

/** Human-readable label for each whitelisted reauth scope. */
const SCOPE_LABELS: Record<string, string> = {
  'admin.reset-password': "reset a user's password",
  'admin.lock-account': 'lock a user account',
  'admin.unlock-account': 'unlock a user account',
  'users.role-change': "change a user's role or institution",
  'users.delete': 'delete a user',
  'institutions.update': 'update an institution',
  'institutions.delete': 'delete an institution',
  'admin.hrims-settings': 'update HRIMS integration settings',
  'hrims.sync': 'sync data from HRIMS',
};

interface ReauthDialogProps {
  open: boolean;
  scope: string | null;
  /** Called with true when re-auth succeeds (reauth cookie issued), false on cancel/failure. */
  onResult: (success: boolean) => void;
}

export function ReauthDialog({ open, scope, onResult }: ReauthDialogProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset internal state whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, scope]);

  const label = scope ? SCOPE_LABELS[scope] ?? 'perform this sensitive action' : 'perform this action';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scope || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onResult(true);
      } else {
        setError(data.error || data.message || 'Re-authentication failed. Please try again.');
        setSubmitting(false);
      }
    } catch (err) {
      log.error({ err, scope }, 'Reauth request failed');
      setError('Network error during re-authentication. Please try again.');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
    onResult(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Re-authentication required
          </DialogTitle>
          <DialogDescription>
            For security, you must confirm your password to {label}. This
            authorization lasts 5 minutes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-password">Current password</Label>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !password}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}