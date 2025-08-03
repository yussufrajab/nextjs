import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Service Extension API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all service extension data across institutions`);
    }

    const requests = await db.serviceExtensionRequest.findMany({
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
    console.error("[SERVICE_EXTENSION_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating service extension request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.currentRetirementDate || !body.requestedExtensionPeriod || !body.justification) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById, currentRetirementDate, requestedExtensionPeriod, justification' 
      }, { status: 400 });
    }

    const serviceExtensionRequest = await db.serviceExtensionRequest.create({
      data: {
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        currentRetirementDate: new Date(body.currentRetirementDate),
        requestedExtensionPeriod: body.requestedExtensionPeriod,
        justification: body.justification,
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

    console.log('Created service extension request:', serviceExtensionRequest.id);

    return NextResponse.json({
      success: true,
      data: serviceExtensionRequest
    });

  } catch (error) {
    console.error("[SERVICE_EXTENSION_POST]", error);
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
    if (updateData.currentRetirementDate) {
      updateData.currentRetirementDate = new Date(updateData.currentRetirementDate);
    }

    const updatedRequest = await db.serviceExtensionRequest.update({
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

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("[SERVICE_EXTENSION_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}