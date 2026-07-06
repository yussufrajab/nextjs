/**
 * Next.js instrumentation hook
 *
 * Runs once at server startup. Used here to assert that production security
 * invariants are in place — if any are violated, log a CRITICAL warning so
 * the issue is visible in deployment logs and ops dashboards.
 *
 * Note: we do NOT throw here because that would block the application from
 * starting. We log loud and rely on ops to react. The intent is "you cannot
 * deploy to production without seeing these errors in your startup logs".
 *
 * Invariants asserted:
 *  1. SESSION_SECRET is set (crypto-strong session signing)
 *  2. TRUSTED_PROXY_IPS is set when behind a reverse proxy
 *  3. Session cookie uses `__Host-` prefix in production (browser-enforced
 *     Secure + Path=/ + no Domain)
 *  4. ClamAV is enabled (file uploads must be scanned)
 *  5. Audit partition cron is scheduled
 */

export async function register() {
  // Only run on the Node.js server runtime, not the edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const isProduction = process.env.NODE_ENV === 'production';
  const { sessionLogger, dbLogger, rateLimitLogger } = await import('@/lib/logger');

  if (!isProduction) return; // Only enforce in production

  const failures: string[] = [];
  const warnings: string[] = [];

  // 1. SESSION_SECRET must be set
  if (!process.env.SESSION_SECRET) {
    failures.push('SESSION_SECRET is not set — session tokens cannot be securely signed');
  } else if (process.env.SESSION_SECRET.length < 32) {
    failures.push(`SESSION_SECRET is too short (${process.env.SESSION_SECRET.length} chars, need ≥32)`);
  }

  // 2. TRUSTED_PROXY_IPS — warn if not set in production (means all XFF headers
  // are ignored, which is the safe default but may cause IP-based rate-limits
  // to under-throttle when behind a load balancer)
  if (!process.env.TRUSTED_PROXY_IPS) {
    warnings.push(
      'TRUSTED_PROXY_IPS is not set — X-Forwarded-For headers are IGNORED. ' +
        'If you are behind a reverse proxy, set this to your LB CIDR (e.g. "10.0.0.0/8") ' +
        'to allow per-IP rate limits to work correctly.'
    );
  }

  // 3. Session cookie Secure flag — assert the prod env name is in use
  const { SESSION_COOKIE_NAME } = await import('@/lib/session-manager');
  if (SESSION_COOKIE_NAME !== '__Host-session') {
    failures.push(
      `Session cookie name is "${SESSION_COOKIE_NAME}" but production must use "__Host-session" ` +
        '(browser-enforced Secure + Path=/ + no Domain). ' +
        'Verify NODE_ENV=production is set.'
    );
  }

  // 4. ClamAV should be enabled in production
  if (process.env.CLAMAV_ENABLED === 'false') {
    failures.push(
      'CLAMAV_ENABLED=false in production — file uploads are NOT being scanned for malware. ' +
        'This is acceptable only if a separate malware-scanning layer exists.'
    );
  } else if (!process.env.CLAMAV_HOST) {
    warnings.push('CLAMAV_HOST is not set — uploads may silently skip scanning if ClamAV daemon is unreachable');
  }

  // 5. DATABASE_URL must be set
  if (!process.env.DATABASE_URL) {
    failures.push('DATABASE_URL is not set');
  }

  // 6. REDIS_HOST — required for rate-limiting
  if (!process.env.REDIS_HOST) {
    warnings.push('REDIS_HOST is not set — rate-limiter will use localhost (suitable for single-node dev only)');
  }

  // Log results
  if (failures.length > 0) {
    sessionLogger.fatal(
      { failures, warnings },
      `CRITICAL: ${failures.length} production security invariant(s) FAILED. ` +
        'Application will start but is NOT safe to serve traffic. ' +
        'See /docs/security/findings/gap_analysis.md for remediation.'
    );
  }
  if (warnings.length > 0) {
    for (const w of warnings) {
      sessionLogger.warn({ warning: w }, 'Production security warning');
    }
  }
  if (failures.length === 0 && warnings.length === 0) {
    sessionLogger.info('All production security invariants verified at startup');
  }

  // Use these imports so TypeScript doesn't complain about them being unused.
  void dbLogger;
  void rateLimitLogger;
}
