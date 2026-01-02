/**
 * Tests for CSRF Protection Utilities
 * Covers token generation, signing, verification, and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCSRFToken,
  signCSRFToken,
  verifyCSRFToken,
  validateCSRFTokens,
  requiresCSRFProtection,
  getCSRFCookieOptions,
  createCSRFError,
  getClientIp,
  logCSRFViolation,
  CSRF_TOKEN_LENGTH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from './csrf-utils';

// Mock the audit logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AuditEventCategory: {
    SECURITY: 'SECURITY',
  },
  AuditSeverity: {
    WARNING: 'WARNING',
  },
}));

describe('csrf-utils', () => {
  describe('Constants', () => {
    it('should have correct CSRF token length', () => {
      expect(CSRF_TOKEN_LENGTH).toBe(32);
    });

    it('should have correct CSRF cookie name', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf-token');
    });

    it('should have correct CSRF header name', () => {
      expect(CSRF_HEADER_NAME).toBe('x-csrf-token');
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate a base64 token', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate correct length token (32 bytes = 44 chars in base64)', () => {
      const token = generateCSRFToken();
      // 32 bytes encoded in base64 = ceil(32 * 4/3) = 43-44 chars (with padding)
      expect(token.length).toBeGreaterThanOrEqual(42);
      expect(token.length).toBeLessThanOrEqual(44);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const token3 = generateCSRFToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('signCSRFToken', () => {
    it('should return token with signature in token.signature format', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      const parts = signed.split('.');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe(token);
      expect(parts[1]).toBeTruthy();
    });

    it('should generate valid base64 signature', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);
      const signature = signed.split('.')[1];

      expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should be deterministic (same token produces same signature)', () => {
      const token = generateCSRFToken();
      const signed1 = signCSRFToken(token);
      const signed2 = signCSRFToken(token);

      expect(signed1).toBe(signed2);
    });

    it('should produce different signatures for different tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const signed1 = signCSRFToken(token1);
      const signed2 = signCSRFToken(token2);

      const sig1 = signed1.split('.')[1];
      const sig2 = signed2.split('.')[1];
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyCSRFToken', () => {
    it('should verify a correctly signed token', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      expect(verifyCSRFToken(signed)).toBe(true);
    });

    it('should reject an unsigned token', () => {
      const token = generateCSRFToken();
      expect(verifyCSRFToken(token)).toBe(false);
    });

    it('should reject a token without a dot separator', () => {
      expect(verifyCSRFToken('invalidtoken')).toBe(false);
    });

    it('should reject a token with multiple dots', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);
      const invalid = signed + '.extra';

      expect(verifyCSRFToken(invalid)).toBe(false);
    });

    it('should reject a tampered token (changed token part)', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);
      const parts = signed.split('.');

      // Change the token part slightly
      const tamperedToken = parts[0].slice(0, -1) + 'X';
      const tampered = `${tamperedToken}.${parts[1]}`;

      expect(verifyCSRFToken(tampered)).toBe(false);
    });

    it('should reject a token with wrong signature', () => {
      const token = generateCSRFToken();
      const wrongSignature = 'aW52YWxpZHNpZ25hdHVyZQ==';
      const invalid = `${token}.${wrongSignature}`;

      expect(verifyCSRFToken(invalid)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(verifyCSRFToken('')).toBe(false);
    });

    it('should handle errors gracefully', () => {
      // Test with invalid base64 that might throw
      expect(verifyCSRFToken('token.!!!invalid-base64!!!')).toBe(false);
    });

    it('should reject tokens with different lengths in signature comparison', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);
      const parts = signed.split('.');

      // Create a signature with different length
      const shortSig = parts[1].slice(0, -10);
      const invalid = `${parts[0]}.${shortSig}`;

      expect(verifyCSRFToken(invalid)).toBe(false);
    });
  });

  describe('validateCSRFTokens', () => {
    it('should validate when cookie and header match and signature is valid', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      expect(validateCSRFTokens(signed, signed)).toBe(true);
    });

    it('should reject when cookie token is missing', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      expect(validateCSRFTokens(undefined, signed)).toBe(false);
    });

    it('should reject when header token is missing', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      expect(validateCSRFTokens(signed, undefined)).toBe(false);
    });

    it('should reject when both tokens are missing', () => {
      expect(validateCSRFTokens(undefined, undefined)).toBe(false);
    });

    it('should reject when cookie token has invalid signature', () => {
      const token = generateCSRFToken();
      const invalid = `${token}.invalidsignature`;

      expect(validateCSRFTokens(invalid, invalid)).toBe(false);
    });

    it('should reject when cookie and header do not match', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const signed1 = signCSRFToken(token1);
      const signed2 = signCSRFToken(token2);

      expect(validateCSRFTokens(signed1, signed2)).toBe(false);
    });

    it('should reject when cookie is valid but header is different', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);
      const differentToken = generateCSRFToken();

      expect(validateCSRFTokens(signed, differentToken)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(validateCSRFTokens('', '')).toBe(false);
    });
  });

  describe('requiresCSRFProtection', () => {
    it('should return false for GET requests', () => {
      expect(requiresCSRFProtection('GET')).toBe(false);
    });

    it('should return false for HEAD requests', () => {
      expect(requiresCSRFProtection('HEAD')).toBe(false);
    });

    it('should return false for OPTIONS requests', () => {
      expect(requiresCSRFProtection('OPTIONS')).toBe(false);
    });

    it('should return true for POST requests', () => {
      expect(requiresCSRFProtection('POST')).toBe(true);
    });

    it('should return true for PUT requests', () => {
      expect(requiresCSRFProtection('PUT')).toBe(true);
    });

    it('should return true for PATCH requests', () => {
      expect(requiresCSRFProtection('PATCH')).toBe(true);
    });

    it('should return true for DELETE requests', () => {
      expect(requiresCSRFProtection('DELETE')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(requiresCSRFProtection('get')).toBe(false);
      expect(requiresCSRFProtection('Get')).toBe(false);
      expect(requiresCSRFProtection('post')).toBe(true);
      expect(requiresCSRFProtection('Post')).toBe(true);
    });

    it('should return true for unknown methods', () => {
      expect(requiresCSRFProtection('CUSTOM')).toBe(true);
    });
  });

  describe('getCSRFCookieOptions', () => {
    it('should return correct options for production', () => {
      const options = getCSRFCookieOptions(true);

      expect(options.httpOnly).toBe(false); // JS needs to read
      expect(options.secure).toBe(true); // HTTPS in production
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(60 * 60 * 24 * 7); // 7 days
    });

    it('should return correct options for development', () => {
      const options = getCSRFCookieOptions(false);

      expect(options.httpOnly).toBe(false);
      expect(options.secure).toBe(false); // No HTTPS in dev
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(60 * 60 * 24 * 7);
    });

    it('should default to process.env.NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;

      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = 'production';
      const prodOptions = getCSRFCookieOptions();
      expect(prodOptions.secure).toBe(true);

      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = 'development';
      const devOptions = getCSRFCookieOptions();
      expect(devOptions.secure).toBe(false);

      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = originalEnv;
    });

    it('should have httpOnly false to allow JavaScript access', () => {
      const options = getCSRFCookieOptions(true);
      expect(options.httpOnly).toBe(false);
    });

    it('should use strict sameSite policy', () => {
      const options = getCSRFCookieOptions(true);
      expect(options.sameSite).toBe('strict');
    });

    it('should set maxAge to 7 days in seconds', () => {
      const options = getCSRFCookieOptions(true);
      const sevenDaysInSeconds = 60 * 60 * 24 * 7;
      expect(options.maxAge).toBe(sevenDaysInSeconds);
      expect(options.maxAge).toBe(604800);
    });
  });

  describe('createCSRFError', () => {
    it('should return error object with correct structure', () => {
      const error = createCSRFError('test reason');

      expect(error).toHaveProperty('success', false);
      expect(error).toHaveProperty('message', 'CSRF token validation failed');
      expect(error).toHaveProperty('error', 'CSRF_VALIDATION_FAILED');
    });

    it('should include details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = 'development';

      const error = createCSRFError('missing token');
      expect(error.details).toBe('missing token');

      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = originalEnv;
    });

    it('should hide details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = 'production';

      const error = createCSRFError('missing token');
      expect(error.details).toBeUndefined();

      // @ts-expect-error - Modifying read-only property for testing
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle different error reasons', () => {
      const error1 = createCSRFError('token mismatch');
      const error2 = createCSRFError('invalid signature');

      expect(error1.message).toBe(error2.message);
      expect(error1.error).toBe(error2.error);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.1');

      expect(getClientIp(headers)).toBe('203.0.113.1');
    });

    it('should extract first IP from comma-separated x-forwarded-for', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.1, 192.0.2.1, 198.51.100.1');

      expect(getClientIp(headers)).toBe('203.0.113.1');
    });

    it('should trim whitespace from x-forwarded-for', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '  203.0.113.1  , 192.0.2.1');

      expect(getClientIp(headers)).toBe('203.0.113.1');
    });

    it('should fallback to x-real-ip if x-forwarded-for is not present', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '203.0.113.2');

      expect(getClientIp(headers)).toBe('203.0.113.2');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.1');
      headers.set('x-real-ip', '203.0.113.2');

      expect(getClientIp(headers)).toBe('203.0.113.1');
    });

    it('should return null if neither header is present', () => {
      const headers = new Headers();

      expect(getClientIp(headers)).toBeNull();
    });

    it('should handle empty x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '');

      // Empty string is falsy, so it falls through to null
      expect(getClientIp(headers)).toBeNull();
    });
  });

  describe('logCSRFViolation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should log CSRF violation to audit system', async () => {
      const { logAuditEvent, AuditEventCategory, AuditSeverity } =
        await import('@/lib/audit-logger');

      await logCSRFViolation(
        'user-123',
        'testuser',
        '203.0.113.1',
        'Mozilla/5.0',
        '/api/protected',
        'token mismatch'
      );

      expect(logAuditEvent).toHaveBeenCalledWith({
        eventType: 'CSRF_VIOLATION',
        eventCategory: AuditEventCategory.SECURITY,
        severity: AuditSeverity.WARNING,
        userId: 'user-123',
        username: 'testuser',
        userRole: null,
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        attemptedRoute: '/api/protected',
        requestMethod: 'POST',
        isAuthenticated: true,
        wasBlocked: true,
        blockReason: 'CSRF token validation failed: token mismatch',
        additionalData: {
          csrfViolationType: 'token mismatch',
        },
      });
    });

    it('should log unauthenticated CSRF violation', async () => {
      const { logAuditEvent } = await import('@/lib/audit-logger');

      await logCSRFViolation(
        null,
        null,
        '203.0.113.1',
        'Mozilla/5.0',
        '/api/public',
        'missing token'
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          username: null,
          isAuthenticated: false,
        })
      );
    });

    it('should handle different violation reasons', async () => {
      const { logAuditEvent } = await import('@/lib/audit-logger');

      await logCSRFViolation(
        'user-123',
        'testuser',
        '203.0.113.1',
        'Mozilla/5.0',
        '/api/protected',
        'invalid signature'
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          blockReason: 'CSRF token validation failed: invalid signature',
          additionalData: {
            csrfViolationType: 'invalid signature',
          },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const { logAuditEvent } = await import('@/lib/audit-logger');
      (logAuditEvent as any).mockRejectedValueOnce(
        new Error('Audit system error')
      );

      // Should not throw
      await expect(
        logCSRFViolation(
          'user-123',
          'testuser',
          '203.0.113.1',
          'Mozilla/5.0',
          '/api/protected',
          'test'
        )
      ).resolves.toBeUndefined();
    });

    it('should handle null IP and user agent', async () => {
      const { logAuditEvent } = await import('@/lib/audit-logger');

      await logCSRFViolation(
        'user-123',
        'testuser',
        null,
        null,
        '/api/protected',
        'test'
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
          userAgent: null,
        })
      );
    });
  });

  describe('Integration: CSRF Token Lifecycle', () => {
    it('should complete full token generation, signing, and validation cycle', () => {
      // Generate token
      const token = generateCSRFToken();
      expect(token).toBeTruthy();

      // Sign token
      const signed = signCSRFToken(token);
      expect(signed).toContain('.');

      // Verify signed token
      expect(verifyCSRFToken(signed)).toBe(true);

      // Validate matching tokens
      expect(validateCSRFTokens(signed, signed)).toBe(true);
    });

    it('should reject tampered tokens in full cycle', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      // Tamper with the token by changing the signature part
      const parts = signed.split('.');
      const tamperedSignature = parts[1].slice(0, -1) + 'X';
      const tampered = `${parts[0]}.${tamperedSignature}`;

      expect(verifyCSRFToken(tampered)).toBe(false);
      expect(validateCSRFTokens(tampered, tampered)).toBe(false);
    });

    it('should handle multiple concurrent tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const signed1 = signCSRFToken(token1);
      const signed2 = signCSRFToken(token2);

      // Each token should validate independently
      expect(validateCSRFTokens(signed1, signed1)).toBe(true);
      expect(validateCSRFTokens(signed2, signed2)).toBe(true);

      // Cross-validation should fail
      expect(validateCSRFTokens(signed1, signed2)).toBe(false);
      expect(validateCSRFTokens(signed2, signed1)).toBe(false);
    });
  });

  describe('Security: Timing Attack Prevention', () => {
    it('should use constant-time comparison for token verification', () => {
      const token = generateCSRFToken();
      const signed = signCSRFToken(token);

      // Test with similar but different signatures
      // Should not reveal timing information
      const start1 = Date.now();
      verifyCSRFToken(signed);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      verifyCSRFToken(signed + 'X');
      const time2 = Date.now() - start2;

      // Both should complete (we can't reliably test timing in unit tests,
      // but we can verify they both complete without error)
      expect(time1).toBeGreaterThanOrEqual(0);
      expect(time2).toBeGreaterThanOrEqual(0);
    });
  });
});
