/**
 * EICAR malware-scanning canary (GAP-L2)
 *
 * Uploads the EICAR standard anti-virus test file via the authenticated file
 * upload endpoint and asserts that it is NEVER accepted. With ClamAV healthy,
 * the upload is rejected with 403 MALWARE_DETECTED. If the scanner is
 * unavailable (fail-closed), the upload is rejected with 503
 * SCAN_SERVICE_UNAVAILABLE. Either is a PASS — the canary fails only if the
 * EICAR file is stored (200/201), which would mean malware scanning is bypassed
 * or disabled.
 *
 * Scheduled nightly in .github/workflows/clamav-canary.yml with a real ClamAV
 * service container so the 403 path is exercised.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

// The EICAR standard anti-virus test string (NOT real malware — designed to
// trigger any ClamAV-compatible scanner by signature).
const EICAR_STRING =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// The canary uses a dedicated user with NO email so the MFA gate is skipped
// (the login route only requires MFA when the user has an email on file).
// Credentials are env-configurable so the nightly workflow can provision them.
const CANARY_USERNAME = process.env.EICAR_CANARY_USERNAME || 'canary_hro';
const CANARY_PASSWORD = process.env.EICAR_CANARY_PASSWORD || 'Canary@2026';

test.describe('EICAR malware-scanning canary (GAP-L2)', () => {
  test('rejects the EICAR test file on upload', async ({ page, context }) => {
    // RC4: this canary needs (a) a provisioned `canary_hro` user and (b) a
    // live ClamAV service. The main E2E workflow (.github/workflows/e2e-tests.yml)
    // provisions neither and does not set CLAMAV_ENABLED, so running it there
    // only fails on login + scan. It is run (with both) by the dedicated
    // .github/workflows/clamav-canary.yml, which sets CLAMAV_ENABLED=true and
    // provisions the canary user. Skip here unless that flag is set.
    test.skip(
      !process.env.CLAMAV_ENABLED,
      'EICAR canary requires ClamAV + a provisioned canary user — run via .github/workflows/clamav-canary.yml (sets CLAMAV_ENABLED), not the main E2E suite'
    );

    // 1. Authenticate through the browser so the session + CSRF cookies are set.
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(CANARY_USERNAME, CANARY_PASSWORD);
    await loginPage.expectSuccessfulLogin();

    // 2. Read the CSRF cookie to satisfy the double-submit check on POST.
    const cookies = await context.cookies();
    const csrfCookie = cookies.find((c) => c.name === 'csrf-token');
    const csrfToken = csrfCookie?.value || '';

    // 3. Upload the EICAR file via the API request context (shares cookies).
    const response = await context.request.post('/api/files/upload', {
      headers: {
        'x-csrf-token': csrfToken,
      },
      multipart: {
        file: {
          name: 'eicar.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(EICAR_STRING, 'utf-8'),
        },
        folder: 'documents',
      },
    });

    // 4. The canary passes iff the file was NOT stored.
    expect(
      response.ok(),
      'EICAR file was accepted — malware scanning is bypassed or disabled!'
    ).toBe(false);

    const status = response.status();
    const body = await response.json().catch(() => ({}));

    // Accept the two rejection paths: detected (403) or scanner unavailable (503).
    expect(
      status === 403 || status === 503 || status === 400 || status === 415,
      `Expected EICAR to be rejected (403/503/400/415), got ${status}: ${JSON.stringify(body)}`
    ).toBe(true);

    if (status === 403) {
      expect(body.errorCode).toBe('MALWARE_DETECTED');
    }
  });
});