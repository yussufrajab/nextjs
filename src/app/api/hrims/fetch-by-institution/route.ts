import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Configure route for long-running operations
export const maxDuration = 300; // 5 minutes (increase if needed for very large institutions)
export const dynamic = 'force-dynamic';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

async function fetchFromHRIMS(requestId: string, requestPayloadData: any): Promise<any> {
  try {
    // Use axios with 15 minute timeout for large datasets
    const response = await axios.post(
      `${HRIMS_CONFIG.BASE_URL}/Employees`,
      {
        RequestId: requestId,
        RequestPayloadData: requestPayloadData
      },
      {
        headers: {
          'ApiKey': HRIMS_CONFIG.API_KEY,
          'Token': HRIMS_CONFIG.TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 900000, // 15 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.status !== 200) {
      throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - institution data too large');
      }
      throw new Error(error.message);
    }
    throw error;
  }
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

    // Map gender with fallback for null/undefined
    let gender = 'Male'; // Default value
    if (personalInfo.genderName) {
      if (personalInfo.genderName === 'Mwanamme') {
        gender = 'Male';
      } else if (personalInfo.genderName === 'Mwanamke') {
        gender = 'Female';
      } else if (personalInfo.genderName === 'Male' || personalInfo.genderName === 'Female') {
        gender = personalInfo.genderName;
      }
      // If none match, keep default 'Male'
    }

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
    const { institutionId: instId, ...employeeDataWithoutInstId } = dbEmployeeData;

    await db.Employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      update: dbEmployeeData,
      create: {
        ...employeeDataWithoutInstId,
        Institution: {
          connect: { id: institutionId }
        }
      },
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
  const encoder = new TextEncoder();

  // Helper function to send progress updates
  const sendProgress = (controller: ReadableStreamDefaultController, data: any) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };
  try {
    const body = await req.json();
    const { identifierType, voteNumber, tinNumber, institutionId, pageSize = 100 } = body;

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

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {

        const startTime = Date.now();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🚀 Starting fetch for ${institution.name}`);
        console.log(`   Identifier: ${identifierLabel} = ${identifier}`);
        console.log(`   Page size: ${pageSize}`);
        console.log(`   Started at: ${new Date().toISOString()}`);
        console.log(`${'='.repeat(80)}\n`);

        // Send initial progress
        sendProgress(controller, {
          type: 'progress',
          phase: 'fetching',
          message: `Starting fetch for ${institution.name} using ${identifierLabel}`,
          institutionName: institution.name,
          identifierLabel,
          pageSize,
        });

        // Pagination loop - fetch all pages
        const allEmployees: any[] = [];
        let currentPage = 0;
        let overallDataSize = 0;
        let hasMoreData = true;
        const MAX_PAGES = 200;
        let failedPages = 0;

        while (hasMoreData && currentPage < MAX_PAGES) {
          const pageStartTime = Date.now();
          console.log(`\n📄 [Page ${currentPage}] Fetching from HRIMS...`);

          // Send page fetch progress
          sendProgress(controller, {
            type: 'progress',
            phase: 'fetching',
            message: `Fetching page ${currentPage}...`,
            currentPage,
            totalFetched: allEmployees.length,
            estimatedTotal: overallDataSize,
          });

          try {
            // Fetch employees from HRIMS using the appropriate RequestId
            const employeeListResponse = await fetchFromHRIMS(requestId, {
              PageNumber: currentPage,
              PageSize: pageSize,
              RequestBody: identifier
            });

            const pageFetchTime = Date.now() - pageStartTime;
            console.log(`   Response received in ${pageFetchTime}ms`);

            console.log(`   Code: ${employeeListResponse.code}, Status: ${employeeListResponse.status}`);
            console.log(`   Current page: ${employeeListResponse.currentPage}, Current size: ${employeeListResponse.currentDataSize}`);
            console.log(`   Overall size: ${employeeListResponse.overallDataSize}, Data length: ${employeeListResponse.data?.length || 0}`);

            if (employeeListResponse.code !== 200) {
              failedPages++;
              console.log(`   ❌ Page ${currentPage} failed with code ${employeeListResponse.code}`);

              // If first page fails, send error and close
              if (currentPage === 0) {
                sendProgress(controller, {
                  type: 'error',
                  message: employeeListResponse.message || `No employees found for ${identifierLabel}: ${identifier}`,
                });
                controller.close();
                return;
              }

              // If we've had 3 consecutive failures, stop
              if (failedPages >= 3) {
                console.log(`   ⚠️ 3 consecutive page failures, stopping pagination`);
                break;
              }

              // Otherwise, try next page
              currentPage++;
              continue;
            }

            // Reset failed pages counter on success
            failedPages = 0;

            // Store pagination metadata from first page
            if (currentPage === 0) {
              overallDataSize = employeeListResponse.overallDataSize || 0;
              console.log(`\n📊 Total employees reported: ${overallDataSize}`);
              console.log(`   Estimated pages: ${Math.ceil(overallDataSize / pageSize)}\n`);

              // Send total count update
              sendProgress(controller, {
                type: 'progress',
                phase: 'fetching',
                message: `Found ${overallDataSize} total employees`,
                estimatedTotal: overallDataSize,
                estimatedPages: Math.ceil(overallDataSize / pageSize),
              });
            }

            // Add employees from this page
            if (employeeListResponse.data && Array.isArray(employeeListResponse.data)) {
              allEmployees.push(...employeeListResponse.data);
              const progress = overallDataSize > 0 ? ((allEmployees.length / overallDataSize) * 100).toFixed(1) : '?';
              console.log(`   ✓ Added ${employeeListResponse.data.length} employees`);
              console.log(`   📈 Progress: ${allEmployees.length}/${overallDataSize} (${progress}%)`);

              // Send fetch progress update
              sendProgress(controller, {
                type: 'progress',
                phase: 'fetching',
                message: `Fetched ${allEmployees.length} of ${overallDataSize} employees`,
                currentPage: currentPage + 1,
                totalFetched: allEmployees.length,
                estimatedTotal: overallDataSize,
                progressPercent: parseFloat(progress),
              });
            }

        // Check if we have more data to fetch
        const currentDataSize = employeeListResponse.currentDataSize || employeeListResponse.data?.length || 0;

            // Stop if:
            // 1. No data in current response
            // 2. Current data size is less than page size (last page)
            // 3. We've fetched all employees based on overallDataSize
            if (currentDataSize === 0 ||
                currentDataSize < pageSize ||
                (overallDataSize > 0 && allEmployees.length >= overallDataSize)) {
              hasMoreData = false;
              console.log(`\n✅ Pagination complete. Fetched ${allEmployees.length} total employees`);
            } else {
              currentPage++;
            }

          } catch (error) {
            failedPages++;
            console.error(`   ❌ Error fetching page ${currentPage}:`, error);

            if (currentPage === 0 || failedPages >= 3) {
              sendProgress(controller, {
                type: 'error',
                message: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
              controller.close();
              return;
            }

            currentPage++;
          }
        }

        if (currentPage >= MAX_PAGES) {
          console.log(`\n⚠️ Reached maximum page limit (${MAX_PAGES} pages). Stopping fetch.`);
        }

        const fetchTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏱️  Total fetch time: ${fetchTime} seconds`);

        // Check if we have any employees to process
        if (allEmployees.length === 0) {
          sendProgress(controller, {
            type: 'error',
            message: `No employees found for ${identifierLabel}: ${identifier}`,
          });
          controller.close();
          return;
        }

        // Send transition to saving phase
        sendProgress(controller, {
          type: 'progress',
          phase: 'saving',
          message: `Starting to save ${allEmployees.length} employees to database...`,
          totalToSave: allEmployees.length,
        });

        // Process and save each employee
        const saveStartTime = Date.now();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`💾 Saving ${allEmployees.length} employees to database...`);
        console.log(`${'='.repeat(80)}\n`);

        const savedEmployees = [];
        let skippedCount = 0;
        let lastProgressLog = 0;

        for (let i = 0; i < allEmployees.length; i++) {
          const employeeDetailedData = allEmployees[i];

          try {
            const employeeData = await saveEmployeeFromDetailedData(employeeDetailedData, institutionId);
            if (employeeData) {
              savedEmployees.push(employeeData);

              // Log progress every 10 employees or at the last employee
              const currentProgress = savedEmployees.length + skippedCount;
              if (currentProgress - lastProgressLog >= 10 || i === allEmployees.length - 1) {
                const percentage = ((currentProgress / allEmployees.length) * 100).toFixed(1);
                const elapsed = ((Date.now() - saveStartTime) / 1000).toFixed(1);
                console.log(`   📊 Saved: ${savedEmployees.length}/${allEmployees.length} (${percentage}%) | Skipped: ${skippedCount} | Time: ${elapsed}s`);

                // Send save progress update
                sendProgress(controller, {
                  type: 'progress',
                  phase: 'saving',
                  message: `Saving employees to database...`,
                  saved: savedEmployees.length,
                  skipped: skippedCount,
                  total: allEmployees.length,
                  progressPercent: parseFloat(percentage),
                });

                lastProgressLog = currentProgress;
              }
            } else {
              skippedCount++;
            }

            // Reduced delay to speed up processing
            await new Promise(resolve => setTimeout(resolve, 10));

          } catch (error) {
            const personalInfo = employeeDetailedData?.personalInfo;
            console.error(`   ❌ Error processing employee ${personalInfo?.zanIdNumber}:`, error instanceof Error ? error.message : error);
            skippedCount++;
          }
        }

        const saveTime = ((Date.now() - saveStartTime) / 1000).toFixed(1);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n${'='.repeat(80)}`);
        console.log(`✅ Processing complete!`);
        console.log(`   Total employees fetched: ${allEmployees.length}`);
        console.log(`   Successfully saved: ${savedEmployees.length}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Pages fetched: ${currentPage + (hasMoreData ? 0 : 1)}`);
        console.log(`   Fetch time: ${fetchTime}s`);
        console.log(`   Save time: ${saveTime}s`);
        console.log(`   Total time: ${totalTime}s`);
        console.log(`${'='.repeat(80)}\n`);

        // Send final completion message
        sendProgress(controller, {
          type: 'complete',
          success: true,
          message: `Successfully fetched and stored ${savedEmployees.length} employees from ${institution.name}`,
          data: {
            institutionName: institution.name,
            usedIdentifier: `${identifierLabel} (${identifier})`,
            employeeCount: savedEmployees.length,
            skippedCount,
            totalFetched: allEmployees.length,
            pagesFetched: currentPage + (hasMoreData ? 0 : 1),
            pageSize,
            fetchTime,
            saveTime,
            totalTime,
            employees: savedEmployees.slice(0, 10), // Return first 10 for display
          }
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
