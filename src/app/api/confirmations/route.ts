import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    console.log('Confirmations API called with:', { userId, userRole });

    // For now, return all confirmation requests
    // The frontend will handle role-based filtering
    const requests = await db.confirmationRequest.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            payrollNumber: true,
            zssfNumber: true,
            department: true,
            cadre: true,
            dateOfBirth: true,
            employmentDate: true,
            institution: { select: { id: true, name: true } }
          }
        },
        submittedBy: { select: { id: true, name: true, username: true } },
        reviewedBy: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[CONFIRMATIONS_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating confirmation request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById' 
      }, { status: 400 });
    }

    const confirmationRequest = await db.confirmationRequest.create({
      data: {
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        status: body.status || 'Pending',
        reviewStage: body.reviewStage || 'initial',
        documents: body.documents || []
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            payrollNumber: true,
            zssfNumber: true,
            department: true,
            cadre: true,
            dateOfBirth: true,
            employmentDate: true,
            institution: { select: { id: true, name: true } }
          }
        }
      }
    });

    console.log('Created confirmation request:', confirmationRequest.id);

    return NextResponse.json({
      success: true,
      data: confirmationRequest
    });

  } catch (error) {
    console.error("[CONFIRMATIONS_POST]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Request ID is required' 
      }, { status: 400 });
    }

    const updatedRequest = await db.confirmationRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            payrollNumber: true,
            zssfNumber: true,
            department: true,
            cadre: true,
            dateOfBirth: true,
            employmentDate: true,
            institution: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Check if the confirmation request was approved by commission
    if (updateData.status === 'Approved by Commission') {
      try {
        // Update employee status from "On Probation" to "Confirmed"
        await db.employee.update({
          where: { id: updatedRequest.employeeId },
          data: {
            status: 'Confirmed',
            confirmationDate: new Date()
          }
        });

        console.log(`Employee ${updatedRequest.employee.name} (${updatedRequest.employee.zanId}) status updated to "Confirmed" due to commission approval`);
      } catch (employeeUpdateError) {
        console.error('Failed to update employee status:', employeeUpdateError);
        // Don't fail the entire request if employee update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("[CONFIRMATIONS_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}