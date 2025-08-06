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

    console.log('Cadre Change API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all cadre change data across institutions`);
    }

    const requests = await db.cadreChangeRequest.findMany({
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

    console.log(`Found ${requests.length} cadre change requests`);

    return NextResponse.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("[CADRE_CHANGE_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating cadre change request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.newCadre) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById, newCadre' 
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

    // Validate employee status for cadre change request
    const statusValidation = validateEmployeeStatusForRequest(employee.status, 'cadre-change');
    if (!statusValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: statusValidation.message 
      }, { status: 403 });
    }

    const cadreChangeRequest = await db.cadreChangeRequest.create({
      data: {
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        newCadre: body.newCadre,
        reason: body.reason,
        studiedOutsideCountry: body.studiedOutsideCountry || false,
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

    console.log('Created cadre change request:', cadreChangeRequest.id);

    return NextResponse.json({
      success: true,
      data: cadreChangeRequest
    });

  } catch (error) {
    console.error("[CADRE_CHANGE_POST]", error);
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

    const updatedRequest = await db.cadreChangeRequest.update({
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

    // If cadre change request is approved by Commission, update employee cadre
    if (updateData.status === "Approved by Commission" && updatedRequest.employee) {
      await db.employee.update({
        where: { id: updatedRequest.employee.id },
        data: { cadre: updatedRequest.newCadre }
      });
      console.log(`Employee ${updatedRequest.employee.name} cadre updated to "${updatedRequest.newCadre}" after cadre change approval`);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("[CADRE_CHANGE_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}