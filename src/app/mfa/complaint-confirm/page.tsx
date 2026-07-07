'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { fetchWithCsrf, ensureCsrfToken } from '@/lib/fetch-with-csrf';

type VerificationState = 'loading' | 'success' | 'error';

interface VerificationResponse {
  success: boolean;
  complaintId?: string;
  message?: string;
  error?: string;
}

function ComplaintConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [complaintId, setComplaintId] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  const token = searchParams.get('token');
  const complaintData = searchParams.get('complaintData');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Link kisicho sahiki. Hakuna tokeni iliyopatikana.');
      return;
    }

    verifyMagicLink();
  }, [token, complaintData]);

  useEffect(() => {
    if (state === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (state === 'success' && countdown === 0) {
      router.push('/dashboard/complaints');
    }
  }, [state, countdown, router]);

  const verifyMagicLink = async () => {
    try {
      await ensureCsrfToken();
      const response = await fetchWithCsrf(`/api/complaints/magic-link-verify?complaintData=${encodeURIComponent(complaintData || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data: VerificationResponse = await response.json();

      if (response.ok && data.success) {
        setState('success');
        setComplaintId(data.complaintId || '');
        toast({
          title: 'Lalamiko Limewasilishwa!',
          description: `Lalamiko lako limepokelewa. ID: ${data.complaintId}`,
        });
      } else {
        setState('error');
        switch (data.error) {
          case 'TOKEN_EXPIRED':
          case 'INVALID_TOKEN':
            setErrorMessage('Link ilikuwa imekalify. Wasilisha lalamiko tena.');
            break;
          case 'TOKEN_USED':
            setErrorMessage('Hii ombi tayari limetumwa. Angalia malalamiko yako.');
            break;
          case 'TOKEN_NOT_FOUND':
            setErrorMessage('Link kisicho sahiki. Hakuna tokeni iliyopatikana.');
            break;
          default:
            setErrorMessage(data.message || 'Hitilafu imetokea. Tafadhali jaribu tena.');
        }
      }
    } catch {
      setState('error');
      setErrorMessage('Hitilafu ya mtandao. Wasilisha lalamiko tena.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {state === 'loading' && 'Inathibitisha...'}
            {state === 'success' && 'Lalamiko Limewasilishwa!'}
            {state === 'error' && 'Hitilafu'}
          </CardTitle>
          <CardDescription>
            {state === 'loading' && 'Tunathibitisha link yako...'}
            {state === 'success' && 'Lalamiko lako limepokelewa kikamilifu.'}
            {state === 'error' && 'Kuna tatizo na link yako.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {state === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Tafadhali subiri wakati tunathibitisha ombi lako...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Lalamiko lako limepokelewa na linashughulikiwa.
                </p>
                {complaintId && (
                  <p className="text-sm font-medium">
                    ID ya Lalamiko: <span className="font-mono">{complaintId.slice(0, 8)}...</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Kuelekezwa baada ya sekunde {countdown}...
                </p>
              </div>
              <Button onClick={() => router.push('/dashboard/complaints')} className="w-full">
                Angalia Lalamiko
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => router.push('/dashboard/complaints')} variant="outline" className="w-full">
                Rudi Kwenye Malalamiko
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComplaintConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Inathibitisha...</CardTitle>
              <CardDescription>Tunathibitisha link yako...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">Tafadhali subiri...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ComplaintConfirmContent />
    </Suspense>
  );
}