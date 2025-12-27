/**
 * Audit Logging Utility
 *
 * Logs security events, unauthorized access attempts, and system activities
 * for compliance, monitoring, and security analysis.
 */

import { PrismaClient } from '@prisma/client';

// Use global prisma instance to avoid creating multiple connections
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
  POTENTIAL_BREACH = 'POTENTIAL_BREACH',
}

export enum AuditEventCategory {
  SECURITY = 'SECURITY',
  ACCESS = 'ACCESS',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SYSTEM = 'SYSTEM',
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
  userAgent?: string | null;
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
    await prisma.auditLog.create({
      data: {
        eventType: data.eventType,
        eventCategory: data.eventCategory,
        severity: data.severity,
        userId: data.userId,
        username: data.username,
        userRole: data.userRole,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        attemptedRoute: data.attemptedRoute,
        requestMethod: data.requestMethod,
        isAuthenticated: data.isAuthenticated ?? false,
        wasBlocked: data.wasBlocked ?? true,
        blockReason: data.blockReason,
        additionalData: data.additionalData ? JSON.parse(JSON.stringify(data.additionalData)) : null,
      },
    });

    // Also log to console for real-time monitoring
    console.log(`[AUDIT] ${data.severity} - ${data.eventType}:`, {
      user: data.username || 'anonymous',
      role: data.userRole || 'none',
      route: data.attemptedRoute,
      blocked: data.wasBlocked,
      reason: data.blockReason,
    });
  } catch (error: any) {
    // Handle foreign key constraint errors - retry without userId
    // Check for P2003 error code (foreign key constraint violation)
    if (error?.code === 'P2003') {
      console.warn('[AUDIT] Foreign key constraint error detected - retrying without userId');
      console.warn('[AUDIT] Original userId:', data.userId);
      console.warn('[AUDIT] Error details:', JSON.stringify(error?.meta || {}));
      try {
        await prisma.auditLog.create({
          data: {
            eventType: data.eventType,
            eventCategory: data.eventCategory,
            severity: data.severity,
            userId: null,
            username: data.username,
            userRole: data.userRole,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            attemptedRoute: data.attemptedRoute,
            requestMethod: data.requestMethod,
            isAuthenticated: data.isAuthenticated ?? false,
            wasBlocked: data.wasBlocked ?? true,
            blockReason: data.blockReason,
            additionalData: data.additionalData ? JSON.parse(JSON.stringify(data.additionalData)) : null,
          },
        });
        console.log(`[AUDIT] ✅ ${data.severity} - ${data.eventType} (logged without userId):`, {
          user: data.username || 'anonymous',
          role: data.userRole || 'none',
          route: data.attemptedRoute,
          blocked: data.wasBlocked,
        });
      } catch (retryError) {
        console.error('[AUDIT] ❌ Failed to log audit event even without userId:', retryError);
        console.error('[AUDIT] Event data:', data);
      }
    } else {
      // If audit logging fails, log to console but don't throw
      // We don't want audit logging failures to break the app
      console.error('[AUDIT] ❌ Failed to log audit event:', error);
      console.error('[AUDIT] Event data:', data);
    }
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
  userAgent?: string | null;
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
  userAgent?: string | null;
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
  userAgent?: string | null;
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
  userAgent?: string | null;
  failureReason?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    eventType: data.success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED,
    eventCategory: AuditEventCategory.AUTHENTICATION,
    severity: data.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    userId: data.userId,
    username: data.username,
    userRole: data.userRole,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    attemptedRoute: '/login',
    requestMethod: 'POST',
    isAuthenticated: data.success,
    wasBlocked: !data.success,
    blockReason: data.failureReason,
    additionalData: data.additionalData,
  });
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string | null {
  // Check common headers for client IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

/**
 * Query audit logs with filters
 */
export async function getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  severity?: string;
  userId?: string;
  username?: string;
  attemptedRoute?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  if (filters?.eventType) where.eventType = filters.eventType;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.username) where.username = { contains: filters.username, mode: 'insensitive' };
  if (filters?.attemptedRoute) where.attemptedRoute = { contains: filters.attemptedRoute, mode: 'insensitive' };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit: filters?.limit || 100,
    offset: filters?.offset || 0,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [
    totalEvents,
    blockedAttempts,
    criticalEvents,
    eventsByType,
    eventsBySeverity,
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, wasBlocked: true } }),
    prisma.auditLog.count({ where: { ...where, severity: AuditSeverity.CRITICAL } }),
    prisma.auditLog.groupBy({
      by: ['eventType'],
      where,
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: true,
    }),
  ]);

  return {
    totalEvents,
    blockedAttempts,
    criticalEvents,
    eventsByType,
    eventsBySeverity,
  };
}

export default {
  logAuditEvent,
  logUnauthorizedAccess,
  logAccessDenied,
  logForbiddenRoute,
  logLoginAttempt,
  getClientIp,
  getAuditLogs,
  getAuditStatistics,
};
