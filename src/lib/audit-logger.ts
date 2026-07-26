/**
 * Audit Logging Utility
 *
 * Logs security events, unauthorized access attempts, and system activities
 * for compliance, monitoring, and security analysis.
 *
 * Uses the raw SQL layer from audit-db.ts for all database operations
 * instead of Prisma, targeting the partitioned audit.audit_log table.
 */

import {
  writeAuditLog,
  queryAuditLogs,
  queryAuditStats,
  ensurePartitions,
} from './audit-db';
import { logger } from '@/lib/logger';
import { dispatchSecurityAlert } from '@/lib/security-alerts';

export enum AuditEventType {
  // Access Control Events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  FORBIDDEN_ROUTE = 'FORBIDDEN_ROUTE',

  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization Events
  ROLE_VIOLATION = 'ROLE_VIOLATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Suspicious Activity
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  SUSPICIOUS_LOGIN_SUCCESS = 'SUSPICIOUS_LOGIN_SUCCESS',
  POTENTIAL_BREACH = 'POTENTIAL_BREACH',
  // A successful login used a password that appears in a known breach (HIBP).
  // Not blocked — flagged for the user to change it and for SOC review.
  PASSWORD_PWNED_LOGIN = 'PASSWORD_PWNED_LOGIN',

  // Request Management Events
  REQUEST_APPROVED = 'REQUEST_APPROVED',
  REQUEST_REJECTED = 'REQUEST_REJECTED',
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  REQUEST_UPDATED = 'REQUEST_UPDATED',
  REQUEST_WITHDRAWN = 'REQUEST_WITHDRAWN',
  REQUEST_FORWARDED = 'REQUEST_FORWARDED',
  EMPLOYEE_CREATED = 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED = 'EMPLOYEE_UPDATED',
  EMPLOYEE_DELETED = 'EMPLOYEE_DELETED',
  // Req 5.6: a successful PII read of a single employee profile. Distinct from
  // the write events above and from IDOR denials (which log UNAUTHORIZED_ACCESS)
  // so that every disclosure of sanitized PII is discoverable in the audit trail.
  EMPLOYEE_VIEWED = 'EMPLOYEE_VIEWED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  COMPLAINT_SUBMITTED = 'COMPLAINT_SUBMITTED',
  COMPLAINT_UPDATED = 'COMPLAINT_UPDATED',
  COMPLAINT_RESOLVED = 'COMPLAINT_RESOLVED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ADMIN_PASSWORD_RESET = 'ADMIN_PASSWORD_RESET',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  FILE_PREVIEWED = 'FILE_PREVIEWED',
  FILE_EXISTS_CHECK = 'FILE_EXISTS_CHECK',
  INSTITUTION_CREATED = 'INSTITUTION_CREATED',
  INSTITUTION_UPDATED = 'INSTITUTION_UPDATED',

  // Reporting Events (Q14, Req 12.5 / 27.2)
  REPORT_VIEWED = 'REPORT_VIEWED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',

  // System / Configuration Events
  HRIMS_CONFIG_CHANGED = 'HRIMS_CONFIG_CHANGED',
  SYSTEM_SETTING_CHANGED = 'SYSTEM_SETTING_CHANGED',

  // Integration / Synchronization Events (Q8)
  HRIMS_SYNCED = 'HRIMS_SYNCED',
  HRIMS_SYNC_FAILED = 'HRIMS_SYNC_FAILED',

  // Notification Events (Q9)
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
}

