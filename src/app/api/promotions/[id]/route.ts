import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const validatedData = updateSchema.parse(body);
    
    // Check if promotion exists
    const existingRequest = await db.promotionRequest.findUnique({
      where: { id: params.id },
      include: { employee: true }
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
          where: { id: params.id },
          data: validatedData,
          include: {
            employee: { select: { name: true, zanId: true, department: true, cadre: true }},
            submittedBy: { select: { name: true, role: true } },
            reviewedBy: { select: { name: true, role: true } },
          }
        });

        // Update the employee's cadre to the proposed cadre
        await tx.employee.update({
          where: { id: existingRequest.employeeId },
          data: {
            cadre: existingRequest.proposedCadre
          }
        });

        return updatedRequest;
      });

      // Send notification
      const userToNotify = await db.user.findUnique({
        where: { employeeId: existingRequest.employeeId },
        select: { id: true }
      });

      if (userToNotify) {
        await db.notification.create({
          data: {
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
        where: { id: params.id },
        data: validatedData,
        include: {
          employee: { select: { name: true, zanId: true, department: true, cadre: true }},
          submittedBy: { select: { name: true, role: true } },
          reviewedBy: { select: { name: true, role: true } },
        }
      });

      if (validatedData.status) {
        const userToNotify = await db.user.findUnique({
          where: { employeeId: updatedRequest.employeeId },
          select: { id: true }
        });

        if (userToNotify) {
          await db.notification.create({
            data: {
              userId: userToNotify.id,
              message: `Your Promotion request for cadre "${updatedRequest.proposedCadre}" has been updated to: ${validatedData.status}.`,
              link: `/dashboard/promotion`,
            },
          });
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
