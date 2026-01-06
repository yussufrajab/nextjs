import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  private usernameInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel(/username or email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /^login$/i });
  }

  async navigate() {
    await this.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginError(message: string) {
    await this.waitForToast(message);
  }

  async expectSuccessfulLogin() {
    await this.page.waitForURL((url) => url.pathname.includes('/dashboard'), {
      timeout: 10000,
    });
  }
}