export enum AuditEventCategory {
  SECURITY = 'SECURITY',
  ACCESS = 'ACCESS',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SYSTEM = 'SYSTEM',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogData {
  eventType: AuditEventType | string;
  eventCategory: AuditEventCategory | string;
  severity: AuditSeverity | string;
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  attemptedRoute: string;
  requestMethod?: string | null;
  isAuthenticated?: boolean;
  wasBlocked?: boolean;
  blockReason?: string | null;
  additionalData?: Record<string, any> | null;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    await writeAuditLog({
      eventType: data.eventType,
      eventCategory: data.eventCategory,
      severity: data.severity,
      userId: data.userId,
      username: data.username,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
      attemptedRoute: data.attemptedRoute,
      requestMethod: data.requestMethod,
      isAuthenticated: data.isAuthenticated ?? false,
      wasBlocked: data.wasBlocked ?? false,
      blockReason: data.blockReason,
      additionalData: data.additionalData,
    });

    // Also log to structured logger for real-time monitoring
    logger.info({
      severity: data.severity,
      eventType: data.eventType,
      user: data.username || 'anonymous',
      role: data.userRole || 'none',
      route: data.attemptedRoute,
      blocked: data.wasBlocked,
      reason: data.blockReason,
    }, `Audit event: ${data.eventType}`);

    // Real-time outbound alert (Req 26.6): fire-and-forget to webhook/SIEM +
    // email for events at/above the configured severity threshold. Never
    // awaited and never throws — see src/lib/security-alerts.ts. An audit
    // row is the system of record; this is the real-time SOC signal on top.
    void dispatchSecurityAlert({
      eventType: data.eventType,
      eventCategory: data.eventCategory,
      severity: data.severity,
      userId: data.userId,
      username: data.username,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      attemptedRoute: data.attemptedRoute,
      requestMethod: data.requestMethod,
      isAuthenticated: data.isAuthenticated,
      wasBlocked: data.wasBlocked,
      blockReason: data.blockReason,
      additionalData: data.additionalData,
      message: `Audit event ${data.eventType} on ${data.attemptedRoute}`,
    });
  } catch (error: any) {
    // If audit logging fails, log to structured logger but don't throw
    // We don't want audit logging failures to break the app
    logger.error({ err: error }, 'Failed to log audit event');
    logger.error({ eventData: data }, 'Event data for failed audit log');

    // An audit-write failure is itself a security signal (DB outage or
    // tampering) — page the SOC even though the row never landed. Always
    // ERROR severity so it clears the default CRITICAL-only threshold only
    // when the operator has lowered it; otherwise the operator can raise it
    // to ERROR via SECURITY_ALERT_SEVERITY_THRESHOLD=ERROR.
    void dispatchSecurityAlert({
      eventType: 'AUDIT_WRITE_FAILED',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.ERROR,
      userId: data.userId,
      username: data.username,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      attemptedRoute: data.attemptedRoute,
      requestMethod: data.requestMethod,
      isAuthenticated: data.isAuthenticated,
      wasBlocked: false,
      blockReason: error?.message ? String(error.message) : 'audit write failed',
      additionalData: { eventType: data.eventType },
      message: `Failed to persist audit event ${data.eventType} on ${data.attemptedRoute}`,
    });
  }
}

/**
 * Await an audit-write promise, logging (never throwing) on rejection. Use
 * this instead of `.catch(() => {})` at call sites so an audit-write failure
 * is never silently swallowed (Req 10.8 / Remediation #13). `logAuditEvent`
 * already handles failures internally — pino log + `AUDIT_WRITE_FAILED`
 * security alert — and does not reject in practice; this is a defense-in-depth
 * backstop that makes the "no silent audit failures" intent explicit at the
 * call site and survives any future helper that wraps `logAuditEvent`.
 */
export async function safeAuditLog(p: Promise<void>, context?: string): Promise<void> {
  try {
    await p;
  } catch (err) {
    logger.error({ err, context }, 'Audit write failed (call-site backstop)');
  }
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(data: {
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  attemptedRoute: string;
  blockReason: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  isAuthenticated?: boolean;
  requestMethod?: string;
  severity?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.UNAUTHORIZED_ACCESS,
    eventCategory: AuditEventCategory.SECURITY,
    severity: data.severity || AuditSeverity.WARNING,
    ...data,
    wasBlocked: true,
  });
}

/**
 * Log access denied event
 */
