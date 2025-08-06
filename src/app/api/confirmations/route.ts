import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Confirmations API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all confirmation data across institutions`);
    }

    const requests = await db.confirmationRequest.findMany({
      where: whereClause,
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
        submittedBy: { 
          select: { id: true, name: true, username: true } 
        },
        reviewedBy: { 
          select: { id: true, name: true, username: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

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

    // Get employee details to check status
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true }
    });

    if (!employee) {
      return NextResponse.json({ 
        success: false, 
        message: 'Employee not found' 
      }, { status: 404 });
    }

    // Validate employee status for confirmation request
    const statusValidation = validateEmployeeStatusForRequest(employee.status, 'confirmation');
    if (!statusValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: statusValidation.message 
      }, { status: 403 });
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