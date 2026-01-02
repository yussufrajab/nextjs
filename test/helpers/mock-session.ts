/**
 * Mock Session Helper for Testing
 *
 * Provides utilities to mock authenticated sessions in tests
 */

import { vi } from 'vitest';

export interface MockUser {
  id: string;
  username: string;
  role: string;
  institutionId?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Mock authenticated session
 * Use this to simulate a logged-in user in tests
 */
export const mockSession = (user: MockUser) => {
  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      institutionId: user.institutionId,
      firstName: user.firstName || 'Test',
      lastName: user.lastName || 'User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};

/**
 * Mock unauthenticated session
 * Use this to simulate a logged-out user in tests
 */
export const mockNoSession = () => {
  return null;
};

/**
 * Create a mock JWT token
 */
export const mockJwtToken = (user: MockUser) => {
  return `mock-jwt-token-${user.id}`;
};