export async function logAccessDenied(data: {
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  attemptedRoute: string;
  blockReason: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  requestMethod?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.ACCESS_DENIED,
    eventCategory: AuditEventCategory.AUTHORIZATION,
    severity: AuditSeverity.WARNING,
    isAuthenticated: true,
    ...data,
    wasBlocked: true,
  });
}

/**
 * Log forbidden route access
 */
export async function logForbiddenRoute(data: {
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  attemptedRoute: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  requestMethod?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.FORBIDDEN_ROUTE,
    eventCategory: AuditEventCategory.ACCESS,
    severity: AuditSeverity.ERROR,
    isAuthenticated: true,
    blockReason: `Role "${data.userRole}" does not have permission to access "${data.attemptedRoute}"`,
    ...data,
    wasBlocked: true,
  });
}

/**
 * Log login attempt
 */
export async function logLoginAttempt(data: {
  success: boolean;
  username: string;
  userId?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  failureReason?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: data.success
      ? AuditEventType.LOGIN_SUCCESS
      : AuditEventType.LOGIN_FAILED,
    eventCategory: AuditEventCategory.AUTHENTICATION,
    severity: data.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    userId: data.userId,
    username: data.username,
    userRole: data.userRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: '/login',
    requestMethod: 'POST',
    isAuthenticated: data.success,
    wasBlocked: !data.success,
    blockReason: data.failureReason,
    additionalData: data.additionalData,
  });
}

/**
 * Log a successful login that was flagged as suspicious (new device / new IP /
 * concurrent sessions / rapid succession). This is the audit-record counterpart
 * to `Session.isSuspicious = true` and the in-app notification.
 *
 * The user's notification is sent by the caller — this helper only writes the
 * audit row so the suspicious event is discoverable in the audit trail.
 */
export async function logSuspiciousLoginSuccess(data: {
  userId: string;
  username: string;
  userRole: string;
  ipAddress: string | null;
  deviceInfo?: Record<string, any> | null;
  reasons: string[];
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.SUSPICIOUS_LOGIN_SUCCESS,
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.WARNING,
    userId: data.userId,
    username: data.username,
    userRole: data.userRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: '/api/auth/login',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    additionalData: {
      reasons: data.reasons,
      notifyUser: true,
    },
  });
}

/**
 * Parsed list of CIDR ranges for trusted reverse proxies.
 *
 * Sourced from `TRUSTED_PROXY_IPS` env var (comma-separated CIDR list, e.g.
 * `10.0.0.0/8,192.168.0.0/16,172.16.0.0/12`). When unset, NO upstream proxy is
 * trusted, which means `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`
 * headers are IGNORED and only the immediate peer IP is used. This is the
 * safe default — it prevents header-spoofing bypasses of per-IP rate limits.
 */
let _trustedProxyCidrs: string[] | null = null;
function getTrustedProxyCidrs(): string[] {
  if (_trustedProxyCidrs !== null) return _trustedProxyCidrs;
  const raw = process.env.TRUSTED_PROXY_IPS?.trim() ?? '';
  _trustedProxyCidrs = raw === '' ? [] : raw.split(',').map((s) => s.trim()).filter(Boolean);
  return _trustedProxyCidrs;
}

/**
 * Check whether an IPv4 address falls within a CIDR block.
 * IPv6 is accepted as a string but not range-matched (defensive — log a
 * warning if a v6 trusted proxy is configured).
 */
