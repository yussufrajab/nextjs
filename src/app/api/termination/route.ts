import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Termination API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all termination data across institutions`);
    }

    const requests = await db.separationRequest.findMany({
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
        submittedBy: { select: { id: true, name: true, username: true } },
        reviewedBy: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[TERMINATION_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating termination request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.type || !body.reason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById, type, reason' 
      }, { status: 400 });
    }

    const separationRequest = await db.separationRequest.create({
      data: {
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        type: body.type,
        reason: body.reason,
        documents: body.documents || [],
        status: body.status || 'Pending HRMO/HHRMD Review',
        reviewStage: body.reviewStage || 'initial',
        rejectionReason: body.rejectionReason
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

    console.log('Created termination request:', separationRequest.id);

    return NextResponse.json({
      success: true,
      data: separationRequest
    });

  } catch (error) {
    console.error("[TERMINATION_POST]", error);
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

    // No date conversion needed for separation requests

    const updatedRequest = await db.separationRequest.update({
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

    // If separation request is approved by Commission, update employee status based on current employee status
    if (updateData.status === "Approved by Commission" && updatedRequest.employee) {
      const currentEmployeeStatus = updatedRequest.employee.status;
      let newStatus;
      
      if (currentEmployeeStatus === "Confirmed") {
        newStatus = "Dismissed";
      } else if (currentEmployeeStatus === "Probation" || currentEmployeeStatus === "On Probation") {
        newStatus = "Terminated";
      } else {
        // For other statuses, default based on separation type
        newStatus = updatedRequest.type === "DISMISSAL" ? "Dismissed" : "Terminated";
      }
      
      await db.employee.update({
        where: { id: updatedRequest.employee.id },
        data: { status: newStatus }
      });
      
      console.log(`Employee ${updatedRequest.employee.name} status updated from "${currentEmployeeStatus}" to "${newStatus}" after ${updatedRequest.type.toLowerCase()} approval`);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("[TERMINATION_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}