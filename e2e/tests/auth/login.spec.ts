import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { TEST_USERS } from '../../utils/auth-helpers';

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login(TEST_USERS.HRO.username, TEST_USERS.HRO.password);
    await loginPage.expectSuccessfulLogin();

    // Verify redirect to dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login('invalid_user', 'wrong_password');

    // Wait for error toast
    await loginPage.expectLoginError('Invalid username/email or password');
  });

  test('should lock account after 5 failed attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await loginPage.navigate();
      await loginPage.login(TEST_USERS.HRO.username, 'wrong_password');
      await page.waitForTimeout(1000);
    }

    // 6th attempt should show lockout message
    await loginPage.navigate();
    await loginPage.login(TEST_USERS.HRO.username, 'wrong_password');
    await loginPage.expectLoginError('account has been locked');
  });

  test('should redirect EMPLOYEE role to /dashboard/profile', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login(
      TEST_USERS.EMPLOYEE.username,
      TEST_USERS.EMPLOYEE.password
    );

    await page.waitForURL('/dashboard/profile');
    expect(page.url()).toContain('/dashboard/profile');
  });

  test('should redirect HRO role to /dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login(TEST_USERS.HRO.username, TEST_USERS.HRO.password);

    await page.waitForURL((url) => url.pathname === '/dashboard');
    expect(page.url()).toMatch(/\/dashboard$/);
  });
});
