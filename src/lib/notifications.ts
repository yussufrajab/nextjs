import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ROLES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationData {
  message: string;
  link?: string;
  userId: string;
}

/**
 * Max length of a stored notification message. Notifications are concise
 * action summaries, not full content payloads — capping the length minimizes
 * the amount of potentially-sensitive text persisted and surfaced to the UI.
 */
const NOTIFICATION_MAX_LENGTH = 500;

/**
 * Sanitize notification text (GAP-M12 — notification content minimization).
 *
 * Applied at the `createNotification` / `createNotificationForRole` sink so it
 * covers ALL notification templates (66+) without per-template edits. It:
 *  - strips control / null bytes (prevents terminal-injection and corruption),
 *  - escapes HTML special chars (defensive against XSS in the in-app UI),
 *  - truncates to NOTIFICATION_MAX_LENGTH to limit PII exposure.
 *
 * Complaint subjects and free-text rejection reasons flow through here, so the
 * sanitization is defense-in-depth against PII/active-content leakage.
 */
export function sanitizeNotificationText(input: string): string {
  if (input == null) return '';
  let text = String(input);
  // Strip control chars (incl. NUL, DEL, C0/C1) but keep newlines/tabs
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Escape HTML special chars
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // Truncate to limit PII exposure
  if (text.length > NOTIFICATION_MAX_LENGTH) {
    text = text.slice(0, NOTIFICATION_MAX_LENGTH - 1) + '…';
  }
  return text;
}

export async function createNotification(data: NotificationData) {
  try {
    const safeMessage = sanitizeNotificationText(data.message);
    await db.notification.create({
      data: {
        id: uuidv4(),
        message: safeMessage,
        link: data.link,
        userId: data.userId,
        isRead: false,
      },
    });
    logger.info({ message: safeMessage, userId: data.userId }, 'Notification created');
  } catch (error) {
    logger.error({ err: error }, 'Failed to create notification');
  }
}