function ipInCidr(ip: string, cidr: string): boolean {
  if (!ip.includes('.')) return false; // IPv4 only for now
  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
  if (!range || isNaN(bits) || bits < 0 || bits > 32) return false;
  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);
  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
  if (ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
  if (rangeParts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
  const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
  const rangeNum = ((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Get the immediate peer IP (no upstream header inspection).
 * This is the safe fallback when no trusted proxy is configured.
 */
function getPeerIp(headers: Headers): string | null {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-vercel-forwarded-for') ||
    headers.get('fly-client-ip') ||
    null
  );
}

/**
 * Get client IP address from request headers.
 *
 * SECURITY: Only honors `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`
 * when the request came through a configured trusted proxy (see
 * `TRUSTED_PROXY_IPS`). When no trusted proxy is configured, the function
 * returns `null` and callers should fall back to the transport-layer peer IP.
 * This prevents an attacker from rotating these headers to bypass per-IP
 * rate limits.
 */
export function getClientIp(headers: Headers): string | null {
  const trustedCidrs = getTrustedProxyCidrs();
  const peerIp = getPeerIp(headers);
  const isFromTrustedProxy = !!peerIp && trustedCidrs.some((cidr) => ipInCidr(peerIp, cidr));

  if (!isFromTrustedProxy) {
    // No trusted upstream — return the immediate peer (or null if unavailable)
    return peerIp;
  }

  // Request came from a trusted proxy — honor XFF chain
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs; the leftmost is the original
    // client. Take the first entry that is NOT in our trusted-proxy range.
    const chain = forwardedFor.split(',').map((s) => s.trim());
    for (const ip of chain) {
      if (!trustedCidrs.some((cidr) => ipInCidr(ip, cidr))) {
        return ip;
      }
    }
    return chain[0];
  }

  // Trusted-proxy path didn't yield a XFF — fall back to x-real-ip / cf-connecting-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) return cfConnectingIp;

  // No upstream headers, but the peer itself is the client
  return peerIp;
}

/**
 * Query audit logs with filters
 */
export async function getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  userId?: string;
  username?: string;
  attemptedRoute?: string;
  limit?: number;
  offset?: number;
}) {
  const result = await queryAuditLogs({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    eventType: filters?.eventType,
    eventCategory: filters?.eventCategory,
    severity: filters?.severity,
    userId: filters?.userId,
    username: filters?.username,
    attemptedRoute: filters?.attemptedRoute,
    limit: filters?.limit,
    offset: filters?.offset,
  });

  return {
    logs: result.logs,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const result = await queryAuditStats({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
  });

  return {
    totalEvents: result.totalEvents,
    blockedAttempts: result.blockedAttempts,
    criticalEvents: result.criticalEvents,
    eventsByType: result.eventsByType,
    eventsBySeverity: result.eventsBySeverity,
  };
}

/**
 * Log request approval
 */
export async function logRequestApproval(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  employeeZanId?: string;
  approvedById: string;
  approvedByUsername: string;
  approvedByRole: string;
  reviewStage?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_APPROVED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.approvedById,
    username: data.approvedByUsername,
    userRole: data.approvedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}/${data.requestId}`,
    requestMethod: 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      reviewStage: data.reviewStage,
      action: 'APPROVED',
      ...data.additionalData,
    },
  });
}

/**
 * Log request rejection
 */
export async function logRequestRejection(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  employeeZanId?: string;
  rejectedById: string;
  rejectedByUsername: string;
  rejectedByRole: string;
  rejectionReason?: string;
  reviewStage?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_REJECTED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.WARNING,
    userId: data.rejectedById,
    username: data.rejectedByUsername,
    userRole: data.rejectedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}/${data.requestId}`,
    requestMethod: 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: data.rejectionReason || null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      rejectionReason: data.rejectionReason,
      reviewStage: data.reviewStage,
      action: 'REJECTED',
      ...data.additionalData,
    },
  });
}

/**
 * Log request withdrawal (GAP-M2). A withdrawal is the submitter (or an
 * authorized user) cancelling their own request before a decision is made.
 * The `withdrawalReason` and `withdrawnBy*` fields are recorded for
 * non-repudiation. Severity WARNING — withdrawals of in-flight requests are
 * operationally significant and should be reviewable in the audit trail.
 */
