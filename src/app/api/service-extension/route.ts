import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import { v4 as uuidv4 } from 'uuid';
import { logRequestApproval, logRequestRejection, getClientIp } from '@/lib/audit-logger';

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
      whereClause.Employee = {
        institutionId: userInstitutionId
      };
    } else {
      console.log(`Role ${userRole} is a CSC role - showing all service extension data across institutions`);
    }

    const requests = await db.serviceExtensionRequest.findMany({
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
        User_ServiceExtensionRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } },
        User_ServiceExtensionRequest_reviewedByIdToUser: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_ServiceExtensionRequest_submittedByIdToUser,
      reviewedBy: req.User_ServiceExtensionRequest_reviewedByIdToUser,
      User_ServiceExtensionRequest_submittedByIdToUser: undefined,
      User_ServiceExtensionRequest_reviewedByIdToUser: undefined
    }));

    return NextResponse.json(transformedRequests);
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

    // Validate employee status for service extension request
    const statusValidation = validateEmployeeStatusForRequest(employee.status, 'service-extension');
    if (!statusValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: statusValidation.message 
      }, { status: 403 });
    }

    const serviceExtensionRequest = await db.serviceExtensionRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        currentRetirementDate: new Date(body.currentRetirementDate),
        requestedExtensionPeriod: body.requestedExtensionPeriod,
        justification: body.justification,
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
        User_ServiceExtensionRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } }}
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

    // Get IP and user agent for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const userAgent = headers.get('user-agent');

    // Convert date string to Date object if present
    if (updateData.currentRetirementDate) {
      updateData.currentRetirementDate = new Date(updateData.currentRetirementDate);
    }

    const updatedRequest = await db.serviceExtensionRequest.update({
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
            retirementDate: true,
            Institution: { select: { id: true, name: true } }
          }
        }
      ,
        User_ServiceExtensionRequest_submittedByIdToUser: { select: { id: true, name: true, username: true } },
        User_ServiceExtensionRequest_reviewedByIdToUser: { select: { id: true, name: true, username: true } }}
    });

    // Check if the service extension request was approved by commission
    if (updateData.status === 'Approved by Commission') {
      try {
        // Calculate new retirement date based on the requested extension period
        const currentRetirementDate = updatedRequest.currentRetirementDate;
        const extensionPeriod = updatedRequest.requestedExtensionPeriod.toLowerCase();

        let newRetirementDate = new Date(currentRetirementDate);

        // Parse extension period and calculate new date
        if (extensionPeriod.includes('year')) {
          const years = parseInt(extensionPeriod.match(/\d+/)?.[0] || '1');
          newRetirementDate.setFullYear(newRetirementDate.getFullYear() + years);
        } else if (extensionPeriod.includes('month')) {
          const months = parseInt(extensionPeriod.match(/\d+/)?.[0] || '6');
          newRetirementDate.setMonth(newRetirementDate.getMonth() + months);
        } else {
          // Default to 1 year if parsing fails
          newRetirementDate.setFullYear(newRetirementDate.getFullYear() + 1);
        }

        // Update employee's retirement date
        await db.Employee.update({
          where: { id: updatedRequest.employeeId },
          data: {
            retirementDate: newRetirementDate
          }
        });

        console.log(`Employee ${updatedRequest.Employee.name} (${updatedRequest.Employee.zanId}) retirement date updated from ${currentRetirementDate.toISOString().split('T')[0]} to ${newRetirementDate.toISOString().split('T')[0]} due to approved service extension`);
      } catch (employeeUpdateError) {
        console.error('Failed to update employee retirement date:', employeeUpdateError);
        // Don't fail the entire request if employee update fails
      }
    }

    // Log audit event for approvals and rejections
    if (updateData.reviewedById && updateData.status) {
      const reviewer = await db.User.findUnique({
        where: { id: updateData.reviewedById },
        select: { username: true, role: true }
      });

      if (reviewer) {
        const statusLower = updateData.status.toLowerCase();
        const isApproval = statusLower.includes('approved') && !statusLower.includes('rejected');
        const isRejection = statusLower.includes('rejected');

        console.log('[AUDIT] Service Extension status update:', {
          status: updateData.status,
          isApproval,
          isRejection,
          reviewedById: updateData.reviewedById,
          reviewer: reviewer.username,
        });

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Service Extension',
            requestId: id,
            employeeId: updatedRequest.employeeId,
            employeeName: updatedRequest.Employee?.name,
            employeeZanId: updatedRequest.Employee?.zanId,
            approvedById: updateData.reviewedById,
            approvedByUsername: reviewer.username,
            approvedByRole: reviewer.role || 'Unknown',
            reviewStage: updateData.reviewStage,
            ipAddress,
            userAgent,
            additionalData: {
              requestedExtensionPeriod: updatedRequest.requestedExtensionPeriod,
              currentRetirementDate: updatedRequest.currentRetirementDate,
              justification: updatedRequest.justification,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Service Extension',
            requestId: id,
            employeeId: updatedRequest.employeeId,
            employeeName: updatedRequest.Employee?.name,
            employeeZanId: updatedRequest.Employee?.zanId,
            rejectedById: updateData.reviewedById,
            rejectedByUsername: reviewer.username,
            rejectedByRole: reviewer.role || 'Unknown',
            rejectionReason: updateData.rejectionReason,
            reviewStage: updateData.reviewStage,
            ipAddress,
            userAgent,
            additionalData: {
              requestedExtensionPeriod: updatedRequest.requestedExtensionPeriod,
              currentRetirementDate: updatedRequest.currentRetirementDate,
              justification: updatedRequest.justification,
            },
          });
        }
      }
    }


    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any).User_ServiceExtensionRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any).User_ServiceExtensionRequest_reviewedByIdToUser,
      User_ServiceExtensionRequest_submittedByIdToUser: undefined,
      User_ServiceExtensionRequest_reviewedByIdToUser: undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest
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