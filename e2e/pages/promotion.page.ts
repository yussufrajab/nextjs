import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class PromotionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.goto('/dashboard/promotion');
  }

  async searchEmployee(searchTerm: string) {
    // Find employee search input and fill it
    const searchInput = this.page.getByPlaceholder(/search.*employee/i);
    await searchInput.fill(searchTerm);

    // Click search button or press Enter
    await searchInput.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(1000);
  }

  async selectPromotionType(type: 'experience' | 'education') {
    // Find and click the promotion type select
    const selectTrigger = this.page.locator(
      '[role="combobox"]:has-text("Select promotion type")'
    );
    await selectTrigger.click();

    // Select the option
    const option =
      type === 'experience'
        ? /promotion based on experience/i
        : /promotion based on education/i;
    await this.page.getByRole('option', { name: option }).click();
  }

  async fillProposedCadre(cadre: string) {
    const cadreInput = this.page.getByLabel(/proposed cadre/i);
    await cadreInput.fill(cadre);
  }

  async uploadPerformanceAppraisal(year: 1 | 2 | 3, filePath: string) {
    const fileInput = this.page.locator(
      `input[type="file"]:near(:text("Performance Appraisal Form (Year ${year})"))`
    );
    await fileInput.setInputFiles(filePath);
  }

  async uploadLetterOfRequest(filePath: string) {
    const fileInput = this.page.locator(
      'input[type="file"]:near(:text("Letter of Request"))'
    );
    await fileInput.setInputFiles(filePath);
  }

  async submitRequest() {
    const submitButton = this.page.getByRole('button', {
      name: /submit.*request/i,
    });
    await submitButton.click();
  }

  async expectSubmissionSuccess() {
    await this.waitForToast('Promotion Request Submitted');
  }

  async getRequestStatus(employeeName: string): Promise<string | null> {
    // Find the request card for the employee
    const requestCard = this.page
      .locator(`text=${employeeName}`)
      .locator('..')
      .locator('..');
    const statusBadge = requestCard.locator('[class*="rounded"]').first();
    return statusBadge.textContent();
  }
}