export async function logRequestWithdrawal(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  employeeZanId?: string;
  withdrawnById: string;
  withdrawnByUsername: string;
  withdrawnByRole: string;
  withdrawalReason?: string;
  reviewStage?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_WITHDRAWN,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.WARNING,
    userId: data.withdrawnById,
    username: data.withdrawnByUsername,
    userRole: data.withdrawnByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}/${data.requestId}`,
    requestMethod: 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: data.withdrawalReason || null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      withdrawalReason: data.withdrawalReason,
      reviewStage: data.reviewStage,
      action: 'WITHDRAWN',
      ...data.additionalData,
    },
  });
}

/**
 * Log request forwarding (e.g. HRO → HRRP, HRRP → Commission).
 * Distinct from approval: a forward is a state transition without a verdict.
 * The `fromStage` and `toStage` are recorded in additionalData for forensic value.
 */
export async function logRequestForward(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  employeeZanId?: string;
  forwardedById: string;
  forwardedByUsername: string;
  forwardedByRole: string;
  fromStage: string;
  toStage: string;
  comment?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_FORWARDED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.forwardedById,
    username: data.forwardedByUsername,
    userRole: data.forwardedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}/${data.requestId}`,
    requestMethod: 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      fromStage: data.fromStage,
      toStage: data.toStage,
      comment: data.comment,
      action: 'FORWARDED',
      ...data.additionalData,
    },
  });
}

/**
 * Log request submission
 */
export async function logRequestSubmission(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  employeeZanId?: string;
  submittedById: string;
  submittedByUsername: string;
  submittedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_SUBMITTED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.submittedById,
    username: data.submittedByUsername,
    userRole: data.submittedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}`,
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      action: 'SUBMITTED',
      ...data.additionalData,
    },
  });
}

/**
 * Log request update (non-approval/rejection)
 */
export async function logRequestUpdate(data: {
  requestType: string;
  requestId: string;
  employeeId?: string;
  employeeName?: string;
  updatedById: string;
  updatedByUsername: string;
  updatedByRole: string;
  updateDetails?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.REQUEST_UPDATED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.updatedById,
    username: data.updatedByUsername,
    userRole: data.updatedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/${data.requestType.toLowerCase()}/${data.requestId}`,
    requestMethod: 'PATCH',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      requestType: data.requestType,
      requestId: data.requestId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      updateDetails: data.updateDetails,
      action: 'UPDATED',
      ...data.additionalData,
    },
  });
}

/**
 * Log employee creation or update
 */
export async function logEmployeeAction(data: {
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  employeeId: string;
  employeeName?: string;
  employeeZanId?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventTypeMap = {
    CREATED: AuditEventType.EMPLOYEE_CREATED,
    UPDATED: AuditEventType.EMPLOYEE_UPDATED,
    DELETED: AuditEventType.EMPLOYEE_DELETED,
  };
  await logAuditEvent({
    eventType: eventTypeMap[data.action],
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: data.action === 'DELETED' ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/employees${data.action === 'CREATED' ? '' : `/${data.employeeId}`}`,
    requestMethod: data.action === 'CREATED' ? 'POST' : data.action === 'UPDATED' ? 'PATCH' : 'DELETE',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      action: data.action,
      ...data.additionalData,
    },
  });
}

/**
 * Log a successful profile view (Req 5.6).
 *
 * The single-employee GET path returns sanitized PII but previously wrote no
 * audit event on success — only IDOR denials were logged. This closes that gap
 * by emitting an ACCESS event for every successful PII read, recording the
 * actor and the target employee (id + zanId + name) WITHOUT the PII payload
 * itself. Self-views (an EMPLOYEE reading their own record) are logged too:
 * the actor/target ids make the relationship explicit for SOC triage.
 */
export async function logEmployeeView(data: {
  employeeId: string;
  employeeName?: string;
  employeeZanId?: string;
  targetInstitutionId?: string | null;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.EMPLOYEE_VIEWED,
    eventCategory: AuditEventCategory.ACCESS,
    severity: AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/employees?id=${data.employeeId}`,
    requestMethod: 'GET',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeZanId: data.employeeZanId,
      targetInstitutionId: data.targetInstitutionId,
      action: 'VIEWED',
      ...data.additionalData,
    },
  });
}

