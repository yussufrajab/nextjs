import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e/tests',

  // Test execution settings
  fullyParallel: false, // Disable for database tests initially
  forbidOnly: !!process.env.CI, // Fail CI if test.only
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : 1, // Single worker for database safety

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'], // Console output
  ],

  // Global test configuration
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:9002',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Navigation timeout
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
  },

  // Test timeout
  timeout: 60000, // 60 seconds per test

  // Global setup and teardown
  globalSetup: './e2e/setup/global-setup.ts',

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server. In CI, start the built production server (`npm start`) and wait
  // for it to come up before running tests — the workflow builds the app first
  // but never starts it, so without this Playwright has nothing to talk to at
  // localhost:9002 and every navigation fails with a connection error.
  // Locally, start the dev server against the test database instead.
  webServer: process.env.CI
    ? {
        command: 'npm start',
        url: 'http://localhost:9002',
        timeout: 180000,
        reuseExistingServer: false,
      }
    : {
        command: 'DATABASE_URL="postgresql://postgres:Mamlaka2020@localhost:5432/csms_test?schema=public" npm run dev',
        url: 'http://localhost:9002',
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
      },
});
