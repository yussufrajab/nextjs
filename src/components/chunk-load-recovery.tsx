'use client';

// Mount once in the root layout. Listens for unhandled `ChunkLoadError`s that
// escape React's error boundaries (e.g. a dynamic import failing during
// client-side navigation before the boundary can catch it) and recovers via a
// single cache-busting reload.

import { useEffect } from 'react';
import { isChunkLoadError, recoverFromChunkLoadError } from '@/lib/chunk-load-recovery';

export function ChunkLoadRecovery() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error)) {
        // Prevent the default "Something went wrong" surface; we're recovering.
        event.preventDefault();
        recoverFromChunkLoadError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        recoverFromChunkLoadError();
      }
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}