/**
 * Component Tests for LoginForm
 *
 * Testing login form rendering, validation, and submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

// Mock the auth store
vi.mock('@/store/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe('LoginForm', () => {
  // Mock functions
  const mockLogin = vi.fn();
  const mockLogout = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (useAuthStore as any).mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
    });

    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });
  });

  // =============================================================================
  // Rendering Tests
  // =============================================================================

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should render empty input fields initially', () => {
      render(<LoginForm />);

      const usernameInput = screen.getByLabelText(/username or email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(usernameInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });

    it('should render login button as enabled initially', () => {
      render(<LoginForm />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toBeEnabled();
    });

    it('should call logout on component mount', () => {
      render(<LoginForm />);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Validation Tests
  // =============================================================================

  describe('Validation', () => {
    it('should show error when username is empty', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/username or email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show both errors when both fields are empty', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/username or email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when fields are filled', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.queryByText(/username or email is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // User Interaction Tests
  // =============================================================================

  describe('User Interactions', () => {
    it('should allow typing in username field', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const usernameInput = screen.getByLabelText(/username or email/i);
      await user.type(usernameInput, 'testuser');

      expect(usernameInput).toHaveValue('testuser');
    });

    it('should allow typing in password field', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'Password123!');

      expect(passwordInput).toHaveValue('Password123!');
    });

    it('should mask password input', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // =============================================================================
  // Form Submission Tests
  // =============================================================================

  describe('Form Submission', () => {
    it('should call login with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'Password123!');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: '1', username: 'test', role: 'HRO', name: 'Test' }), 100))
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Button should show loading state
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should redirect to dashboard on successful login for HRO', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect to profile for EMPLOYEE role', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'employee',
        role: 'EMPLOYEE',
        name: 'Employee User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'employee');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/profile');
      });
    });

    it('should redirect to password change page if password change required', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
        mustChangePassword: true,
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/change-password-required');
      });
    });

    it('should handle failed login gracefully', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(null); // Login failed

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'WrongPassword123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not submit form with only username filled', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should not submit form with only password filled', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
        expect(screen.getByText(/username or email is required/i)).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in username', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'test@user.com',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'test@user.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@user.com', 'Password123!');
      });
    });

    it('should handle whitespace in inputs', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), '  testuser  ');
      await user.type(screen.getByLabelText(/password/i), '  Password123!  ');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        // Should preserve whitespace (backend will handle trimming if needed)
        expect(mockLogin).toHaveBeenCalledWith('  testuser  ', '  Password123!  ');
      });
    });
  });
});
