/**
 * Global Test Setup File
 *
 * This file runs before each test file and sets up:
 * - Testing Library DOM matchers
 * - Environment variables
 * - Global mocks
 * - Cleanup functions
 */

import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// =============================================================================
// Environment Variables
// =============================================================================

// Set test environment variables
// @ts-expect-error - Modifying read-only property for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/csms_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:9002';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'test-access-key';
process.env.MINIO_SECRET_KEY = 'test-secret-key';
process.env.MINIO_BUCKET = 'test-bucket';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// =============================================================================
// Global Mocks
// =============================================================================

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  redirect: vi.fn(),
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// Mock console methods to keep test output clean
// (uncomment if you want to suppress console output in tests)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

// =============================================================================
// Global Cleanup
// =============================================================================

// Cleanup after each test
afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Clear all mocks
  vi.clearAllMocks();
});

// =============================================================================
// Global Setup
// =============================================================================

beforeAll(() => {
  // Setup can be done here if needed
  // For example, starting test servers, etc.
});

// =============================================================================
// Custom Matchers (if needed)
// =============================================================================

// You can add custom matchers here
// Example:
// expect.extend({
//   toBeValidPassword(received) {
//     const pass = received.length >= 8;
//     return {
//       message: () => `expected ${received} to be a valid password`,
//       pass,
//     };
//   },
// });
