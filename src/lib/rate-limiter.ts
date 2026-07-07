import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { rateLimitLogger } from '@/lib/logger';
import { getClientIp as getClientIpAuth } from '@/lib/audit-logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitTier = 'auth' | 'write' | 'read' | 'upload' | 'download';

// ---------------------------------------------------------------------------
// Rate-limit configuration per tier
// ---------------------------------------------------------------------------

export const RATE_LIMITS: Record<RateLimitTier, { limit: number; windowSeconds: number }> = {
  auth: { limit: 5, windowSeconds: 60 },
  write: { limit: 30, windowSeconds: 60 },
  read: { limit: 100, windowSeconds: 60 },
  upload: { limit: 10, windowSeconds: 60 },
  download: { limit: 60, windowSeconds: 60 },
};

// ---------------------------------------------------------------------------
// Lazy Redis client singleton
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // no retries – fail fast
      lazyConnect: true,
      connectTimeout: 2000,
    });

    redisClient.on('error', (err) => {
      rateLimitLogger.warn({ err: err.message || err }, 'Redis error');
    });
  } catch (err) {
    rateLimitLogger.warn({ err }, 'Failed to create Redis client');
    redisClient = null;
  }

  return redisClient;
}

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------

/**
 * Extract the client IP for rate-limiting purposes.
 *
 * SECURITY: delegates to `getClientIp` from `@/lib/audit-logger`, which
 * honors `x-forwarded-for` ONLY when the request came from a configured
 * trusted proxy (`TRUSTED_PROXY_IPS`). Without trusted-proxy validation,
 * an attacker can rotate `x-forwarded-for` to bypass per-IP rate limits.
 *
 * Returns 'unknown' when no IP is available so that the rate-limit key
 * is stable for the same logical request.
 */
export function getClientIp(request: Request): string {
  // Static import of getClientIp from audit-logger. There is no circular
  // dependency: audit-logger only imports audit-db and logger (which imports
  // pino), neither of which imports rate-limiter. The previous lazy require()
  // was broken under Turbopack — require() of an ESM module returned a
  // namespace where the named export destructured to undefined, so every
  // rate-limited POST (login, logout, all writes) threw
  // "getClientIpAuth is not a function" and returned 500.
  return getClientIpAuth(request.headers) ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Core rate-limit check
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  retryAfter?: number;
  /**
   * When `allowed: false`, distinguishes a real rate-limit hit (429) from
   * a fail-closed denial due to Redis being down (503). When `allowed: true`,
   * this field is undefined.
   */
  reason?: 'rate_limit_exceeded' | 'fail_closed';
}

export interface RateLimitOptions {
  /**
   * When true, fail-closed (deny) if Redis is unavailable.
   * Default: false (fail-open). The `auth` tier should ALWAYS pass true.
   *
   * SECURITY: failing open on the `auth` tier is dangerous — a Redis outage
   * becomes a brute-force window. Tiers that control authentication MUST
   * fail closed. Other tiers (read/write/download) can fail open because
   * a brief window of un-throttled traffic is preferable to a 503 storm.
   */
  failClosed?: boolean;
}

export async function checkRateLimit(
  key: string,
  tier: RateLimitTier,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const client = getRedisClient();
  const failClosed = options.failClosed ?? tier === 'auth';

  // Fail closed for auth tier (or any tier that opts in) when Redis is down
  if (!client) {
    if (failClosed) {
      rateLimitLogger.error(
        { tier, key },
        'CRITICAL: Redis unavailable and tier requires fail-closed — denying request'
      );
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        retryAfter: config.windowSeconds,
        reason: 'fail_closed',
      };
    }
    rateLimitLogger.warn({ tier }, 'Redis client unavailable – allowing request (fail-open)');
    return { allowed: true };
  }

  try {
    const count = await client.incr(key);

    if (count === 1) {
      // First request in this window – set expiry
      await client.expire(key, config.windowSeconds);
    }

    const ttl = await client.ttl(key);
    const remaining = Math.max(0, config.limit - count);

    if (count > config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : config.windowSeconds,
        reason: 'rate_limit_exceeded',
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining,
      retryAfter: ttl > 0 ? ttl : config.windowSeconds,
    };
  } catch (err) {
    if (failClosed) {
      rateLimitLogger.error(
        { err, tier, key },
        'CRITICAL: Redis error on auth tier — denying request (fail-closed)'
      );
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        retryAfter: config.windowSeconds,
        reason: 'fail_closed',
      };
    }
    // Fail open on Redis errors for non-auth tiers
    rateLimitLogger.warn({ err, tier }, 'Redis error during rate-limit check – fail-open');
    return { allowed: true };
  }
}

// ---------------------------------------------------------------------------
// Higher-order function for API route handlers
// ---------------------------------------------------------------------------

type Handler = (req: Request) => Promise<NextResponse>;

export function withRateLimit(handler: Handler, tier: RateLimitTier): Handler {
  return async (req: Request): Promise<NextResponse> => {
    const ip = getClientIp(req);
    const key = `ratelimit:${ip}:${tier}`;
    // The auth tier MUST fail closed if Redis is down — see checkRateLimit
    // for the policy. Other tiers default to fail-open.
    const result = await checkRateLimit(key, tier, { failClosed: tier === 'auth' });
    const config = RATE_LIMITS[tier];

    if (!result.allowed) {
      // Differentiate "you sent too many" (429) from "Redis is down" (503).
      // The `reason` field set by checkRateLimit is the authoritative signal.
      const isFailClosedDenial = result.reason === 'fail_closed';
      const status = isFailClosedDenial ? 503 : 429;
      const errorCode = isFailClosedDenial ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED';
      const errorMessage = isFailClosedDenial
        ? 'Service temporarily unavailable — please retry shortly'
        : 'Too many requests';

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode,
          retryAfter: result.retryAfter,
        },
        {
          status,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(
              Math.floor(Date.now() / 1000) + (result.retryAfter ?? config.windowSeconds)
            ),
          },
        }
      );
    }

    // Allowed – call the wrapped handler
    const response = await handler(req);

    // Attach rate-limit headers to the successful response
    response.headers.set('X-RateLimit-Limit', String(config.limit));
    response.headers.set(
      'X-RateLimit-Remaining',
      String(result.remaining ?? config.limit)
    );
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.floor(Date.now() / 1000) + (result.retryAfter ?? config.windowSeconds))
    );

    return response;
  };
}

// ---------------------------------------------------------------------------
// Utility: get config for a tier
// ---------------------------------------------------------------------------

export function getRateLimitConfig(tier: RateLimitTier): { limit: number; windowSeconds: number } {
  return RATE_LIMITS[tier];
}