/**
 * Log an HRIMS synchronization event (Q8 — Domains 11.6, 29.1–29.5).
 *
 * HRIMS sync routes previously wrote only to the plain structured logger
 * (`hrimsLogger`), so syncs were absent from the tamper-evident audit trail.
 * This records the actor, the institution synced, and the result counts in the
 * audit log for both successful and failed syncs.
 */
export async function logHrimsSync(data: {
  success: boolean;
  performedById: string;
  performedByUsername?: string;
  performedByRole?: string;
  institutionId?: string | null;
  institutionVoteNumber?: string | null;
  zanId?: string | null;
  route: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: data.success
      ? AuditEventType.HRIMS_SYNCED
      : AuditEventType.HRIMS_SYNC_FAILED,
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: data.success ? AuditSeverity.INFO : AuditSeverity.ERROR,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: data.route,
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      institutionId: data.institutionId,
      institutionVoteNumber: data.institutionVoteNumber,
      zanId: data.zanId,
      ...data.additionalData,
    },
  });
}

/**
 * Log user management action
 */
export async function logUserAction(data: {
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  targetUserId: string;
  targetUsername?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventTypeMap = {
    CREATED: AuditEventType.USER_CREATED,
    UPDATED: AuditEventType.USER_UPDATED,
    DELETED: AuditEventType.USER_DELETED,
  };
  await logAuditEvent({
    eventType: eventTypeMap[data.action],
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: data.action === 'DELETED' ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/users${data.action === 'CREATED' ? '' : `/${data.targetUserId}`}`,
    requestMethod: data.action === 'CREATED' ? 'POST' : data.action === 'UPDATED' ? 'PATCH' : 'DELETE',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      targetUserId: data.targetUserId,
      targetUsername: data.targetUsername,
      action: data.action,
      ...data.additionalData,
    },
  });
}

/**
 * Log a system configuration change (HRIMS endpoint, integration keys, etc.).
 *
 * These events are CRITICAL severity because they redirect system-wide data flow.
 * The `previousValue` and `newValue` should NEVER contain the secret itself —
 * redact the value and only record that it changed.
 */
export async function logConfigChange(data: {
  configKey: string;
  previousValue: string | null; // redacted
  newValue: string | null;      // redacted
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventType =
    data.configKey.toUpperCase().startsWith('HRIMS')
      ? AuditEventType.HRIMS_CONFIG_CHANGED
      : AuditEventType.SYSTEM_SETTING_CHANGED;

  await logAuditEvent({
    eventType,
    eventCategory: AuditEventCategory.SYSTEM,
    severity: AuditSeverity.CRITICAL,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/admin/${data.configKey}`,
    requestMethod: 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    additionalData: {
      configKey: data.configKey,
      previousValue: data.previousValue,
      newValue: data.newValue,
      ...data.additionalData,
    },
  });
}

/**
 * Log complaint lifecycle event
 */
export async function logComplaintAction(data: {
  action: 'SUBMITTED' | 'UPDATED' | 'RESOLVED';
  complaintId: string;
  complainantId?: string;
  subject?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventTypeMap = {
    SUBMITTED: AuditEventType.COMPLAINT_SUBMITTED,
    UPDATED: AuditEventType.COMPLAINT_UPDATED,
    RESOLVED: AuditEventType.COMPLAINT_RESOLVED,
  };
  const severityMap = {
    SUBMITTED: AuditSeverity.INFO,
    UPDATED: AuditSeverity.INFO,
    RESOLVED: AuditSeverity.INFO,
  };
  await logAuditEvent({
    eventType: eventTypeMap[data.action],
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: severityMap[data.action],
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/complaints${data.action === 'SUBMITTED' ? '' : `/${data.complaintId}`}`,
    requestMethod: data.action === 'SUBMITTED' ? 'POST' : 'PUT',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      complaintId: data.complaintId,
      complainantId: data.complainantId,
      subject: data.subject,
      action: data.action,
      ...data.additionalData,
    },
  });
}

/**
 * Log file operation
 */
export async function logFileAction(data: {
  action: 'UPLOADED' | 'DELETED' | 'DOWNLOADED' | 'PREVIEWED' | 'EXISTS';
  fileName?: string;
  objectKey?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventTypeMap = {
    UPLOADED: AuditEventType.FILE_UPLOADED,
    DELETED: AuditEventType.FILE_DELETED,
    DOWNLOADED: AuditEventType.FILE_DOWNLOADED,
    PREVIEWED: AuditEventType.FILE_PREVIEWED,
    EXISTS: AuditEventType.FILE_EXISTS_CHECK,
  };
  const requestMethodMap = {
    UPLOADED: 'POST',
    DELETED: 'DELETE',
    DOWNLOADED: 'GET',
    PREVIEWED: 'GET',
    EXISTS: 'GET',
  };
  const routeSegment =
    data.action === 'UPLOADED'
      ? 'upload'
      : data.action === 'DELETED'
        ? 'delete'
        : data.action === 'EXISTS'
          ? 'exists'
          : 'download';
  await logAuditEvent({
    eventType: eventTypeMap[data.action],
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/files/${routeSegment}/${data.objectKey || ''}`,
    requestMethod: requestMethodMap[data.action],
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      fileName: data.fileName,
      objectKey: data.objectKey,
      action: data.action,
      ...data.additionalData,
    },
  });
}

/**
 * Log institution management action
 */
export async function logInstitutionAction(data: {
  action: 'CREATED' | 'UPDATED';
  institutionId: string;
  institutionName?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const eventTypeMap = {
    CREATED: AuditEventType.INSTITUTION_CREATED,
    UPDATED: AuditEventType.INSTITUTION_UPDATED,
  };
  await logAuditEvent({
    eventType: eventTypeMap[data.action],
    eventCategory: AuditEventCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/institutions${data.action === 'CREATED' ? '' : `/${data.institutionId}`}`,
    requestMethod: data.action === 'CREATED' ? 'POST' : 'PATCH',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      institutionId: data.institutionId,
      institutionName: data.institutionName,
      action: data.action,
      ...data.additionalData,
    },
  });
}

/**
 * Log account lock/unlock event
 */
export async function logAccountAction(data: {
  action: 'LOCKED' | 'UNLOCKED';
  targetUserId: string;
  targetUsername?: string;
  performedById: string;
  performedByUsername: string;
  performedByRole: string;
  reason?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: data.action === 'LOCKED' ? AuditEventType.ACCOUNT_LOCKED : AuditEventType.ACCOUNT_UNLOCKED,
    eventCategory: AuditEventCategory.SECURITY,
    severity: data.action === 'LOCKED' ? AuditSeverity.WARNING : AuditSeverity.INFO,
    userId: data.performedById,
    username: data.performedByUsername,
    userRole: data.performedByRole,
    ipAddress: data.ipAddress,
    deviceInfo: data.deviceInfo,
    attemptedRoute: `/api/admin/${data.action === 'LOCKED' ? 'lock-account' : 'unlock-account'}`,
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: data.reason || null,
    additionalData: {
      targetUserId: data.targetUserId,
      targetUsername: data.targetUsername,
      action: data.action,
      reason: data.reason,
      ...data.additionalData,
    },
  });
}

export default {
  logAuditEvent,
  safeAuditLog,
  logUnauthorizedAccess,
  logAccessDenied,
  logForbiddenRoute,
  logLoginAttempt,
  logSuspiciousLoginSuccess,
  logRequestApproval,
  logRequestRejection,
  logRequestForward,
  logRequestWithdrawal,
  logRequestSubmission,
  logRequestUpdate,
  logEmployeeAction,
  logEmployeeView,
  logUserAction,
  logConfigChange,
  logComplaintAction,
  logFileAction,
  logInstitutionAction,
  logAccountAction,
  getClientIp,
  getAuditLogs,
  getAuditStatistics,
  ensurePartitions,
};