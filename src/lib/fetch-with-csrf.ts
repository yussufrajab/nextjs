'use client';

/**
 * Client-side CSRF helpers — single source of truth for attaching the CSRF
 * token to state-changing requests.
 *
 * The server enforces the double-submit CSRF pattern inside `withAuth`
 * (src/lib/api-auth.ts): for any authenticated POST/PUT/PATCH/DELETE it
 * compares the `csrf-token` cookie (sent automatically by the browser) against
 * the `x-csrf-token` header (which only JS can add). If the header is missing
 * or doesn't match the cookie, the request is rejected with 403 and a
 * `CSRF_VIOLATION` audit event is logged.
 *
 * Consequences of bypassing this:
 *   - The request fails with 403.
 *   - The server-side action never runs (e.g. inactivity tracking, admin
 *     unlock/lock/reset) so the feature silently breaks.
 *   - The audit trail is flooded with false "CSRF violation" events from
 *     legitimate logged-in users, drowning real security signals.
 *
 * Every client state-changing request must therefore go through
 * `fetchWithCsrf` (or `ApiClient`, which attaches the token itself). For
 * non-fetch callers (e.g. XMLHttpRequest), use `getCsrfToken`/`getCsrfHeaders`
 * to read the token and set the header manually.
 *
 * For Tier-1 endpoints guarded by `requireReauth` (which return
 * 401 REAUTH_REQUIRED), use `fetchWithReauth` — it transparently performs
 * step-up re-auth and retries once.
 *
 * The token lives in the `csrf-token` cookie, set by `completeLogin` on
 * successful login (httpOnly: false so JS can read it). This mirrors what
 * `ApiClient.request` does internally.
 */

import { requestReauth } from '@/lib/reauth-client';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Read the CSRF token from the `csrf-token` cookie.
 * Uses indexOf + substring to preserve any '=' characters in the base64 value.
 * Returns undefined on the server or when no token cookie is present.
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const row = document.cookie
    .split('; ')
    .find((r) => r.startsWith(`${CSRF_COOKIE_NAME}=`));
  return row ? row.substring(row.indexOf('=') + 1) : undefined;
}

/**
 * Headers object containing the CSRF token, or an empty object when no token
 * is available. Spread into a fetch's `headers` option for state-changing
 * requests that cannot use `fetchWithCsrf` directly.
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

/**
 * Ensure a `csrf-token` cookie exists before issuing a state-changing request.
 *
 * Authenticated users already have the cookie (set by `completeLogin`), so this
 * is a no-op for them. Pre-login / public flows (login, MFA, magic-link, public
 * complaint submission) have no cookie yet — this calls GET `/api/auth/csrf-token`
 * which mints and sets a signed token cookie, after which `fetchWithCsrf` can
 * attach it as the `x-csrf-token` header.
 *
 * Call this once on mount of every pre-login page that submits a state-changing
 * form. It is idempotent: if a token cookie is already present it returns
 * immediately without a network round-trip. Never throws — a failure here just
 * means the subsequent `fetchWithCsrf` will warn about a missing token rather
 * than crash the page.
 */
export async function ensureCsrfToken(): Promise<void> {
  if (typeof document === 'undefined') return; // SSR — nothing to do
  if (getCsrfToken()) return; // already have a token (post-login or already ensured)
  try {
    await fetch('/api/auth/csrf-token', { credentials: 'include' });
  } catch {
    // Network/abort error — leave it to fetchWithCsrf to surface the missing token.
  }
}

/**
 * `fetch` wrapper that attaches the CSRF token to state-changing requests.
 *
 * For POST/PUT/PATCH/DELETE it reads the `csrf-token` cookie and adds it as
 * the `x-csrf-token` header (merging with any headers the caller already
 * provided). Safe HTTP methods (GET/HEAD/OPTIONS) pass through untouched.
 *
 * Credentials default to 'include' so the session + csrf-token cookies are
 * always sent; a caller may override `credentials` in `init`.
 *
 * Usage:
 *   const res = await fetchWithCsrf('/api/admin/unlock-account', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ ... }),
 *   });
 */
export async function fetchWithCsrf(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();

  if (STATE_CHANGING_METHODS.includes(method)) {
    const token = getCsrfToken();
    if (token) {
      // `new Headers()` accepts a plain object, a Headers instance, or an
      // array of tuples — so this works regardless of how the caller passed
      // their headers.
      const merged = new Headers(init.headers as HeadersInit);
      merged.set(CSRF_HEADER_NAME, token);
      init = { ...init, headers: merged };
    }
  }

  return fetch(url, { credentials: 'include', ...init });
}

/**
 * `fetch` wrapper for Tier-1 endpoints guarded by `requireReauth`
 * (src/lib/api-auth.ts). Wraps `fetchWithCsrf` so the CSRF token is attached,
 * and, if the server responds with 401 `REAUTH_REQUIRED`, performs step-up
 * re-authentication for the scope the server names in the response body, then
 * retries the original request once (the `reauth` cookie is now set by the
 * browser and sent automatically).
 *
 * A genuine 401 (expired session, etc.) is passed through unchanged so the
 * caller can handle it. Re-auth is attempted at most once per call.
 */
export async function fetchWithReauth(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetchWithCsrf(url, init);

  if (response.status !== 401) return response;

  // Inspect the body without consuming the original response (clone first).
  let body: { errorCode?: string; requiredScope?: string; error?: string } | null = null;
  try {
    body = await response.clone().json();
  } catch {
    body = null;
  }

  if (!body || body.errorCode !== 'REAUTH_REQUIRED' || !body.requiredScope) {
    return response; // not a step-up request — let the caller handle the 401
  }

  const ok = await requestReauth(body.requiredScope);
  if (!ok) return response; // user cancelled or re-auth failed — surface original 401

  // Reauth cookie is now set; retry the original request once.
  return fetchWithCsrf(url, init);
}