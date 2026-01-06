import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../../utils/auth-helpers';
import { PromotionPage } from '../../pages/promotion.page';
import path from 'path';

test.describe('Promotion Request Submission (HRO)', () => {
  test('should submit experience-based promotion request successfully', async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.HRO);

    const promotionPage = new PromotionPage(page);
    await promotionPage.navigate();

    // Search for eligible employee
    await promotionPage.searchEmployee('ELIG-00000001');

    // Wait for employee details to load
    await expect(page.getByText(/employee.*details/i)).toBeVisible({
      timeout: 5000,
    });

    // Select promotion type
    await promotionPage.selectPromotionType('experience');

    // Fill proposed cadre
    await promotionPage.fillProposedCadre('Senior Officer Grade I');

    // Upload required documents
    const testPdfPath = path.join(__dirname, '../../fixtures/test-document.pdf');

    // Upload performance appraisals
    await promotionPage.uploadPerformanceAppraisal(1, testPdfPath);
    await promotionPage.uploadPerformanceAppraisal(2, testPdfPath);
    await promotionPage.uploadPerformanceAppraisal(3, testPdfPath);

    // Upload letter of request
    await promotionPage.uploadLetterOfRequest(testPdfPath);

    // Submit request
    await promotionPage.submitRequest();

    // Verify success
    await promotionPage.expectSubmissionSuccess();

    // Verify request appears in pending list with correct status
    const status = await promotionPage.getRequestStatus('Eligible Employee 1');
    expect(status).toContain('Pending');
  });

  test('should show validation error for ineligible employee (On Probation)', async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.HRO);

    const promotionPage = new PromotionPage(page);
    await promotionPage.navigate();

    // Search for employee on probation
    await promotionPage.searchEmployee('TEST-12345678');

    // Expect error message about eligibility
    await expect(page.getByText(/not eligible for promotion/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
