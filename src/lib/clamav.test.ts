/**
 * Tests for ClamAV TCP client
 * Covers isClamAVEnabled and scanFile with INSTREAM protocol
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// NODE_ENV is typed read-only under @types/node; mutate via a cast.
const ENV = process.env as Record<string, string | undefined>;
const setNodeEnv = (val: string) => {
  ENV.NODE_ENV = val;
};
const restoreNodeEnv = () => {
  delete ENV.NODE_ENV;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('clamav', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // isClamAVEnabled
  // -------------------------------------------------------------------------

  describe('isClamAVEnabled', () => {
    it('should return true by default (env var undefined)', async () => {
      // Remove the env var so the default "true" takes effect
      const originalValue = process.env.CLAMAV_ENABLED;
      delete process.env.CLAMAV_ENABLED;

      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(true);

      // Restore
      if (originalValue !== undefined) {
        process.env.CLAMAV_ENABLED = originalValue;
      }
    });

    it('should return true when CLAMAV_ENABLED=true', async () => {
      process.env.CLAMAV_ENABLED = 'true';
      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(true);
      delete process.env.CLAMAV_ENABLED;
    });

    it('should return false when CLAMAV_ENABLED=false', async () => {
      process.env.CLAMAV_ENABLED = 'false';
      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(false);
      delete process.env.CLAMAV_ENABLED;
    });

    it('should return false when CLAMAV_ENABLED=FALSE (case-insensitive)', async () => {
      process.env.CLAMAV_ENABLED = 'FALSE';
      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(false);
      delete process.env.CLAMAV_ENABLED;
    });

    it('ignores CLAMAV_ENABLED=false in production without the override (stays ON)', async () => {
      setNodeEnv('production');
      process.env.CLAMAV_ENABLED = 'false';
      delete process.env.CLAMAV_DISABLE_ALLOWED;

      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(true);

      restoreNodeEnv();
      delete process.env.CLAMAV_ENABLED;
    });

    it('honors CLAMAV_ENABLED=false in production only with CLAMAV_DISABLE_ALLOWED=true', async () => {
      setNodeEnv('production');
      process.env.CLAMAV_ENABLED = 'false';
      process.env.CLAMAV_DISABLE_ALLOWED = 'true';

      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(false);

      restoreNodeEnv();
      delete process.env.CLAMAV_ENABLED;
      delete process.env.CLAMAV_DISABLE_ALLOWED;
    });

    it('keeps the dev/CI escape hatch: CLAMAV_ENABLED=false disables outside production', async () => {
      setNodeEnv('development');
      process.env.CLAMAV_ENABLED = 'false';
      delete process.env.CLAMAV_DISABLE_ALLOWED;

      const { isClamAVEnabled } = await import('./clamav');
      expect(isClamAVEnabled()).toBe(false);

      restoreNodeEnv();
      delete process.env.CLAMAV_ENABLED;
    });
  });

  // -------------------------------------------------------------------------
  // scanFile
  // -------------------------------------------------------------------------

  describe('scanFile', () => {
    it('should skip scan and return isClean:true when CLAMAV_ENABLED=false', async () => {
      process.env.CLAMAV_ENABLED = 'false';

      const { scanFile } = await import('./clamav');
      const buffer = Buffer.from('test content');
      const result = await scanFile(buffer);

      expect(result.isClean).toBe(true);
      expect(result.virusName).toBeUndefined();
      expect(result.error).toBeUndefined();

      delete process.env.CLAMAV_ENABLED;
    });

    it('should return error when ClamAV is unreachable', async () => {
      // Use a non-existent port with a short timeout to fail fast
      process.env.CLAMAV_ENABLED = 'true';
      process.env.CLAMAV_HOST = 'localhost';
      process.env.CLAMAV_PORT = '19999';
      process.env.CLAMAV_TIMEOUT = '2000';

      const { scanFile } = await import('./clamav');
      const buffer = Buffer.from('test content');

      const result = await scanFile(buffer);

      expect(result.isClean).toBe(false);
      expect(result.error).toBeDefined();
      // The error should mention a connection issue
      expect(result.error).toMatch(/connection|error|timed out|ECONNREFUSED/i);

      // Clean up env vars
      delete process.env.CLAMAV_ENABLED;
      delete process.env.CLAMAV_HOST;
      delete process.env.CLAMAV_PORT;
      delete process.env.CLAMAV_TIMEOUT;
    }, 10000); // 10s test timeout since we need to wait for connection failure
  });
});