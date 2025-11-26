import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';

const employeeLoginSchema = z.object({
  zanId: z.string().min(1),
  zssfNumber: z.string().min(1),
  payrollNumber: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { zanId, zssfNumber, payrollNumber } = employeeLoginSchema.parse(body);

    // Trim whitespace and normalize input
    const normalizedZanId = zanId.trim();
    const normalizedZssfNumber = zssfNumber.trim().toUpperCase();
    const normalizedPayrollNumber = payrollNumber.trim().toUpperCase();

    console.log('[EMPLOYEE_LOGIN] Search criteria:', {
      zanId: normalizedZanId,
      zssfNumber: normalizedZssfNumber,
      payrollNumber: normalizedPayrollNumber
    });

    // Find employee with matching credentials
    const employee = await db.Employee.findFirst({
      where: {
        zanId: normalizedZanId,
        zssfNumber: normalizedZssfNumber,
        payrollNumber: normalizedPayrollNumber,
      },
      include: {
        Institution: {
          select: {
            name: true,
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
          }
        }
      }
    });

    if (!employee) {
      console.log('[EMPLOYEE_LOGIN] No employee found with provided credentials');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid employee credentials. Please check your ZAN ID, ZSSF Number, and Payroll Number.' 
        },
        { status: 401 }
      );
    }

    // Check if employee has an associated user account
    if (!employee.User) {
      return NextResponse.json(
        {
          success: false,
          message: 'No user account found for this employee. Please contact HR for assistance.'
        },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!employee.User.active) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been deactivated. Please contact HR for assistance.'
        },
        { status: 401 }
      );
    }

    // Check if user role is EMPLOYEE
    if (employee.User.role !== ROLES.EMPLOYEE) {
      return NextResponse.json(
        {
          success: false,
          message: 'This login is only for employees. Please use the staff login page.'
        },
        { status: 403 }
      );
    }

    // Successful authentication - return user data
    const userData = {
      id: employee.User.id,
      name: employee.User.name,
      username: employee.User.username,
      role: employee.User.role,
      employeeId: employee.id,
      institutionId: employee.institutionId,
      department: employee.department,
      cadre: employee.cadre,
      Institution: employee.Institution.name,
      zanId: employee.zanId,
      zssfNumber: employee.zssfNumber,
      payrollNumber: employee.payrollNumber,
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData,
    });

  } catch (error) {
    console.error('[EMPLOYEE_LOGIN]', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error. Please try again later.' 
      },
      { status: 500 }
    );
  }
}