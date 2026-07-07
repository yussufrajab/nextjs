/**
 * Step-up re-authentication core (framework-agnostic).
 *
 * Tier-1 sensitive endpoints (those guarded by `requireReauth` in
 * src/lib/api-auth.ts) reject a request with 401 `REAUTH_REQUIRED` unless a
 * valid short-lived `reauth` cookie for the matching scope is present. That
 * cookie is issued by POST /api/auth/reauth after the user re-enters their
 * current password (OTP not yet validated server-side — GAP-M12).
 *
 * This module is intentionally dependency-free so it can be imported from
 * anywhere (including src/lib/api-client.ts, which also runs server-side).
 * The actual password dialog is registered at runtime by <ReauthProvider>
 * (src/components/auth/reauth-provider.tsx) via `setReauthHandler`.
 *
 * Callers:
 *   - src/lib/api-client.ts auto-handles REAUTH_REQUIRED on any ApiClient call
 *     (users.update/delete, institutions.update/delete, …).
 *   - src/lib/fetch-with-csrf.ts `fetchWithReauth` does the same for raw-fetch
 *     callers (the admin reset/lock/unlock modals).
 */

export type ReauthHandler = (scope: string) => Promise<boolean>;

let registeredHandler: ReauthHandler | null = null;

/**
 * Register the handler that opens the password dialog. Called once by
 * <ReauthProvider> on mount; pass null on unmount.
 */
export function setReauthHandler(handler: ReauthHandler | null): void {
  registeredHandler = handler;
}

/**
 * Perform step-up re-auth for `scope`.
 *
 * Resolves `true` if the `reauth` cookie was issued (the caller can now retry
 * the original request and it will be accepted). Resolves `false` if the user
 * cancelled the dialog, the re-auth call failed, or no handler is registered
 * (ReauthProvider not mounted — e.g. during SSR). Never throws.
 */
export async function requestReauth(scope: string): Promise<boolean> {
  if (!registeredHandler) return false;
  try {
    return await registeredHandler(scope);
  } catch {
    return false;
  }
}