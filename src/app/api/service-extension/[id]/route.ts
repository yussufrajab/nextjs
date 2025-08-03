import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  currentRetirementDate: z.string().datetime().optional(),
  requestedExtensionPeriod: z.string().optional(),
  justification: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateSchema.parse(body);
    
    const updatedRequest = await db.serviceExtensionRequest.update({
      where: { id },
      data: validatedData,
      include: {
        employee: { select: { name: true, zanId: true, department: true, cadre: true, employmentDate: true, dateOfBirth: true, institution: { select: { name: true } }, payrollNumber: true, zssfNumber: true }},
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
            message: `Your Service Extension request for "${updatedRequest.requestedExtensionPeriod}" has been updated to: ${validatedData.status}.`,
            link: `/dashboard/service-extension`,
          },
        });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[SERVICE_EXTENSION_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
