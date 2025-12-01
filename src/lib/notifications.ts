import { db } from '@/lib/db';
import { ROLES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationData {
  message: string;
  link?: string;
  userId: string;
}

export async function createNotification(data: NotificationData) {
  try {
    await db.notification.create({
      data: {
        id: uuidv4(),
        message: data.message,
        link: data.link,
        userId: data.userId,
        isRead: false,
      },
    });
    console.log('Notification created:', data.message, 'for user:', data.userId);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function createNotificationForRole(role: string, message: string, link?: string) {
  try {
    const users = await db.User.findMany({
      where: { role: role, active: true },
      select: { id: true },
    });

    const notifications = users.map(user => ({
      id: uuidv4(),
      message,
      link,
      userId: user.id,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
      console.log(`Created ${notifications.length} notifications for role: ${role}`);
    }
  } catch (error) {
    console.error('Failed to create notifications for role:', error);
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

  // Complaint Notifications
  complaintSubmitted: (employeeName: string, complaintId: string, subject: string) => ({
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

  // Generic system notifications (English)
  welcomeMessage: () => ({
    message: `Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.`,
    link: `/dashboard`,
  }),
};