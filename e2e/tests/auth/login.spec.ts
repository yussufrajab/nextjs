import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { TEST_USERS } from '../../utils/auth-helpers';
import { getTestDb } from '../../utils/db-helpers';

// RC6: the app intentionally returns a generic "Invalid username/email or
// password" error for locked accounts (security control 1.11 — never reveal
// the account is locked), so the lock-account test must verify lockout via the
// DB, not the toast. The 5 failed attempts also leave test_hro LOCKED, which
// would poison every later test that logs in as HRO (HRO redirect, navigation,
// promotion submission). Reset the HRO account after each auth test so the
// suite never carries a locked account forward.
async function resetHroAccount() {
  const db = getTestDb();
  await db.user.update({
    where: { username: TEST_USERS.HRO.username },
    data: {
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      loginLockoutType: null,
      loginLockoutReason: null,
      active: true,
    },
  });
}

test.describe('Authentication Flow', () => {
  test.afterEach(async () => {
    await resetHroAccount().catch(() => {});
  });

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
    const db = getTestDb();

    // Reset any prior state so the attempt count is deterministic.
    await resetHroAccount();

    // Attempt 5 failed logins (MAX_FAILED_LOGIN_ATTEMPTS = 5 → account locks
    // on the 5th).
    for (let i = 0; i < 5; i++) {
      await loginPage.navigate();
      await loginPage.login(TEST_USERS.HRO.username, 'wrong_password');
      await page.waitForTimeout(1000);
    }

    // The app returns a generic error for locked accounts (control 1.11), so
    // verify the lockout via the DB rather than the toast.
    const user = await db.user.findUnique({
      where: { username: TEST_USERS.HRO.username },
      select: {
        failedLoginAttempts: true,
        loginLockedUntil: true,
        loginLockoutType: true,
        active: true,
      },
    });
    expect(user?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(user?.active).toBe(false);
    expect(user?.loginLockedUntil).not.toBeNull();

    // afterEach resets the HRO account so downstream tests aren't poisoned.
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
