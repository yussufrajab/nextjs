import { useState, useEffect } from 'react';

interface FileExistsResult {
  exists: boolean;
  loading: boolean;
  error: string | null;
  metadata?: {
    size: number;
    contentType: string;
    lastModified: string;
  };
}

export function useFileExists(
  url: string | null | undefined
): FileExistsResult {
  const [result, setResult] = useState<FileExistsResult>({
    exists: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setResult({ exists: false, loading: false, error: null });
      return;
    }

    // Extract object key from URL
    const getObjectKeyFromUrl = (fileUrl: string): string | null => {
      try {
        if (fileUrl.startsWith('/api/files/download/')) {
          return fileUrl.replace('/api/files/download/', '');
        }
        // Handle employee-documents URLs (e.g., /api/files/employee-documents/...)
        if (fileUrl.startsWith('/api/files/employee-documents/')) {
          return fileUrl.replace('/api/files/', '');
        }
        // Handle employee-photos URLs (e.g., /api/files/employee-photos/...)
        if (fileUrl.startsWith('/api/files/employee-photos/')) {
          return fileUrl.replace('/api/files/', '');
        }
        return null;
      } catch {
        return null;
      }
    };

    const objectKey = getObjectKeyFromUrl(url);
    if (!objectKey) {
      setResult({ exists: false, loading: false, error: 'Invalid URL format' });
      return;
    }

    let isMounted = true;

    const checkFileExists = async () => {
      setResult((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(
          `/api/files/exists/${encodeURIComponent(objectKey)}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (!isMounted) return;

        const data = await response.json();

        if (data.success) {
          setResult({
            exists: data.exists,
            loading: false,
            error: null,
            metadata: data.metadata,
          });
        } else {
          setResult({
            exists: false,
            loading: false,
            error: data.error || 'Failed to check file existence',
          });
        }
      } catch (error) {
        if (!isMounted) return;

        setResult({
          exists: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    };

    checkFileExists();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return result;
}
