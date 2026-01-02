/**
 * Custom Test Utilities
 *
 * Provides custom render functions and utilities for testing React components
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Add any providers your app needs here
// For example: AuthProvider, QueryClientProvider, etc.

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // If you have global providers, wrap them here
  // const Wrapper = ({ children }: { children: React.ReactNode }) => {
  //   return <AuthProvider>{children}</AuthProvider>;
  // };

  return render(ui, { ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react';

// Override render with our custom version
export { renderWithProviders as render };
