import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.goto('/dashboard');
  }

  async navigateToPromotions() {
    // Look for promotion link in the page
    await this.page.getByRole('link', { name: /promotion/i }).click();
    await this.page.waitForURL('/dashboard/promotion');
  }

  async getUserName(): Promise<string | null> {
    // Try to find user name in the page
    const userName = this.page.locator('text=/Test (HRO|HRMO|HHRMD|Employee)/i');
    return userName.textContent();
  }

  async isDashboardMetricVisible(metric: string): Promise<boolean> {
    return this.page.getByText(metric).isVisible();
  }
}
