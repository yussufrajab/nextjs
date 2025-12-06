import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().optional(),
  reviewedById: z.string().optional(),
  commissionDecisionReason: z.string().optional(),
  proposedCadre: z.string().optional(),
  promotionType: z.enum(['Experience', 'EducationAdvancement']).optional(),
  documents: z.array(z.string()).optional(),
  studiedOutsideCountry: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    // Check if promotion exists
    const existingRequest = await db.promotionRequest.findUnique({
      where: { id },
      include: { Employee: true }
    });

    if (!existingRequest) {
      return new NextResponse("Promotion request not found", { status: 404 });
    }

    // Check if this is a Commission approval
    const isCommissionApproval = validatedData.status === "Approved by Commission";
    
    if (isCommissionApproval) {
      // Use transaction to update both promotion request and employee cadre
      const result = await db.$transaction(async (tx) => {
        // Update the promotion request
        const updatedRequest = await tx.promotionRequest.update({
          where: { id },
          data: validatedData,
          include: {
            Employee: { select: { name: true, zanId: true, department: true, cadre: true }},
            User_PromotionRequest_submittedByIdToUser: { select: { name: true, role: true } },
            User_PromotionRequest_reviewedByIdToUser: { select: { name: true, role: true } },
          }
        });

        // Update the employee's cadre to the proposed cadre
        await tx.Employee.update({
          where: { id: existingRequest.employeeId },
          data: {
            cadre: existingRequest.proposedCadre
          }
        });

        return updatedRequest;
      });

      // Send notification
      const userToNotify = await db.User.findUnique({
        where: { employeeId: existingRequest.employeeId },
        select: { id: true }
      });

      if (userToNotify) {
        await db.notification.create({
          data: {
            id: uuidv4(),
            userId: userToNotify.id,
            message: `Your Promotion request for cadre "${existingRequest.proposedCadre}" has been approved by the Commission.`,
            link: `/dashboard/promotion`,
          },
        });
      }

      return NextResponse.json(result);
    } else {
      // Regular update without employee cadre change
      const updatedRequest = await db.promotionRequest.update({
        where: { id },
        data: validatedData,
        include: {
          Employee: { select: { name: true, zanId: true, department: true, cadre: true }},
          User_PromotionRequest_submittedByIdToUser: { select: { name: true, role: true } },
          User_PromotionRequest_reviewedByIdToUser: { select: { name: true, role: true } },
        }
      });

      // Create appropriate notifications based on status changes
      if (validatedData.status) {
        const userToNotify = await db.User.findUnique({
          where: { employeeId: updatedRequest.employeeId },
          select: { id: true }
        });

        if (userToNotify) {
          let notification = null;
          
          if (validatedData.status === "Approved" || validatedData.status === "Commission Approved") {
            notification = NotificationTemplates.promotionApproved(updatedRequest.id);
          } else if (validatedData.status === "Rejected" || validatedData.status === "Commission Rejected") {
            const reason = validatedData.rejectionReason || validatedData.commissionDecisionReason || 'No reason provided';
            notification = NotificationTemplates.promotionRejected(updatedRequest.id, reason);
          } else {
            // Generic status update notification
            notification = {
              message: `Your promotion request for cadre "${updatedRequest.proposedCadre}" has been updated to: ${validatedData.status}`,
              link: `/dashboard/promotion`,
            };
          }
          
          if (notification) {
            await createNotification({
              userId: userToNotify.id,
              message: notification.message,
              link: notification.link,
            });
          }
        }
      }

      return NextResponse.json(updatedRequest);
    }
  } catch (error) {
    console.error("[PROMOTION_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
