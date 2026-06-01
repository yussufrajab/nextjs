import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { hrimsLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

// Validation schema for employee search request
const employeeSearchSchema = z
  .object({
    zanId: z.string().optional(),
    payrollNumber: z.string().optional(),
    institutionVoteNumber: z.string(),
    includeDocuments: z.boolean().default(true),
    includeCertificates: z.boolean().default(true),
  })
  .refine((data) => data.zanId || data.payrollNumber, {
    message: 'Either zanId or payrollNumber must be provided',
    path: ['zanId', 'payrollNumber'],
  });

export const GET = wrapHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);

  const requestData = {
    zanId: searchParams.get('zanId') || undefined,
    payrollNumber: searchParams.get('payrollNumber') || undefined,
    institutionVoteNumber: searchParams.get('institutionVoteNumber') || '',
    includeDocuments: searchParams.get('includeDocuments') !== 'false',
    includeCertificates: searchParams.get('includeCertificates') !== 'false',
  };

  // Validate request parameters
  const validatedRequest = employeeSearchSchema.parse(requestData);

  hrimsLogger.info({
    ...validatedRequest,
    timestamp: new Date().toISOString(),
  }, 'Employee search request');

  // Find institution by vote number
  const institution = await db.institution.findFirst({
    where: {
      voteNumber: validatedRequest.institutionVoteNumber,
    },
  });

  if (!institution) {
    return NextResponse.json(
      {
        success: false,
        message: `Institution with vote number ${validatedRequest.institutionVoteNumber} not found`,
      },
      { status: 404 }
    );
  }

  // Build search criteria
  const searchCriteria: any = {
    institutionId: institution.id,
  };

  if (validatedRequest.zanId) {
    searchCriteria.zanId = validatedRequest.zanId;
  }

  if (validatedRequest.payrollNumber) {
    searchCriteria.payrollNumber = validatedRequest.payrollNumber;
  }

  // Find employee with optional includes
  const employee = await db.employee.findFirst({
    where: searchCriteria,
    include: {
      Institution: {
        select: {
          id: true,
          name: true,
          voteNumber: true,
          email: true,
          phoneNumber: true,
        },
      },
      EmployeeCertificate: validatedRequest.includeCertificates,
    },
  });

  if (!employee) {
    return NextResponse.json(
      {
        success: false,
        message: 'Employee not found in the specified institution',
      },
      { status: 404 }
    );
  }

  // Format response data
  const responseData = {
    Employee: {
      id: employee.id,
      zanId: employee.zanId,
      payrollNumber: employee.payrollNumber,
      name: employee.name,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0],
      placeOfBirth: employee.placeOfBirth,
      region: employee.region,
      countryOfBirth: employee.countryOfBirth,
      phoneNumber: employee.phoneNumber,
      contactAddress: employee.contactAddress,
      zssfNumber: employee.zssfNumber,
      cadre: employee.cadre,
      salaryScale: employee.salaryScale,
      ministry: employee.ministry,
      department: employee.department,
      appointmentType: employee.appointmentType,
      contractType: employee.contractType,
      recentTitleDate: employee.recentTitleDate?.toISOString().split('T')[0],
      currentReportingOffice: employee.currentReportingOffice,
      currentWorkplace: employee.currentWorkplace,
      employmentDate: employee.employmentDate?.toISOString().split('T')[0],
      confirmationDate: employee.confirmationDate
        ?.toISOString()
        .split('T')[0],
      retirementDate: employee.retirementDate?.toISOString().split('T')[0],
      status: employee.status,
      Institution: employee.Institution,
    },
    documents: validatedRequest.includeDocuments
      ? {
          ardhilHali: employee.ardhilHaliUrl
            ? {
                type: 'ardhilHali',
                url: employee.ardhilHaliUrl,
                name: 'Ardhil Hali Certificate',
              }
            : null,
          confirmationLetter: employee.confirmationLetterUrl
            ? {
                type: 'confirmationLetter',
                url: employee.confirmationLetterUrl,
                name: 'Confirmation Letter',
              }
            : null,
          jobContract: employee.jobContractUrl
            ? {
                type: 'jobContract',
                url: employee.jobContractUrl,
                name: 'Employment Contract',
              }
            : null,
          birthCertificate: employee.birthCertificateUrl
            ? {
                type: 'birthCertificate',
                url: employee.birthCertificateUrl,
                name: 'Birth Certificate',
              }
            : null,
        }
      : undefined,
    certificates: validatedRequest.includeCertificates
      ? employee.EmployeeCertificate?.map((cert: any) => ({
          id: cert.id,
          type: cert.type,
          name: cert.name,
          url: cert.url,
        }))
      : undefined,
  };

  hrimsLogger.info(`Employee found: ${employee.name} (${employee.zanId})`);

  return NextResponse.json(
    {
      success: true,
      message: 'Employee found successfully',
      data: responseData,
    },
    { status: 200 }
  );
}, 'hrims-search-employee');

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json();

  // Validate request payload
  const validatedRequest = employeeSearchSchema.parse(body);

  hrimsLogger.info({
    ...validatedRequest,
    timestamp: new Date().toISOString(),
  }, 'Employee search request (POST)');

  // Find institution by vote number
  const institution = await db.institution.findFirst({
    where: {
      voteNumber: validatedRequest.institutionVoteNumber,
    },
  });

  if (!institution) {
    return NextResponse.json(
      {
        success: false,
        message: `Institution with vote number ${validatedRequest.institutionVoteNumber} not found`,
      },
      { status: 404 }
    );
  }

  // Build search criteria
  const searchCriteria: any = {
    institutionId: institution.id,
  };

  if (validatedRequest.zanId) {
    searchCriteria.zanId = validatedRequest.zanId;
  }

  if (validatedRequest.payrollNumber) {
    searchCriteria.payrollNumber = validatedRequest.payrollNumber;
  }

  // Find employee with optional includes
  const employee = await db.employee.findFirst({
    where: searchCriteria,
    include: {
      Institution: {
        select: {
          id: true,
          name: true,
          voteNumber: true,
          email: true,
          phoneNumber: true,
        },
      },
      EmployeeCertificate: validatedRequest.includeCertificates,
    },
  });

  if (!employee) {
    return NextResponse.json(
      {
        success: false,
        message: 'Employee not found in the specified institution',
      },
      { status: 404 }
    );
  }

  // Format response data (same as GET)
  const responseData = {
    Employee: {
      id: employee.id,
      zanId: employee.zanId,
      payrollNumber: employee.payrollNumber,
      name: employee.name,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0],
      placeOfBirth: employee.placeOfBirth,
      region: employee.region,
      countryOfBirth: employee.countryOfBirth,
      phoneNumber: employee.phoneNumber,
      contactAddress: employee.contactAddress,
      zssfNumber: employee.zssfNumber,
      cadre: employee.cadre,
      salaryScale: employee.salaryScale,
      ministry: employee.ministry,
      department: employee.department,
      appointmentType: employee.appointmentType,
      contractType: employee.contractType,
      recentTitleDate: employee.recentTitleDate?.toISOString().split('T')[0],
      currentReportingOffice: employee.currentReportingOffice,
      currentWorkplace: employee.currentWorkplace,
      employmentDate: employee.employmentDate?.toISOString().split('T')[0],
      confirmationDate: employee.confirmationDate
        ?.toISOString()
        .split('T')[0],
      retirementDate: employee.retirementDate?.toISOString().split('T')[0],
      status: employee.status,
      Institution: employee.Institution,
    },
    documents: validatedRequest.includeDocuments
      ? {
          ardhilHali: employee.ardhilHaliUrl
            ? {
                type: 'ardhilHali',
                url: employee.ardhilHaliUrl,
                name: 'Ardhil Hali Certificate',
              }
            : null,
          confirmationLetter: employee.confirmationLetterUrl
            ? {
                type: 'confirmationLetter',
                url: employee.confirmationLetterUrl,
                name: 'Confirmation Letter',
              }
            : null,
          jobContract: employee.jobContractUrl
            ? {
                type: 'jobContract',
                url: employee.jobContractUrl,
                name: 'Employment Contract',
              }
            : null,
          birthCertificate: employee.birthCertificateUrl
            ? {
                type: 'birthCertificate',
                url: employee.birthCertificateUrl,
                name: 'Birth Certificate',
              }
            : null,
        }
      : undefined,
    certificates: validatedRequest.includeCertificates
      ? employee.EmployeeCertificate?.map((cert: any) => ({
          id: cert.id,
          type: cert.type,
          name: cert.name,
          url: cert.url,
        }))
      : undefined,
  };

  hrimsLogger.info(`Employee found: ${employee.name} (${employee.zanId})`);

  return NextResponse.json(
    {
      success: true,
      message: 'Employee found successfully',
      data: responseData,
    },
    { status: 200 }
  );
}, 'hrims-search-employee');
