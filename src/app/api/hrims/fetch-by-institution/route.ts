import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

async function fetchFromHRIMS(requestId: string, requestPayloadData: any): Promise<any> {
  const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RequestId: requestId,
      RequestPayloadData: requestPayloadData
    })
  });

  if (!response.ok) {
    throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function saveEmployeeFromDetailedData(hrimsData: any, institutionId: string) {
  try {
    const personalInfo = hrimsData.personalInfo;

    // Skip employees without valid ZanID
    if (!personalInfo?.zanIdNumber || personalInfo.zanIdNumber.trim() === '') {
      console.log(`Skipping employee without ZanID: ${personalInfo?.firstName} ${personalInfo?.lastName}`);
      return null;
    }

    // Find the current employment record
    const currentEmployment = hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) || hrimsData.employmentHistories?.[0];

    // Find the current salary information
    const currentSalary = hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) || hrimsData.salaryInformation?.[0];

    // Find the highest education level
    const highestEducation = hrimsData.educationHistories?.find((edu: any) => edu.isEmploymentHighest) || hrimsData.educationHistories?.[0];

    // Find or create employee
    const existingEmployee = await db.Employee.findUnique({
      where: { zanId: personalInfo.zanIdNumber }
    });

    const employeeId = existingEmployee?.id || uuidv4();

    // Build full name
    const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
      .filter(name => name && name.trim())
      .join(' ');

    // Map gender
    const gender = personalInfo.genderName === 'Mwanamme' ? 'Male' :
                   personalInfo.genderName === 'Mwanamke' ? 'Female' :
                   personalInfo.genderName;

    // Build contact address
    const contactAddress = [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
      .filter(part => part && part.trim())
      .join(', ') || null;

    // Build cadre with prefix and title
    const cadre = currentEmployment ?
      [currentEmployment.titlePrefixName, currentEmployment.titleName, currentEmployment.gradeName]
        .filter(part => part && part.trim())
        .join(' ') : null;

    // Determine status based on employment status and employee status
    let status = 'On Probation';
    if (personalInfo.isEmployeeConfirmed) {
      status = 'Confirmed';
    } else if (currentEmployment) {
      const empStatus = currentEmployment.employeeStatusName?.toLowerCase();
      if (empStatus?.includes('staafu')) status = 'Retired';
      else if (empStatus?.includes('hayupo')) status = 'Resigned';
      else if (empStatus?.includes('aachishwa')) status = 'Terminated';
      else if (empStatus?.includes('fukuzwa')) status = 'Dismissed';
      else if (currentEmployment.employmentStatusName?.toLowerCase().includes('hai')) status = 'Confirmed';
    }

    // Get retirement date from contract or calculate from birth date
    let retirementDate = null;
    const activeContract = hrimsData.contractDetails?.find((c: any) => c.isActive);
    if (activeContract?.toDate && activeContract.toDate !== '1900-01-01T00:00:00') {
      retirementDate = new Date(activeContract.toDate);
    }

    // Map detailed HRIMS data to our database structure
    const dbEmployeeData = {
      id: employeeId,
      name: fullName,
      gender: gender,
      dateOfBirth: personalInfo.birthDate ? new Date(personalInfo.birthDate) : null,
      placeOfBirth: personalInfo.placeOfBirth,
      region: personalInfo.districtName || personalInfo.birthRegionName || personalInfo.regionName,
      countryOfBirth: personalInfo.birthCountryName,
      zanId: personalInfo.zanIdNumber,
      phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone,
      contactAddress: contactAddress,
      zssfNumber: personalInfo.zssfNumber,
      payrollNumber: personalInfo.payrollNumber || '',
      cadre: cadre,
      salaryScale: currentSalary?.salaryScaleName,
      ministry: currentEmployment?.parentEntityName || currentEmployment?.entityName,
      department: currentEmployment?.subEntityName,
      appointmentType: currentEmployment?.appointmentTypeName,
      contractType: activeContract?.contractTypeName,
      recentTitleDate: currentEmployment?.fromDate ? new Date(currentEmployment.fromDate) : null,
      currentReportingOffice: currentEmployment?.divisionName || currentEmployment?.subEntityName,
      currentWorkplace: currentEmployment?.entityName,
      employmentDate: personalInfo.employmentDate ? new Date(personalInfo.employmentDate) : null,
      confirmationDate: personalInfo.employmentConfirmationDate ? new Date(personalInfo.employmentConfirmationDate) : null,
      retirementDate: retirementDate,
      status: status,
      institutionId: institutionId,
      employeeEntityId: personalInfo.zanIdNumber,
    };

    console.log('Saving employee from institution fetch:', {
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      ministry: dbEmployeeData.ministry,
      cadre: dbEmployeeData.cadre,
      status: dbEmployeeData.status
    });

    // Save/update employee
    await db.Employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      update: dbEmployeeData,
      create: dbEmployeeData,
    });

    return {
      employeeId,
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      cadre: dbEmployeeData.cadre,
      ministry: dbEmployeeData.ministry,
      status: dbEmployeeData.status
    };
  } catch (error) {
    console.error('Error saving employee from institution fetch:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifierType, voteNumber, tinNumber, institutionId } = body;

    // Validation
    if (!identifierType || !['votecode', 'tin'].includes(identifierType)) {
      return NextResponse.json(
        { success: false, message: 'Valid identifier type must be provided (votecode or tin)' },
        { status: 400 }
      );
    }

    if (!institutionId) {
      return NextResponse.json(
        { success: false, message: 'Institution ID is required' },
        { status: 400 }
      );
    }

    // Verify institution exists
    const institution = await db.Institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      return NextResponse.json(
        { success: false, message: 'Institution not found' },
        { status: 404 }
      );
    }

    // Use the selected identifier type
    let requestId: string;
    let identifier: string;
    let identifierLabel: string;

    if (identifierType === 'tin') {
      if (!tinNumber) {
        return NextResponse.json(
          { success: false, message: 'TIN number is required for the selected identifier type' },
          { status: 400 }
        );
      }
      requestId = "205";
      identifier = tinNumber;
      identifierLabel = "TIN";
    } else {
      if (!voteNumber) {
        return NextResponse.json(
          { success: false, message: 'Vote number is required for the selected identifier type' },
          { status: 400 }
        );
      }
      requestId = "204";
      identifier = voteNumber;
      identifierLabel = "Vote Code";
    }

    console.log(`Fetching employees by ${identifierLabel}: ${identifier} for institution: ${institution.name}`);

    // Fetch employees from HRIMS using the appropriate RequestId
    const employeeListResponse = await fetchFromHRIMS(requestId, {
      PageNumber: 0,
      PageSize: 100,
      RequestBody: identifier
    });

    console.log(`HRIMS Response for ${identifierLabel}:`, {
      code: employeeListResponse.code,
      status: employeeListResponse.status,
      hasData: !!employeeListResponse.data,
      dataLength: employeeListResponse.data?.length || 0
    });

    if (employeeListResponse.code !== 200 || !employeeListResponse.data) {
      return NextResponse.json(
        {
          success: false,
          message: employeeListResponse.message || `No employees found for ${identifierLabel}: ${identifier}`
        },
        { status: 404 }
      );
    }

    // Process and save each employee
    const savedEmployees = [];
    let skippedCount = 0;

    for (const employeeDetailedData of employeeListResponse.data) {
      try {
        const employeeData = await saveEmployeeFromDetailedData(employeeDetailedData, institutionId);
        if (employeeData) {
          savedEmployees.push(employeeData);
          console.log(`✅ Saved employee: ${employeeData.name} (${employeeData.zanId}) - ${employeeData.cadre || 'No cadre'}`);
        } else {
          skippedCount++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        const personalInfo = employeeDetailedData?.personalInfo;
        console.error(`Error processing employee ${personalInfo?.zanIdNumber}:`, error);
        skippedCount++;
      }
    }

    console.log(`Fetch by ${identifierLabel} completed: ${savedEmployees.length} saved, ${skippedCount} skipped`);

    return NextResponse.json({
      success: true,
      message: `Successfully fetched and stored ${savedEmployees.length} employees from ${institution.name}`,
      data: {
        institutionName: institution.name,
        usedIdentifier: `${identifierLabel} (${identifier})`,
        employeeCount: savedEmployees.length,
        skippedCount,
        employees: savedEmployees.slice(0, 10), // Return first 10 for display
        totalInResponse: employeeListResponse.data.length
      }
    });

  } catch (error) {
    console.error('Error in HRIMS fetch-by-institution API:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
