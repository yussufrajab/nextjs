// Client-side recovery for Next.js ChunkLoadError.
//
// After a deploy, chunk filenames change (content-hash suffix), but a browser
// may still hold stale HTML/JS referencing the old filenames. Those requests
// 404 and Next.js throws `ChunkLoadError: Loading chunk NNNN failed.`, which
// the app surfaces as a generic "Something went wrong". The robust fix is to
// reload the page so the browser fetches the current build's manifest + chunks.
//
// To avoid a reload loop when the new build is *also* broken, we gate reloads
// with a sessionStorage counter and a short time window.

const RELOAD_KEY = 'csms:chunk-reload';
const RELOAD_WINDOW_MS = 30_000; // allow one reload per 30s
const MAX_RELOADS = 2; // within one window

/**
 * Returns true when `error` looks like a webpack/Next.js chunk loading failure.
 * Next (app router) throws errors whose `name` is `ChunkLoadError` (webpack)
 * or whose message matches `Loading chunk NNN failed` / `Loading chunk ... failed`.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  if (e.name === 'ChunkLoadError') return true;
  // Also catch the underlying DOMException / fetch failures webpack wraps.
  const msg = typeof e.message === 'string' ? e.message : '';
  return /Loading chunk \d+ failed/i.test(msg) || /Loading CSS chunk \d+ failed/i.test(msg);
}

/**
 * Attempts a single reload to recover from a ChunkLoadError. Returns true if a
 * reload was triggered, false if we've hit the safety limit (caller should then
 * render the manual "reload" UI).
 */
export function recoverFromChunkLoadError(): boolean {
  if (typeof window === 'undefined') return false;

  let entry: { count: number; firstAt: number } | null = null;
  try {
    const raw = sessionStorage.getItem(RELOAD_KEY);
    if (raw) entry = JSON.parse(raw);
  } catch {
    // ignore parse / storage errors
  }

  const now = Date.now();
  if (!entry || now - entry.firstAt > RELOAD_WINDOW_MS) {
    entry = { count: 0, firstAt: now };
  }

  if (entry.count >= MAX_RELOADS) return false;

  entry.count += 1;
  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / private-mode errors
  }

  // Force a fresh fetch: bypass browser cache for the document so the new
  // build's HTML/manifest is used. Router-based navigation would reuse the
  // cached route tree and likely fail again.
  window.location.reload();
  return true;
}