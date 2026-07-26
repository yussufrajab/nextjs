/**
 * Security Alerting — real-time outbound notification on critical security
 * events (Req 26.6).
 *
 * The audit pipeline (`logAuditEvent`) writes a tamper-evident row to
 * `audit.audit_log` and a structured pino line, but historically went no
 * further: there was no outbound channel (webhook/SIEM/email), so a SOC had
 * no real-time signal. This module is that outbound channel.
 *
 * Design rules (so alerting can never hurt availability or the audit path):
 *  - Fire-and-forget. `logAuditEvent` invokes this with `void`; it never
 *    awaits and never throws. A slow SIEM or SMTP outage cannot delay or
 *    break a request, and cannot suppress the audit row.
 *  - Each channel (webhook, email) is fully isolated — one failing channel
 *    never aborts the other.
 *  - Opt-in via env. With no `SECURITY_ALERT_WEBHOOK_URL` and no
 *    `SECURITY_ALERT_EMAIL_TO`, `dispatchSecurityAlert` is a no-op (safe
 *    default for dev/CI where no SOC exists).
 *  - Severity-gated. Only events at/above `SECURITY_ALERT_SEVERITY_THRESHOLD`
 *    (default CRITICAL) alert — INFO/WARNING audit noise is not forwarded.
 *  - Storm-safe. The email channel dedups per eventType within a short
 *    window so a burst of identical critical events floods an inbox once,
 *    not N times. The webhook/SIEM channel is NOT deduped — a SIEM is the
 *    system of record and should receive every qualifying event for
 *    correlation.
 *
 * NOTE: this alerts on events that already reach `logAuditEvent`. Middleware
 * (src/proxy.ts) blocked-access events currently only `console.log` and do
 * not enter the audit trail — routing those into the audit DB is tracked
 * under Req 17.6, not here.
 */

import { logger } from '@/lib/logger';

export const securityAlertLogger = logger.child({ component: 'security-alert' });

// ---------------------------------------------------------------------------
// Severity ranking
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3,
};

function severityRank(severity: string | undefined | null): number {
  if (!severity) return 0;
  return SEVERITY_RANK[String(severity).toUpperCase()] ?? 0;
}

/**
 * Resolve the minimum severity that triggers an outbound alert, from
 * `SECURITY_ALERT_SEVERITY_THRESHOLD` (one of INFO/WARNING/ERROR/CRITICAL).
 * Defaults to CRITICAL — only the most serious events page a human.
 */
