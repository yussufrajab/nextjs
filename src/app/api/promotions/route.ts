import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Promotions API called with:', { userId, userRole, userInstitutionId });

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all promotion data across institutions`);
    }

    const promotionRequests = await db.promotionRequest.findMany({
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
            institution: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    console.log(`Found ${promotionRequests.length} promotion requests`);

    return NextResponse.json({
      success: true,
      data: promotionRequests
    });

  } catch (error) {
    console.error("[PROMOTIONS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating promotion request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.promotionType || !body.proposedCadre) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: employeeId, submittedById, promotionType, proposedCadre' 
      }, { status: 400 });
    }

    const promotionRequest = await db.promotionRequest.create({
      data: {
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        promotionType: body.promotionType,
        proposedCadre: body.proposedCadre,
        studiedOutsideCountry: body.studiedOutsideCountry || false,
        status: 'Pending HRMO/HHRMD Review',
        reviewStage: 'initial',
        documents: body.documents || [],
        commissionDecisionReason: body.commissionDecisionReason || null
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
            institution: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('Created promotion request:', promotionRequest.id);

    return NextResponse.json({
      success: true,
      data: promotionRequest
    });

  } catch (error) {
    console.error("[PROMOTIONS_POST]", error);
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

    const updatedRequest = await db.promotionRequest.update({
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
            institution: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // If promotion request is approved by Commission, update employee cadre
    if (updateData.status === "Approved by Commission" && updatedRequest.employee) {
      await db.employee.update({
        where: { id: updatedRequest.employee.id },
        data: { cadre: updatedRequest.proposedCadre }
      });
      console.log(`Employee ${updatedRequest.employee.name} cadre updated to "${updatedRequest.proposedCadre}" after promotion approval`);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("[PROMOTIONS_PATCH]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}