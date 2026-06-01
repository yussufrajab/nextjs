import crypto from 'crypto';

/**
 * CSP (Content Security Policy) utility for nonce-based script/style execution.
 *
 * Generates a cryptographically random nonce per request so that inline scripts
 * and styles can be allowed without using 'unsafe-inline' globally.
 */

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function getCspHeaders(nonce: string): Record<string, string> {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://www.gstatic.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join('; ');

  return { 'Content-Security-Policy': csp };
}

/**
 * Returns a Report-Only CSP header value for testing before enforcement.
 * Use this to collect violation reports without blocking anything.
 */
export function getCspReportOnlyHeaders(nonce: string): Record<string, string> {
  const headers = getCspHeaders(nonce);
  return { 'Content-Security-Policy-Report-Only': headers['Content-Security-Policy'] };
}
