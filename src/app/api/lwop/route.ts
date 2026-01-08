import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import {
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { ROLES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';

// Cache configuration for LWOP requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('LWOP API called with:', {
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
        `Role ${userRole} is a CSC role - showing all LWOP data across institutions`
      );
    }

    const requests = await db.lwopRequest
      .findMany({
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
              Institution: { select: { id: true, name: true } },
            },
          },
          User_LwopRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_LwopRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_LwopRequest_submittedByIdToUser,
      reviewedBy: req.User_LwopRequest_reviewedByIdToUser,
      User_LwopRequest_submittedByIdToUser: undefined,
      User_LwopRequest_reviewedByIdToUser: undefined,
    }));

    return NextResponse.json(transformedRequests);
  } catch (error) {
    console.error('[LWOP_GET]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating LWOP request:', body);

    // Basic validation
    if (
      !body.employeeId ||
      !body.submittedById ||
      !body.duration ||
      !body.reason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, submittedById, duration, reason',
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

    // Validate employee status for LWOP request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'lwop'
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

    const lwopRequest = await db.lwopRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        duration: body.duration,
        reason: body.reason,
        documents: body.documents || [],
        status: body.status || 'Pending',
        reviewStage: body.reviewStage || 'initial',
        rejectionReason: body.rejectionReason,
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
            dateOfBirth: true,
            employmentDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_LwopRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    console.log('Created LWOP request:', lwopRequest.id);

    // Create notification for supervisors/HHRMD
    const notification = NotificationTemplates.lwopSubmitted(
      lwopRequest.Employee.name,
      lwopRequest.id
    );

    await createNotificationForRole(
      ROLES.HHRMD || 'HHRMD',
      notification.message,
      notification.link
    );
    await createNotificationForRole(
      ROLES.DO || 'DO',
      notification.message,
      notification.link
    );

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...lwopRequest,
      submittedBy: (lwopRequest as any).User_LwopRequest_submittedByIdToUser,
      User_LwopRequest_submittedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[LWOP_POST]', error);
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

    // No date conversion needed for this schema

    const updatedRequest = await db.lwopRequest.update({
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
            Institution: { select: { id: true, name: true } },
          },
        },
        User_LwopRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_LwopRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // If LWOP request is approved by Commission, update employee status to "On LWOP"
    if (
      updateData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: 'On LWOP' },
      });
      console.log(
        `Employee ${updatedRequest.Employee.name} status updated to "On LWOP" after LWOP approval`
      );
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

        console.log('[AUDIT] LWOP status update:', {
          status: updateData.status,
          isApproval,
          isRejection,
          reviewedById: updateData.reviewedById,
          reviewer: reviewer.username,
        });

        if (isApproval) {
          await logRequestApproval({
            requestType: 'LWOP',
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
              duration: updatedRequest.duration,
              reason: updatedRequest.reason,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'LWOP',
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
              duration: updatedRequest.duration,
              reason: updatedRequest.reason,
            },
          });
        }
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any).User_LwopRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any).User_LwopRequest_reviewedByIdToUser,
      User_LwopRequest_submittedByIdToUser: undefined,
      User_LwopRequest_reviewedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[LWOP_PATCH]', error);
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
