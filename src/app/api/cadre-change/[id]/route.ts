import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  newCadre: z.string().optional(),
  reason: z.string().optional(),
  studiedOutsideCountry: z.boolean().optional(),
  documents: z.array(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    console.log('Updating cadre change request:', params.id, body);
    
    const validatedData = updateSchema.parse(body);
    
    const updatedRequest = await db.cadreChangeRequest.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        employee: { 
          select: { 
            id: true,
            name: true, 
            zanId: true, 
            department: true, 
            cadre: true, 
            employmentDate: true, 
            dateOfBirth: true, 
            payrollNumber: true, 
            zssfNumber: true,
            institution: { select: { id: true, name: true } } 
          }
        },
        submittedBy: { select: { id: true, name: true, username: true, role: true } },
        reviewedBy: { select: { id: true, name: true, username: true, role: true } },
      }
    });

    // If status is updated, create a notification for the employee
    if (validatedData.status) {
      const userToNotify = await db.user.findUnique({
        where: { employeeId: updatedRequest.employeeId },
        select: { id: true }
      });

      if (userToNotify) {
        await db.notification.create({
          data: {
            userId: userToNotify.id,
            message: `Your Change of Cadre request to "${updatedRequest.newCadre}" has been updated to: ${validatedData.status}.`,
            link: `/dashboard/cadre-change`,
          },
        });
      }
    }

    // If cadre change request is approved by Commission, update employee cadre
    if (validatedData.status === "Approved by Commission" && updatedRequest.employee) {
      await db.employee.update({
        where: { id: updatedRequest.employee.id },
        data: { cadre: updatedRequest.newCadre }
      });
      console.log(`Employee ${updatedRequest.employee.name} cadre updated to "${updatedRequest.newCadre}" after cadre change approval`);
    }

    console.log('Cadre change request updated successfully:', updatedRequest.id);
    return NextResponse.json(updatedRequest);
    
  } catch (error) {
    console.error("[CADRE_CHANGE_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const request = await db.cadreChangeRequest.findUnique({
      where: { id: params.id },
      include: {
        employee: { 
          select: { 
            id: true,
            name: true, 
            zanId: true, 
            department: true, 
            cadre: true, 
            employmentDate: true, 
            dateOfBirth: true, 
            payrollNumber: true, 
            zssfNumber: true,
            institution: { select: { id: true, name: true } } 
          }
        },
        submittedBy: { select: { id: true, name: true, username: true, role: true } },
        reviewedBy: { select: { id: true, name: true, username: true, role: true } },
      }
    });

    if (!request) {
      return new NextResponse('Cadre change request not found', { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("[CADRE_CHANGE_GET_BY_ID]", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}