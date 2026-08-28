'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isChunkLoadError, recoverFromChunkLoadError } from '@/lib/chunk-load-recovery';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);
  const triedRecovery = useRef(false);

  useEffect(() => {
    console.error('Dashboard error:', error);

    // ChunkLoadError happens when the browser holds stale chunk filenames
    // from a previous build. Reload once to fetch the current build's chunks.
    if (isChunkLoadError(error) && !triedRecovery.current) {
      triedRecovery.current = true;
      setReloading(true);
      recoverFromChunkLoadError();
    }
  }, [error]);

  if (reloading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          A new version of the application is available. Reloading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        An unexpected error occurred. If the page was just updated, a hard
        reload usually fixes it. Press the button below or
        <kbd className="mx-1 rounded border bg-muted px-1.5 py-0.5 text-xs">
          Ctrl + Shift + R
        </kbd>
        to force a refresh.
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
  );
}
