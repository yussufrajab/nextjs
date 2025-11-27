import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { v4 as uuidv4 } from 'uuid';

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
      whereClause.Employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all termination data across institutions`);
    }

    const requests = await db.separationRequest.findMany({
      where: whereClause,
      include: {
        Employee: {
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
            Institution: { select: { id: true, name: true } }
          }
        },
        User_SeparationRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } },
        User_SeparationRequest_reviewedByIdToUser: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_SeparationRequest_submittedByIdToUser,
      reviewedBy: req.User_SeparationRequest_reviewedByIdToUser,
      User_SeparationRequest_submittedByIdToUser: undefined,
      User_SeparationRequest_reviewedByIdToUser: undefined
    }));

    return NextResponse.json(transformedRequests);
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
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        type: body.type,
        reason: body.reason,
        documents: body.documents || [],
        status: body.status || 'Pending HRMO/HHRMD Review',
        reviewStage: body.reviewStage || 'initial',
        rejectionReason: body.rejectionReason,
        updatedAt: new Date()
      },
      include: {
        Employee: {
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
            Institution: { select: { id: true, name: true } }
          }
        }
      }
    });

    console.log('Created termination request:', separationRequest.id);

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...separationRequest,
      submittedBy: (separationRequest as any).User_TerminationRequest_submittedByIdToUser,
      User_TerminationRequest_submittedByIdToUser: undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest
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
        Employee: {
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
            status: true,
            Institution: { select: { id: true, name: true } }
          }
        }
      }
    });

    // If separation request is approved by Commission, update employee status based on current employee status
    if (updateData.status === "Approved by Commission" && updatedRequest.Employee) {
      const currentEmployeeStatus = updatedRequest.Employee.status;
      let newStatus;

      if (currentEmployeeStatus === "Confirmed") {
        newStatus = "Dismissed";
      } else if (currentEmployeeStatus === "Probation" || currentEmployeeStatus === "On Probation") {
        newStatus = "Terminated";
      } else {
        // For other statuses, default based on separation type
        newStatus = updatedRequest.type === "DISMISSAL" ? "Dismissed" : "Terminated";
      }

      await db.Employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: newStatus }
      });

      console.log(`Employee ${updatedRequest.Employee.name} status updated from "${currentEmployeeStatus}" to "${newStatus}" after ${updatedRequest.type.toLowerCase()} approval`);
    }

    
    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any).User_TerminationRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any).User_TerminationRequest_reviewedByIdToUser,
      User_TerminationRequest_submittedByIdToUser: undefined,
      User_TerminationRequest_reviewedByIdToUser: undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest
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