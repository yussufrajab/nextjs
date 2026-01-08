import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';

// Cache configuration for confirmation requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Confirmations API called with:', {
      userId,
      userRole,
      userInstitutionId,
    });

    // Build where clause based on user role and institution
    const whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(
        `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
      );
      whereClause.Employee = {
        institutionId: userInstitutionId,
      };
    } else {
      console.log(
        `Role ${userRole} is a CSC role - showing all confirmation data across institutions`
      );
    }

    const requests = await db.confirmationRequest.findMany({
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
            status: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_ConfirmationRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ConfirmationRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_ConfirmationRequest_submittedByIdToUser,
      reviewedBy: req.User_ConfirmationRequest_reviewedByIdToUser,
      User_ConfirmationRequest_submittedByIdToUser: undefined,
      User_ConfirmationRequest_reviewedByIdToUser: undefined,
    }));

    return NextResponse.json(transformedRequests);
  } catch (error) {
    console.error('[CONFIRMATIONS_GET]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating confirmation request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: employeeId, submittedById',
        },
        { status: 400 }
      );
    }

    // Get employee details to check status
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true },
    });

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found',
        },
        { status: 404 }
      );
    }

    // Validate employee status for confirmation request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'confirmation'
    );
    if (!statusValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: statusValidation.message,
        },
        { status: 403 }
      );
    }

    const confirmationRequest = await db.confirmationRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        status: body.status || 'Pending',
        reviewStage: body.reviewStage || 'initial',
        documents: body.documents || [],
        updatedAt: new Date(),
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
            status: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_ConfirmationRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    console.log('Created confirmation request:', confirmationRequest.id);

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...confirmationRequest,
      submittedBy: (confirmationRequest as any)
        .User_ConfirmationRequest_submittedByIdToUser,
      User_ConfirmationRequest_submittedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[CONFIRMATIONS_POST]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Request ID is required',
        },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const userAgent = headers.get('user-agent');

    const updatedRequest = await db.confirmationRequest.update({
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
            status: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_ConfirmationRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ConfirmationRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Check if the confirmation request was approved by commission
    if (updateData.status === 'Approved by Commission') {
      try {
        // Update employee status from "On Probation" to "Confirmed"
        await db.employee.update({
          where: { id: updatedRequest.employeeId },
          data: {
            status: 'Confirmed',
            confirmationDate: new Date(),
          },
        });

        console.log(
          `Employee ${updatedRequest.Employee.name} (${updatedRequest.Employee.zanId}) status updated to "Confirmed" due to commission approval`
        );
      } catch (employeeUpdateError) {
        console.error('Failed to update employee status:', employeeUpdateError);
        // Don't fail the entire request if employee update fails
      }
    }

    // Log audit event for approvals and rejections
    if (updateData.reviewedById && updateData.status) {
      const reviewer = await db.user.findUnique({
        where: { id: updateData.reviewedById },
        select: { username: true, role: true },
      });

      if (reviewer) {
        const statusLower = updateData.status.toLowerCase();
        const isApproval =
          statusLower.includes('approved') && !statusLower.includes('rejected');
        const isRejection = statusLower.includes('rejected');

        console.log('[AUDIT] Confirmation status update:', {
          status: updateData.status,
          isApproval,
          isRejection,
          reviewedById: updateData.reviewedById,
          reviewer: reviewer.username,
        });

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Confirmation',
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
              currentStatus: updatedRequest.Employee?.status,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Confirmation',
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
              currentStatus: updatedRequest.Employee?.status,
            },
          });
        }
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any)
        .User_ConfirmationRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_ConfirmationRequest_reviewedByIdToUser,
      User_ConfirmationRequest_submittedByIdToUser: undefined,
      User_ConfirmationRequest_reviewedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[CONFIRMATIONS_PATCH]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
