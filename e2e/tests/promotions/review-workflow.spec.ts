import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../../utils/auth-helpers';
import { PromotionPage } from '../../pages/promotion.page';
import { getTestDb } from '../../utils/db-helpers';

test.describe('Promotion Request Review Workflow', () => {
  test('HRMO should approve and forward promotion request', async ({
    page,
  }) => {
    // Setup: Create a pending promotion request
    const db = getTestDb();
    const promotionRequest = await db.promotionRequest.create({
      data: {
        id: 'test-promo-request-1',
        employeeId: 'test-employee-eligible-1',
        submittedById: TEST_USERS.HRO.id,
        status: 'Pending HRMO/HHRMD Review',
        reviewStage: 'initial',
        proposedCadre: 'Senior Officer Grade I',
        promotionType: 'Experience',
        documents: ['test-doc.pdf'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Login as HRMO
    await loginAs(page, TEST_USERS.HRMO);

    const promotionPage = new PromotionPage(page);
    await promotionPage.navigate();

    // Find the pending request
    await expect(page.getByText('Eligible Employee 1')).toBeVisible();

    // Click "Verify & Forward to Commission" button
    const requestCard = page
      .locator(`text=Eligible Employee 1`)
      .locator('..')
      .locator('..');
    await requestCard.getByRole('button', { name: /verify.*forward/i }).click();

    // Wait for status update
    await page.waitForTimeout(1000);

    // Verify status changed
    const updatedStatus = await promotionPage.getRequestStatus(
      'Eligible Employee 1'
    );
    expect(updatedStatus).toContain('Commission');
  });

  test('HRMO should reject and return promotion request to HRO', async ({
    page,
  }) => {
    // Setup: Create a pending promotion request
    const db = getTestDb();
    await db.promotionRequest.create({
      data: {
        id: 'test-promo-request-2',
        employeeId: 'test-employee-eligible-2',
        submittedById: TEST_USERS.HRO.id,
        status: 'Pending HRMO/HHRMD Review',
        reviewStage: 'initial',
        proposedCadre: 'Senior Officer Grade I',
        promotionType: 'Experience',
        documents: ['test-doc.pdf'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await loginAs(page, TEST_USERS.HRMO);

    const promotionPage = new PromotionPage(page);
    await promotionPage.navigate();

    // Find the pending request
    await expect(page.getByText('Eligible Employee 2')).toBeVisible();

    const requestCard = page
      .locator(`text=Eligible Employee 2`)
      .locator('..')
      .locator('..');

    // Click reject button
    await requestCard.getByRole('button', { name: /reject.*return/i }).click();

    // Fill rejection reason in modal
    await page
      .getByPlaceholder(/enter rejection reason/i)
      .fill('Documents incomplete');
    await page.getByRole('button', { name: /submit rejection/i }).click();

    // Verify status changed
    const updatedStatus = await promotionPage.getRequestStatus(
      'Eligible Employee 2'
    );
    expect(updatedStatus).toContain('HRO');
  });
});