export async function createNotificationForRole(
  role: string,
  message: string,
  link?: string
) {
  try {
    const safeMessage = sanitizeNotificationText(message);
    const users = await db.user.findMany({
      where: { role: role, active: true },
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      id: uuidv4(),
      message: safeMessage,
      link,
      userId: user.id,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
      logger.info({ count: notifications.length, role }, 'Created notifications for role');
    }
  } catch (error) {
    logger.error({ err: error, role }, 'Failed to create notifications for role');
  }
}

// Specific notification templates for HR workflows
export const NotificationTemplates = {
  // Promotion Request Notifications (English)
  promotionSubmitted: (employeeName: string, requestId: string) => ({
    message: `New promotion request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/promotion`,
  }),

  promotionApproved: (requestId: string) => ({
    message: `Your promotion request (${requestId}) has been approved. Congratulations!`,
    link: `/dashboard/promotion`,
  }),

  promotionRejected: (requestId: string, reason: string) => ({
    message: `Your promotion request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/promotion`,
  }),

  promotionHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Promotion request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/promotion`,
  }),

  promotionHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Promotion request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/promotion`,
  }),

  promotionPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New promotion request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/promotion`,
  }),

  // Complaint Notifications
  complaintSubmitted: (
    employeeName: string,
    complaintId: string,
    subject: string
  ) => ({
    message: `Lalamiko jipya limewasilishwa na ${employeeName} (${complaintId}): "${subject}". Inahitaji ukaguzi wako.`,
    link: `/dashboard/complaints`,
  }),

  complaintResolved: (complaintId: string) => ({
    message: `Lalamiko lako (${complaintId}) limetatuliwa. Tafadhali thibitisha umeridhika na suluhisho.`,
    link: `/dashboard/complaints`,
  }),

  complaintMoreInfoRequested: (complaintId: string) => ({
    message: `Maelezo zaidi yamehitajika kwa lalamiko lako (${complaintId}). Tafadhali ongeza maelezo.`,
    link: `/dashboard/complaints`,
  }),

  // LWOP Request Notifications (English)
  lwopSubmitted: (employeeName: string, requestId: string) => ({
    message: `New leave without pay request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/lwop`,
  }),

  lwopApproved: (requestId: string) => ({
    message: `Your leave without pay request (${requestId}) has been approved.`,
    link: `/dashboard/lwop`,
  }),

  lwopRejected: (requestId: string, reason: string) => ({
    message: `Your leave without pay request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/lwop`,
  }),

  lwopHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `LWOP request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/lwop`,
  }),

  lwopHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `LWOP request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/lwop`,
  }),

  lwopPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New LWOP request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/lwop`,
  }),

  // Confirmation Request Notifications (English)
  confirmationSubmitted: (employeeName: string, requestId: string) => ({
    message: `New confirmation request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/confirmation`,
  }),

  confirmationApproved: (requestId: string) => ({
    message: `Your confirmation request (${requestId}) has been approved. Congratulations!`,
    link: `/dashboard/confirmation`,
  }),

  confirmationRejected: (requestId: string, reason: string) => ({
    message: `Your confirmation request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/confirmation`,
  }),

  confirmationHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Confirmation request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/confirmation`,
  }),

  confirmationHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Confirmation request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/confirmation`,
  }),

  confirmationPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New confirmation request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/confirmation`,
  }),

  // Retirement Request Notifications (English)
  retirementSubmitted: (employeeName: string, requestId: string) => ({
    message: `New retirement request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/retirement`,
  }),

  retirementApproved: (requestId: string) => ({
    message: `Your retirement request (${requestId}) has been approved.`,
    link: `/dashboard/retirement`,
  }),

  retirementRejected: (requestId: string, reason: string) => ({
    message: `Your retirement request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/retirement`,
  }),

  retirementHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Retirement request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/retirement`,
  }),

  retirementHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Retirement request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/retirement`,
  }),

  retirementPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New retirement request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/retirement`,
  }),

  // Service Extension Request Notifications (English)
  serviceExtensionSubmitted: (employeeName: string, requestId: string) => ({
    message: `New service extension request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/service-extension`,
  }),

  serviceExtensionApproved: (requestId: string) => ({
    message: `Your service extension request (${requestId}) has been approved.`,
    link: `/dashboard/service-extension`,
  }),

  serviceExtensionRejected: (requestId: string, reason: string) => ({
    message: `Your service extension request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/service-extension`,
  }),

  serviceExtensionHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Service extension request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/service-extension`,
  }),

  serviceExtensionHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Service extension request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/service-extension`,
  }),

  serviceExtensionPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New service extension request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/service-extension`,
  }),

  // Cadre Change Request Notifications (English)
  cadreChangeSubmitted: (employeeName: string, requestId: string) => ({
    message: `New cadre change request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/cadre-change`,
  }),

  cadreChangeApproved: (requestId: string) => ({
    message: `Your cadre change request (${requestId}) has been approved.`,
    link: `/dashboard/cadre-change`,
  }),

  cadreChangeRejected: (requestId: string, reason: string) => ({
    message: `Your cadre change request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/cadre-change`,
  }),

  cadreChangeHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Cadre change request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/cadre-change`,
  }),

  cadreChangeHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Cadre change request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/cadre-change`,
  }),

  cadreChangePendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New cadre change request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/cadre-change`,
  }),

  // Termination Request Notifications (English)
  terminationSubmitted: (employeeName: string, requestId: string) => ({
    message: `New termination request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/termination`,
  }),

  terminationApproved: (requestId: string) => ({
    message: `Your termination request (${requestId}) has been approved.`,
    link: `/dashboard/termination`,
  }),

  terminationRejected: (requestId: string, reason: string) => ({
    message: `Your termination request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/termination`,
  }),

  terminationHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Termination request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/termination`,
  }),

  terminationHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Termination request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/termination`,
  }),

  terminationPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New termination request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/termination`,
  }),

  // Resignation Request Notifications (English)
  resignationSubmitted: (employeeName: string, requestId: string) => ({
    message: `New resignation request submitted by ${employeeName} (${requestId}). Requires your review.`,
    link: `/dashboard/resignation`,
  }),

  resignationApproved: (requestId: string) => ({
    message: `Your resignation request (${requestId}) has been approved.`,
    link: `/dashboard/resignation`,
  }),

  resignationRejected: (requestId: string, reason: string) => ({
    message: `Your resignation request (${requestId}) has been rejected. Reason: ${reason}`,
    link: `/dashboard/resignation`,
  }),

  resignationHrrpApproved: (employeeName: string, requestId: string) => ({
    message: `Resignation request for ${employeeName} (${requestId}) has been approved by HRRP and forwarded to the Commission for review.`,
    link: `/dashboard/resignation`,
  }),

  resignationHrrpRejected: (employeeName: string, requestId: string, reason: string) => ({
    message: `Resignation request for ${employeeName} (${requestId}) has been rejected by HRRP. Reason: ${reason}`,
    link: `/dashboard/resignation`,
  }),

  resignationPendingHrrpReview: (employeeName: string, requestId: string) => ({
    message: `New resignation request for ${employeeName} (${requestId}) is pending your HRRP review.`,
    link: `/dashboard/resignation`,
  }),

  // Generic system notifications (English)
  welcomeMessage: () => ({
    message: `Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.`,
    link: `/dashboard`,
  }),

  // Password Expiration Notifications
  passwordExpiring14Days: (daysRemaining: number, expiresAt: Date) => ({
    message: `Your password will expire in ${daysRemaining} days (on ${expiresAt.toLocaleDateString()}). Please change it soon to avoid account disruption.`,
    link: `/change-password-required`,
  }),

  passwordExpiring7Days: (daysRemaining: number, expiresAt: Date) => ({
    message: `Your password will expire in ${daysRemaining} days (on ${expiresAt.toLocaleDateString()}). Please change it as soon as possible.`,
    link: `/change-password-required`,
  }),

  passwordExpiring3Days: (daysRemaining: number, expiresAt: Date) => ({
    message: `URGENT: Your password will expire in ${daysRemaining} days (on ${expiresAt.toLocaleDateString()}). Change it immediately to maintain access.`,
    link: `/change-password-required`,
  }),

  passwordExpiring1Day: (expiresAt: Date) => ({
    message: `CRITICAL: Your password expires tomorrow (${expiresAt.toLocaleDateString()}). Change it now to avoid being locked out.`,
    link: `/change-password-required`,
  }),

  passwordExpired: (graceDaysRemaining: number) => ({
    message: `Your password has expired. You have ${graceDaysRemaining} days of grace period remaining. You must change your password on your next login.`,
    link: `/change-password-required`,
  }),

  passwordExpiredFinal: () => ({
    message: `Your password has expired and the grace period has ended. You cannot access the system until an administrator resets your password.`,
    link: null,
  }),

  // Account Lockout Notifications
  accountLockedFailedAttempts: (attempts: number, lockoutType: string) => ({
    message: `Your account has been locked after ${attempts} failed login attempts. ${lockoutType === 'standard' ? 'It will automatically unlock in 30 minutes.' : 'Please contact an administrator to unlock your account.'}`,
    link: null,
  }),

  accountLockedByAdmin: (reason: string) => ({
    message: `Your account has been locked by an administrator. Reason: ${reason}. Please contact support for assistance.`,
    link: null,
  }),

  accountUnlocked: () => ({
    message: `Your account has been unlocked by an administrator. You can now log in to the system.`,
    link: '/login',
  }),

  accountAutoUnlocked: () => ({
    message: `Your account lockout period has expired. You can now log in to the system.`,
    link: '/login',
  }),
};
