import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Resignation API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.Employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all resignation data across institutions`);
    }

    const requests = await db.resignationRequest.findMany({
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
        User_ResignationRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } },
        User_ResignationRequest_reviewedByIdToUser: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_ResignationRequest_submittedByIdToUser,
      reviewedBy: req.User_ResignationRequest_reviewedByIdToUser,
      User_ResignationRequest_submittedByIdToUser: undefined,
      User_ResignationRequest_reviewedByIdToUser: undefined
    }));

    return NextResponse.json(transformedRequests);
  } catch (error) {
    console.error("[RESIGNATION_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating resignation request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.effectiveDate || !body.reason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById, effectiveDate, reason' 
      }, { status: 400 });
    }

    // Get employee details to check status
    const employee = await db.Employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true }
    });

    if (!employee) {
      return NextResponse.json({ 
        success: false, 
        message: 'Employee not found' 
      }, { status: 404 });
    }

    // Validate employee status for resignation request
    const statusValidation = validateEmployeeStatusForRequest(employee.status, 'resignation');
    if (!statusValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: statusValidation.message 
      }, { status: 403 });
    }

    const resignationRequest = await db.resignationRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        effectiveDate: new Date(body.effectiveDate),
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
      ,
        User_ResignationRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } }}
    });

    console.log('Created resignation request:', resignationRequest.id);

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...resignationRequest,
      submittedBy: (resignationRequest as any).User_ResignationRequest_submittedByIdToUser,
      User_ResignationRequest_submittedByIdToUser: undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest
    });

  } catch (error) {
    console.error("[RESIGNATION_POST]", error);
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

    // Convert date string to Date object if present
    if (updateData.effectiveDate) {
      updateData.effectiveDate = new Date(updateData.effectiveDate);
    }

    const updatedRequest = await db.resignationRequest.update({
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
            Institution: { select: { id: true, name: true } }
          }
        }
      ,
        User_ResignationRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } },
        User_ResignationRequest_reviewedByIdToUser: { select: { id: true, name: true, username: true } }}
    });

    // If resignation request is approved by Commission, update employee status
    if (updateData.status === "Approved by Commission" && updatedRequest.Employee) {
      await db.Employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: "Resigned" }
      });
      console.log(`Employee ${updatedRequest.Employee.name} status updated to "Resigned" after resignation approval`);
    }

    
    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any).User_ResignationRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any).User_ResignationRequest_reviewedByIdToUser,
      User_ResignationRequest_submittedByIdToUser: undefined,
      User_ResignationRequest_reviewedByIdToUser: undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest
    });

  } catch (error) {
    console.error("[RESIGNATION_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}