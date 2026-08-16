'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isChunkLoadError, recoverFromChunkLoadError } from '@/lib/chunk-load-recovery';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);
  const triedRecovery = useRef(false);

  useEffect(() => {
    if (isChunkLoadError(error) && !triedRecovery.current) {
      triedRecovery.current = true;
      setReloading(true);
      recoverFromChunkLoadError();
      return;
    }
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body>
        {reloading ? (
          <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-8">
            <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              A new version of the application is available. Reloading...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              An unexpected error occurred. If the page was just updated, a hard
              reload usually fixes it.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload page
              </Button>
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
