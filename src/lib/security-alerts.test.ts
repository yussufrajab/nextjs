/**
 * Unit tests for src/lib/security-alerts.ts (Req 26.6).
 *
 * Verifies the contract that matters for availability + correctness:
 *  - Opt-in: no channels configured → no-op (no fetch, no email).
 *  - Severity gating: below threshold → no dispatch; threshold lowered → fires.
 *  - Webhook POSTs a JSON payload + optional Bearer token, with a bounded
 *    timeout.
 *  - Email channel sends via `@/lib/email` and dedups per eventType.
 *  - Channel isolation: a throwing/slow webhook never blocks email, and vice
 *    versa. dispatchSecurityAlert never throws and never rejects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendEmailMock = vi.fn();

vi.mock('@/lib/email', () => ({
  sendEmail: (...a: any[]) => sendEmailMock(...a),
}));

// Suppress pino output during tests.
vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  sendEmailMock.mockReset();
  vi.useFakeTimers();
  vi.clearAllTimers();
  // Defaults: no channels configured.
  delete process.env.SECURITY_ALERT_WEBHOOK_URL;
  delete process.env.SECURITY_ALERT_WEBHOOK_TOKEN;
  delete process.env.SECURITY_ALERT_EMAIL_TO;
  delete process.env.SECURITY_ALERT_SEVERITY_THRESHOLD;
  delete process.env.SECURITY_ALERT_DEDUP_SECONDS;
  delete process.env.SECURITY_ALERT_WEBHOOK_TIMEOUT_MS;
  delete process.env.SECURITY_ALERT_ENVIRONMENT;
});

afterEach(() => {
  vi.useRealTimers();
});

function baseEvent(overrides: Partial<Record<string, any>> = {}) {
  return {
    eventType: 'USER_DELETED',
    eventCategory: 'DATA_MODIFICATION',
    severity: 'CRITICAL',
    userId: 'u1',
    username: 'alice',
    userRole: 'Admin',
    ipAddress: '10.0.0.1',
    attemptedRoute: '/api/users/u2',
    requestMethod: 'DELETE',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: { target: 'u2' },
    message: 'Audit event USER_DELETED on /api/users/u2',
    ...overrides,
  };
}

describe('dispatchSecurityAlert — opt-in / no-op', () => {
  it('does nothing when no channel is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not dispatch when severity is below the threshold (default CRITICAL)', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    // WARNING < CRITICAL threshold → suppressed.
    await dispatchSecurityAlert(baseEvent({ severity: 'WARNING' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('dispatchSecurityAlert — webhook channel', () => {
  it('POSTs a JSON payload with the event details', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_WEBHOOK_TOKEN = 'tok-123';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://siem.example/ingest');
    expect(init?.method).toBe('POST');
    expect((init?.headers as any)?.['content-type']).toBe('application/json');
    expect((init?.headers as any)?.authorization).toBe('Bearer tok-123');

    const body = JSON.parse(init?.body as string);
    expect(body.schema).toBe('csms-security-alert');
    expect(body.version).toBe(1);
    expect(body.severity).toBe('CRITICAL');
    expect(body.eventType).toBe('USER_DELETED');
    expect(body.route).toBe('/api/users/u2');
    expect(body.method).toBe('DELETE');
    expect(body.userId).toBe('u1');
    expect(body.username).toBe('alice');
    expect(typeof body.timestamp).toBe('string');
    fetchSpy.mockRestore();
  });

  it('fires when threshold is lowered to WARNING', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_SEVERITY_THRESHOLD = 'WARNING';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent({ severity: 'WARNING' }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('does not send a Bearer token when no token is configured', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());

    const init = fetchSpy.mock.calls[0][1] as any;
    expect(init.headers.authorization).toBeUndefined();
    fetchSpy.mockRestore();
  });
});

describe('dispatchSecurityAlert — email channel + dedup', () => {
  it('sends an email to each configured recipient', async () => {
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com, oncall@example.com';
    sendEmailMock.mockResolvedValue({ success: true, messageId: 'm1' });
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    const [to, subject] = sendEmailMock.mock.calls[0];
    expect(to).toBe('soc@example.com');
    expect(subject).toContain('[CSMS Security Alert][CRITICAL]');
    expect(subject).toContain('USER_DELETED');
    // Plain-text body should carry the forensic basics.
    const text = sendEmailMock.mock.calls[0][3];
    expect(text).toContain('Severity:    CRITICAL');
    expect(text).toContain('alice');
    expect(text).toContain('/api/users/u2');
  });

  it('dedups email per eventType within the window but still hits the webhook every time', async () => {
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com';
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_DEDUP_SECONDS = '30';
    sendEmailMock.mockResolvedValue({ success: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());
    await dispatchSecurityAlert(baseEvent());

    // Email deduped: only one send across two identical-in-type events.
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    // SIEM receives every qualifying event (no dedup).
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // After the dedup window elapses, email fires again.
    vi.advanceTimersByTime(31 * 1000);
    await dispatchSecurityAlert(baseEvent());
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('disables email dedup when SECURITY_ALERT_DEDUP_SECONDS=0', async () => {
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com';
    process.env.SECURITY_ALERT_DEDUP_SECONDS = '0';
    sendEmailMock.mockResolvedValue({ success: true });
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());
    await dispatchSecurityAlert(baseEvent());

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });
});

describe('dispatchSecurityAlert — channel isolation / never throws', () => {
  it('still sends email when the webhook fetch rejects', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network down'));
    sendEmailMock.mockResolvedValue({ success: true });
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await expect(dispatchSecurityAlert(baseEvent())).resolves.toBeUndefined();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('still hits the webhook when sendEmail rejects', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );
    sendEmailMock.mockRejectedValue(new Error('smtp down'));
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await expect(dispatchSecurityAlert(baseEvent())).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('still sends email when the webhook returns a non-OK status', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_EMAIL_TO = 'soc@example.com';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad', { status: 502 })
    );
    sendEmailMock.mockResolvedValue({ success: true });
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    await dispatchSecurityAlert(baseEvent());

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('aborts the webhook after the configured timeout', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://siem.example/ingest';
    process.env.SECURITY_ALERT_WEBHOOK_TIMEOUT_MS = '100';
    // fetch never resolves → only the AbortController timeout can end it.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url: any, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        })
    );
    const { dispatchSecurityAlert, _resetAlertDedup } = await import('./security-alerts');
    _resetAlertDedup();

    const p = dispatchSecurityAlert(baseEvent());
    vi.advanceTimersByTime(150);
    await expect(p).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});