function alertThreshold(): number {
  const raw = (process.env.SECURITY_ALERT_SEVERITY_THRESHOLD || 'CRITICAL')
    .trim()
    .toUpperCase();
  return SEVERITY_RANK[raw] ?? SEVERITY_RANK.CRITICAL;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface AlertConfig {
  webhookUrl: string | null;
  webhookToken: string | null;
  emailTo: string[];
  environment: string;
  enabled: boolean;
}

function loadConfig(): AlertConfig {
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim() || null;
  const webhookToken = process.env.SECURITY_ALERT_WEBHOOK_TOKEN?.trim() || null;
  const emailTo = (process.env.SECURITY_ALERT_EMAIL_TO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const environment = process.env.SECURITY_ALERT_ENVIRONMENT || process.env.NODE_ENV || 'unknown';
  return {
    webhookUrl,
    webhookToken,
    emailTo,
    environment,
    enabled: !!webhookUrl || emailTo.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Alert payload
// ---------------------------------------------------------------------------

export interface SecurityAlertEvent {
  eventType: string;
  eventCategory?: string | null;
  severity: string;
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  attemptedRoute?: string | null;
  requestMethod?: string | null;
  isAuthenticated?: boolean;
  wasBlocked?: boolean;
  blockReason?: string | null;
  additionalData?: Record<string, any> | null;
  /** Free-text summary; required so email/SIEM have a human-readable line. */
  message: string;
}

interface AlertPayload {
  schema: 'csms-security-alert';
  version: 1;
  environment: string;
  severity: string;
  eventType: string;
  eventCategory: string | null;
  message: string;
  userId: string | null;
  username: string | null;
  userRole: string | null;
  ipAddress: string | null;
  route: string | null;
  method: string | null;
  authenticated: boolean;
  wasBlocked: boolean;
  blockReason: string | null;
  additionalData: Record<string, any> | null;
  timestamp: string;
}

function buildPayload(event: SecurityAlertEvent, environment: string): AlertPayload {
  return {
    schema: 'csms-security-alert',
    version: 1,
    environment,
    severity: String(event.severity).toUpperCase(),
    eventType: event.eventType,
    eventCategory: event.eventCategory || null,
    message: event.message,
    userId: event.userId || null,
    username: event.username || null,
    userRole: event.userRole || null,
    ipAddress: event.ipAddress || null,
    route: event.attemptedRoute || null,
    method: event.requestMethod || null,
    authenticated: !!event.isAuthenticated,
    wasBlocked: !!event.wasBlocked,
    blockReason: event.blockReason || null,
    additionalData: event.additionalData || null,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Email dedup
// ---------------------------------------------------------------------------

function emailDedupWindowSeconds(): number {
  const raw = process.env.SECURITY_ALERT_DEDUP_SECONDS;
  if (raw === undefined || raw.trim() === '') return 30;
  const n = Number(raw);
  // `0` is a valid, intentional value (disable dedup); only fall back when
  // the env is genuinely unset or non-numeric.
  return Number.isFinite(n) ? n : 30;
}

const lastEmailSentAt = new Map<string, number>();

function shouldSendEmailFor(eventType: string, nowMs: number): boolean {
  const window = emailDedupWindowSeconds();
  // Dedup window of 0 disables dedup (every qualifying event pages email).
  if (window <= 0) return true;
  const last = lastEmailSentAt.get(eventType) ?? 0;
  if (nowMs - last < window * 1000) return false;
  lastEmailSentAt.set(eventType, nowMs);
  return true;
}

/** Test-only: clear the dedup map between cases. */
export function _resetAlertDedup(): void {
  lastEmailSentAt.clear();
}

// ---------------------------------------------------------------------------
// Channel dispatch
// ---------------------------------------------------------------------------

async function sendWebhook(
  payload: AlertPayload,
  cfg: AlertConfig
): Promise<void> {
  if (!cfg.webhookUrl) return;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.SECURITY_ALERT_WEBHOOK_TIMEOUT_MS) || 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (cfg.webhookToken) {
      // Bearer token — the SIEM/webhook validates the sender.
      headers.authorization = `Bearer ${cfg.webhookToken}`;
    }
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      securityAlertLogger.warn(
        { status: res.status, eventType: payload.eventType },
        'Security alert webhook returned non-OK status'
      );
    }
  } catch (err) {
    securityAlertLogger.warn(
      { err: err instanceof Error ? err.message : String(err), eventType: payload.eventType },
      'Security alert webhook delivery failed (non-blocking)'
    );
  } finally {
    clearTimeout(timer);
  }
}

async function sendEmailAlert(
  payload: AlertPayload,
  cfg: AlertConfig
): Promise<void> {
  if (cfg.emailTo.length === 0) return;
  if (!shouldSendEmailFor(payload.eventType, Date.now())) {
    securityAlertLogger.debug(
      { eventType: payload.eventType },
      'Security alert email suppressed by dedup window'
    );
    return;
  }
  // Lazy import so this module stays decoupled from nodemailer/db at load
  // time and so tests can mock `@/lib/email` cleanly.
  const { sendEmail } = await import('@/lib/email');
  const subject = `[CSMS Security Alert][${payload.severity}] ${payload.eventType}`;
  const text = [
    `CSMS Security Alert`,
    ``,
    `Severity:    ${payload.severity}`,
    `Event:       ${payload.eventType}`,
    `Category:    ${payload.eventCategory ?? 'n/a'}`,
    `Environment: ${payload.environment}`,
    `Time (UTC):  ${payload.timestamp}`,
    ``,
    `Message:     ${payload.message}`,
    `User:        ${payload.username || payload.userId || 'anonymous'}`,
    `Role:        ${payload.userRole || 'n/a'}`,
    `IP:          ${payload.ipAddress || 'unknown'}`,
    `Route:       ${payload.method || ''} ${payload.route || 'n/a'}`,
    `Blocked:     ${payload.wasBlocked ? 'yes' : 'no'}${payload.blockReason ? ` (${payload.blockReason})` : ''}`,
    ``,
    `Additional data:`,
    JSON.stringify(payload.additionalData, null, 2),
  ].join('\n');

  const html = `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;

  for (const to of cfg.emailTo) {
    try {
      const result = await sendEmail(to, subject, html, text);
      if (!result.success) {
        securityAlertLogger.warn(
          { err: result.error, to, eventType: payload.eventType },
          'Security alert email send returned failure (non-blocking)'
        );
      }
    } catch (err) {
      securityAlertLogger.warn(
        { err: err instanceof Error ? err.message : String(err), to, eventType: payload.eventType },
        'Security alert email send threw (non-blocking)'
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Dispatch a real-time outbound security alert for `event`, if its severity
 * meets the configured threshold and at least one channel is configured.
 *
 * NEVER throws and NEVER rejects — callers invoke it with `void` and rely on
 * that for availability. Returns a resolved promise.
 */
export async function dispatchSecurityAlert(event: SecurityAlertEvent): Promise<void> {
  try {
    const cfg = loadConfig();
    if (!cfg.enabled) return;
    if (severityRank(event.severity) < alertThreshold()) return;

    const payload = buildPayload(event, cfg.environment);

    // Channels are independent — one failure must not affect the other.
    await Promise.allSettled([
      sendWebhook(payload, cfg),
      sendEmailAlert(payload, cfg),
    ]);
  } catch (err) {
    // Defensive: should be unreachable (all channels catch internally), but
    // guarantee the caller can never be broken by alerting.
    securityAlertLogger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'dispatchSecurityAlert swallowed unexpected error'
    );
  }
}