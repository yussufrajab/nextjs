import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  // Common toast notification handling
  async getToastMessage(): Promise<string | null> {
    const toast = this.page.locator('[data-sonner-toast]').first();
    if (await toast.isVisible({ timeout: 5000 })) {
      return toast.textContent();
    }
    return null;
  }

  async waitForToast(expectedText?: string, timeout = 5000) {
    const toast = this.page.locator('[data-sonner-toast]').first();
    await toast.waitFor({ state: 'visible', timeout });

    if (expectedText) {
      const text = await toast.textContent();
      if (!text?.includes(expectedText)) {
        throw new Error(
          `Toast message "${text}" does not contain "${expectedText}"`
        );
      }
    }
  }
}
