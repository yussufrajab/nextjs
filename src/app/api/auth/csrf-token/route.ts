import { NextResponse } from 'next/server';
import { wrapHandler } from '@/lib/error-handler';
import {
  generateCSRFToken,
  signCSRFToken,
  getCSRFCookieOptions,
  CSRF_COOKIE_NAME,
} from '@/lib/csrf-utils';

/**
 * Pre-login CSRF token issuer.
 *
 * The double-submit CSRF pattern requires a `csrf-token` cookie to exist
 * BEFORE a state-changing request is made. Authenticated users get one from
 * `completeLogin` on successful login, but login-stage and public endpoints
 * (login, MFA verify/send-otp, magic-link, public complaint magic-link-verify)
 * run BEFORE that cookie exists — so enforcing `validateCSRF` on them would
 * 403-reject every attempt and break the auth flow.
 *
 * This GET endpoint mints a fresh signed CSRF token and sets it as the
 * `csrf-token` cookie (httpOnly: false, sameSite: strict — same options as the
 * post-login token). It is called on mount by pre-login pages via
 * `ensureCsrfToken()` (src/lib/fetch-with-csrf.ts) so the cookie is present
 * before the user can submit any form.
 *
 * It is intentionally unauthenticated and uses a safe HTTP method (GET), so it
 * does not itself require CSRF. The token is cryptographically random and
 * HMAC-signed, so issuing it reveals nothing useful and cannot be forged.
 *
 * On a successful full login, `completeLogin` overwrites this cookie with a
 * new per-session token — the pre-login token is only used to guard the
 * login/MFA/complaint-submission requests themselves.
 */
export const GET = wrapHandler(async () => {
  const csrfToken = generateCSRFToken();
  const signedCSRFToken = signCSRFToken(csrfToken);

  const response = NextResponse.json({ success: true, csrfToken: signedCSRFToken });
  response.cookies.set(CSRF_COOKIE_NAME, signedCSRFToken, getCSRFCookieOptions());
  return response;
});