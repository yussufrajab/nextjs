/**
 * Unit tests for notification content minimization (GAP-M12).
 *
 * `sanitizeNotificationText` is the single chokepoint applied at the
 * createNotification / createNotificationForRole sink, so it covers all 66+
 * templates. These tests verify the sanitization contract: control-byte
 * stripping, HTML escaping, and length truncation.
 */

import { describe, it, expect } from 'vitest';

describe('sanitizeNotificationText (GAP-M12)', () => {
  it('escapes HTML special chars to prevent XSS in the in-app UI', async () => {
    const { sanitizeNotificationText } = await import('./notifications');
    const out = sanitizeNotificationText(
      'Lalamiko: <script>alert(1)</script> & "quoted" \'<i>\''
    );
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<i>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&amp;');
    expect(out).toContain('&quot;');
    expect(out).toContain('&#39;');
  });

  it('strips control / null bytes but keeps newlines and tabs', async () => {
    const { sanitizeNotificationText } = await import('./notifications');
    const out = sanitizeNotificationText('hello\x00world\x07\x1F\n\tend');
    expect(out).not.toContain('\x00');
    expect(out).not.toContain('\x07');
    expect(out).not.toContain('\x1F');
    // newlines and tabs are preserved
    expect(out).toContain('\n');
    expect(out).toContain('\t');
    expect(out).toContain('helloworld');
    expect(out).toContain('end');
  });

  it('truncates long content to the max length (PII minimization)', async () => {
    const { sanitizeNotificationText } = await import('./notifications');
    const long = 'A'.repeat(2000);
    const out = sanitizeNotificationText(long);
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith('…')).toBe(true);
  });

  it('passes short, clean text through unchanged (escaped only if needed)', async () => {
    const { sanitizeNotificationText } = await import('./notifications');
    expect(sanitizeNotificationText('New promotion request submitted.')).toBe(
      'New promotion request submitted.'
    );
  });

  it('handles null/undefined input safely', async () => {
    const { sanitizeNotificationText } = await import('./notifications');
    expect(sanitizeNotificationText(null as unknown as string)).toBe('');
    expect(sanitizeNotificationText(undefined as unknown as string)).toBe('');
  });
});