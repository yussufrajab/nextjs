import { Page, expect } from '@playwright/test';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
}

export const TEST_USERS = {
  HRO: {
    id: 'test-hro-1',
    username: 'test_hro',
    password: 'Test@1234',
    role: 'HRO',
    name: 'Test HRO',
  },
  HRMO: {
    id: 'test-hrmo-1',
    username: 'test_hrmo',
    password: 'Test@1234',
    role: 'HRMO',
    name: 'Test HRMO',
  },
  HHRMD: {
    id: 'test-hhrmd-1',
    username: 'test_hhrmd',
    password: 'Test@1234',
    role: 'HHRMD',
    name: 'Test HHRMD',
  },
  EMPLOYEE: {
    id: 'test-employee-user-1',
    username: 'test_employee',
    password: 'Test@1234',
    role: 'EMPLOYEE',
    name: 'John Doe',
  },
};

/**
 * Login as a specific user
 */
export async function loginAs(page: Page, user: TestUser) {
  await page.goto('/login');

  // Fill login form
  await page.getByLabel(/username or email/i).fill(user.username);
  await page.getByLabel(/password/i).fill(user.password);

  // Click login button
  await page.getByRole('button', { name: /^login$/i }).click();

  // Wait for navigation after successful login
  await page.waitForURL((url) => url.pathname.includes('/dashboard'), {
    timeout: 10000,
  });

  // Verify login success by checking for user name or dashboard content
  await expect(page.getByText(user.name)).toBeVisible({ timeout: 5000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Click user menu or logout button
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
}
