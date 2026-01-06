import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../../utils/auth-helpers';
import { DashboardPage } from '../../pages/dashboard.page';

test.describe('Dashboard Navigation', () => {
  test('HRO should see promotion menu item', async ({ page }) => {
    await loginAs(page, TEST_USERS.HRO);

    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const promotionLink = page.getByRole('link', { name: /promotion/i });
    await expect(promotionLink).toBeVisible();
  });

  test('should navigate to promotion page from dashboard', async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.HRO);

    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.navigateToPromotions();

    expect(page.url()).toContain('/dashboard/promotion');
    // Verify promotion page content is visible
    await expect(
      page.getByText(/promotion.*request/i).first()
    ).toBeVisible();
  });
});
