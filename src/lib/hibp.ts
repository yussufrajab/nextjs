/**
 * HaveIBeenPwned (HIBP) k-anonymity breach check
 *
 * Uses the Pwned Passwords API (https://haveibeenpwned.com/API/v3#PwnedPasswords)
 * with k-anonymity: the client sends only the first 5 chars of the SHA-1
 * hash of the password; the server returns a list of suffixes that have
 * appeared in breaches. The actual password is never transmitted.
 *
 * The result is cached in Redis (24h TTL) to limit API calls.
 *
 * SECURITY:
 *  - Network calls use HTTPS only.
 *  - 200ms minimum delay per call (HIBP rate limit guidance).
 *  - On any error (network, timeout, 5xx), fail-open: the breach check is
 *    best-effort and should not block legitimate users. The audit log
 *    records a `BREACH_CHECK_ERROR` event.
 *  - Pwned count thresholds:
 *      > 0  → password is in a known breach → reject (or warn + force change)
 *      === 0 → password not in any tracked breach
 *
 * The `HIBP_ENABLED` env var can disable the check (e.g. for offline testing).
 */

import { createHash } from 'crypto';
import Redis from 'ioredis';

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range';
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h
const MIN_REQUEST_INTERVAL_MS = 200;
const DEFAULT_PWNED_THRESHOLD = 1; // reject if seen at least once

let lastRequestTime = 0;

// Lazy Redis client for caching HIBP results. Best-effort: if Redis is
// unavailable, the breach check still works (just no cache, more API calls).
let _cacheClient: Redis | null = null;
function getCacheClient(): Redis | null {
  if (_cacheClient !== undefined) return _cacheClient;
  if (process.env.REDIS_HOST === undefined && !process.env.HIBP_CACHE_REDIS_URL) {
    _cacheClient = null;
    return null;
  }
  try {
    _cacheClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    _cacheClient.on('error', () => {
      // swallow — cache is best-effort
    });
    return _cacheClient;
  } catch {
    _cacheClient = null;
    return null;
  }
}

function isEnabled(): boolean {
  return process.env.HIBP_ENABLED?.toLowerCase() !== 'false';
}

function getThreshold(): number {
  const raw = process.env.HIBP_PWNED_THRESHOLD;
  if (!raw) return DEFAULT_PWNED_THRESHOLD;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_PWNED_THRESHOLD;
}

function sha1Hex(input: string): string {
  return createHash('sha1').update(input, 'utf8').digest('hex').toUpperCase();
}

export interface BreachCheckResult {
  /**
   * true if the password is in a known breach (count >= threshold).
   * false if the password is not pwned OR the check failed (fail-open).
   */
  isPwned: boolean;
  /**
   * Number of times the password has been seen in breaches.
   * 0 when not pwned, the actual count when pwned.
   */
  count: number;
  /**
   * true when the check could not be performed (network error, HIBP down).
   * The audit trail should record this so the SOC can review coverage.
   */
  error: boolean;
  /**
   * Error reason (only set when error=true).
   */
  errorReason?: string;
}

/**
 * Check whether a password has appeared in any known breach.
 *
 * @param password - The plain-text password. NEVER logged, NEVER sent to HIBP
 *                   (only the first 5 chars of the SHA-1 hash are sent).
 */
export async function checkPasswordBreached(
  password: string
): Promise<BreachCheckResult> {
  if (!isEnabled()) {
    return { isPwned: false, count: 0, error: false };
  }

  if (!password || typeof password !== 'string') {
    return { isPwned: false, count: 0, error: false };
  }

  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  // Cache lookup
  let cache: Redis | null = null;
  try {
    cache = getCacheClient();
    if (cache) {
      const cached = await cache.get(`hibp:${prefix}:${suffix}`);
      if (cached !== null) {
        const count = parseInt(cached, 10);
        const threshold = getThreshold();
        return {
          isPwned: count >= threshold,
          count,
          error: false,
        };
      }
    }
  } catch {
    // Cache miss is non-fatal
  }

  // Rate-limit: ensure ≥200ms between HIBP calls
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  // Make the API call
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${HIBP_API_URL}/${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' }, // HIBP-recommended; obscures response length
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        isPwned: false,
        count: 0,
        error: true,
        errorReason: `HIBP returned HTTP ${response.status}`,
      };
    }

    const text = await response.text();
    let count = 0;
    // Response format: lines of "<SUFFIX>:<COUNT>"
    for (const line of text.split('\n')) {
      const [s, c] = line.trim().split(':');
      if (s?.toUpperCase() === suffix) {
        count = parseInt(c ?? '0', 10);
        break;
      }
    }

    // Cache the result
    if (cache) {
      try {
        await cache.set(
          `hibp:${prefix}:${suffix}`,
          String(count),
          'EX',
          CACHE_TTL_SECONDS
        );
      } catch {
        // Non-fatal
      }
    }

    const threshold = getThreshold();
    return {
      isPwned: count >= threshold,
      count,
      error: false,
    };
  } catch (err: any) {
    // Fail-open: do not block users when HIBP is unreachable
    return {
      isPwned: false,
      count: 0,
      error: true,
      errorReason: err?.message ?? 'HIBP request failed',
    };
  }
}
