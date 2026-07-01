'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/hooks/use-toast';
import { ROLES } from '@/lib/constants';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

const RATE_LIMIT_SECONDS = 60;

interface MfaVerifyFormProps {
  userId: string;
  email: string;
}

export function MfaVerifyForm({ userId, email }: MfaVerifyFormProps) {
  const router = useRouter();
  const [otp, setOtp] = React.useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(null);
  const [cooldown, setCooldown] = React.useState(RATE_LIMIT_SECONDS);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const isVerifying = React.useRef(false);

  // Cooldown timer for resend
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-submit when all 6 digits are entered
  React.useEffect(() => {
    if (otp.every((d) => d.length === 1) && !isVerifying.current) {
      handleVerify();
    }
  }, [otp]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    if (pasted.length > 0) {
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6 || isVerifying.current) return;

    isVerifying.current = true;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otpCode: code }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.data?.remainingAttempts !== undefined) {
          setRemainingAttempts(result.data.remainingAttempts);
        }

        if (result.code === 'SESSION_LIMIT_REACHED') {
          toast({
            title: 'Session Limit',
            description: result.message,
            variant: 'destructive',
          });
          router.push('/login');
          return;
        }

        setError(result.message || 'Invalid verification code');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        isVerifying.current = false;
        setIsLoading(false);
        return;
      }

      // MFA verified — set auth state from the login response
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

        // Check password change recommended (but don't force EMPLOYEE role)
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
    } catch (err) {
      setError('An error occurred. Please try again.');
      isVerifying.current = false;
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setError('');
    setOtp(['', '', '', '', '', '']);

    try {
      const response = await fetch('/api/auth/mfa/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Code Sent',
          description: 'A new verification code has been sent to your email.',
        });
        setCooldown(RATE_LIMIT_SECONDS);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.message || 'Failed to resend code');
      }
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* OTP Input */}
      <div className="flex justify-center gap-2">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors bg-background"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Remaining attempts */}
      {remainingAttempts !== null && remainingAttempts > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
        </p>
      )}

      {/* Submit button */}
      <Button
        className="w-full"
        disabled={isLoading || otp.some((d) => !d)}
        onClick={handleVerify}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify
      </Button>

      {/* Resend button */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          disabled={cooldown > 0 || isResending}
          onClick={handleResend}
        >
          {isResending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : 'Resend code'}
        </Button>
      </div>

      {/* Back to login */}
      <div className="text-center">
        <Button
          variant="link"
          size="sm"
          onClick={() => router.push('/login')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Button>
      </div>
    </div>
  );
}