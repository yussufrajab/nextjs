'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ReauthDialog } from '@/components/auth/reauth-dialog';
import { setReauthHandler } from '@/lib/reauth-client';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'reauth-provider' });

interface PendingReauth {
  scope: string;
  resolve: (success: boolean) => void;
}

/**
 * Mounts the step-up re-auth dialog and registers the handler that
 * `requestReauth` (src/lib/reauth-client.ts) delegates to.
 *
 * When a Tier-1 request returns 401 REAUTH_REQUIRED, ApiClient /
 * `fetchWithReauth` call `requestReauth(scope)`. That invokes the handler
 * registered here, which opens {@link ReauthDialog} and resolves the promise
 * once the user confirms (cookie issued) or cancels. The caller then retries
 * the original request (or surfaces the original 401 on cancel).
 *
 * Mount this once near the top of the authenticated area (dashboard layout).
 * Re-auth is a no-op when the provider is absent — callers simply receive the
 * original 401.
 */
export function ReauthProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingReauth | null>(null);

  const handler = useCallback((scope: string): Promise<boolean> => {
    log.info({ scope }, 'Step-up reauth requested');
    return new Promise<boolean>((resolve) => {
      setPending({ scope, resolve });
    });
  }, []);

  useEffect(() => {
    setReauthHandler(handler);
    return () => setReauthHandler(null);
  }, [handler]);

  const handleResult = useCallback(
    (success: boolean) => {
      setPending((current) => {
        current?.resolve(success);
        return null; // closes the dialog
      });
    },
    []
  );

  return (
    <>
      {children}
      <ReauthDialog
        open={pending !== null}
        scope={pending?.scope ?? null}
        onResult={handleResult}
      />
    </>
  );
}