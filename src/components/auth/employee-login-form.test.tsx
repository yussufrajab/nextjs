/**
 * Component Tests for EmployeeLoginForm
 *
 * Verifies the two-step login flow:
 *  - Step 1: collect ZAN ID / ZSSF / Payroll
 *  - If the server responds EMAIL_REQUIRED (no stored government email), a
 *    second step is shown to capture the government email.
 *  - Submitting a valid government email that returns MFA_REQUIRED routes to
 *    /mfa-verify. Submitting a duplicate/invalid email shows a destructive toast.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeLoginForm } from './employee-login-form';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

const { mockAuthSetState } = vi.hoisted(() => ({
  mockAuthSetState: vi.fn(),
}));

const mockEnsureCsrfToken = vi.fn(() => Promise.resolve());
const mockFetchWithCsrf = vi.fn<(url: string, init?: any) => Promise<any>>();

vi.mock('@/lib/fetch-with-csrf', () => ({
  fetchWithCsrf: (...args: any[]) => mockFetchWithCsrf(args[0], args[1]),
  ensureCsrfToken: (...args: any[]) => (mockEnsureCsrfToken as any)(...args),
}));

vi.mock('@/store/auth-store', () => {
  const store: any = vi.fn();
  store.setState = mockAuthSetState;
  return { useAuthStore: store };
});

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

function jsonResponse(body: unknown, status = 200): any {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('EmployeeLoginForm', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      setUserManually: vi.fn(),
    });
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  const creds = { zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1' };

  async function fillAndSubmitCreds(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/ZAN ID/i), creds.zanId);
    await user.type(screen.getByLabelText(/ZSSF Number/i), creds.zssfNumber);
    await user.type(screen.getByLabelText(/Payroll Number/i), creds.payrollNumber);
    await user.click(screen.getByRole('button', { name: /login as employee/i }));
  }

  it('shows the government email step when the server returns EMAIL_REQUIRED', async () => {
    const user = userEvent.setup();
    mockFetchWithCsrf.mockResolvedValue(
      jsonResponse({ success: true, code: 'EMAIL_REQUIRED', data: { userId: 'u1' } })
    );

    render(<EmployeeLoginForm />);
    await fillAndSubmitCreds(user);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('name@gov.go.tz')).toBeInTheDocument();
    });
    // Should NOT have routed to /mfa-verify yet.
    expect(mockPush).not.toHaveBeenCalled();
    // Credentials were sent without an email on the first call.
    expect(mockFetchWithCsrf).toHaveBeenCalledWith(
      '/api/auth/employee-login',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(creds) })
    );
  });

  it('submits the captured email and routes to /mfa-verify on MFA_REQUIRED', async () => {
    const user = userEvent.setup();
    mockFetchWithCsrf
      .mockResolvedValueOnce(
        jsonResponse({ success: true, code: 'EMAIL_REQUIRED', data: { userId: 'u1' } })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          code: 'MFA_REQUIRED',
          data: { userId: 'u1', email: 'a***@gov.go.tz' },
        })
      );

    render(<EmployeeLoginForm />);
    await fillAndSubmitCreds(user);

    const emailInput = await screen.findByPlaceholderText('name@gov.go.tz');
    await user.type(emailInput, 'asha@gov.go.tz');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/mfa-verify?')
      );
    });
    // The second call must include the captured email alongside the creds.
    const secondCall = mockFetchWithCsrf.mock.calls[1];
    expect(JSON.parse(secondCall[1].body)).toEqual({
      ...creds,
      email: 'asha@gov.go.tz',
    });
  });

  it('shows a destructive toast and stays on the email step on a duplicate email', async () => {
    const user = userEvent.setup();
    const { toast } = await import('@/hooks/use-toast');
    mockFetchWithCsrf
      .mockResolvedValueOnce(
        jsonResponse({ success: true, code: 'EMAIL_REQUIRED', data: { userId: 'u1' } })
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { success: false, message: 'This email address is already in use by another employee' },
          409
        )
      );

    render(<EmployeeLoginForm />);
    await fillAndSubmitCreds(user);

    const emailInput = await screen.findByPlaceholderText('name@gov.go.tz');
    await user.type(emailInput, 'taken@gov.go.tz');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
    // Still on the email step, not routed away.
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('name@gov.go.tz')).toBeInTheDocument();
  });

  it('routes straight to /mfa-verify when the server returns MFA_REQUIRED on step 1', async () => {
    const user = userEvent.setup();
    mockFetchWithCsrf.mockResolvedValue(
      jsonResponse({
        success: true,
        code: 'MFA_REQUIRED',
        data: { userId: 'u1', email: 'a***@gov.go.tz' },
      })
    );

    render(<EmployeeLoginForm />);
    await fillAndSubmitCreds(user);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/mfa-verify?'));
    });
    // Email step should never have appeared.
    expect(screen.queryByPlaceholderText('name@gov.go.tz')).not.toBeInTheDocument();
  });
});
