/**
 * HRIMS Sync Worker
 *
 * Background worker that processes HRIMS synchronization jobs
 * Runs independently and processes jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { HRIMS_SYNC_QUEUE_NAME, HRIMSSyncJobData, HRIMSSyncProgress } from './hrims-sync-queue';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

async function fetchFromHRIMS(requestId: string, requestPayloadData: any): Promise<any> {
  try {
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

    if (!personalInfo?.zanIdNumber || personalInfo.zanIdNumber.trim() === '') {
      return null;
    }

    const currentEmployment = hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) || hrimsData.employmentHistories?.[0];
    const currentSalary = hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) || hrimsData.salaryInformation?.[0];
    const highestEducation = hrimsData.educationHistories?.find((edu: any) => edu.isEmploymentHighest) || hrimsData.educationHistories?.[0];

    const existingEmployee = await db.employee.findUnique({
      where: { zanId: personalInfo.zanIdNumber }
    });

    const employeeId = existingEmployee?.id || uuidv4();

    const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
      .filter(name => name && name.trim())
      .join(' ');

    let gender = 'Male';
    if (personalInfo.genderName) {
      if (personalInfo.genderName === 'Mwanamme') {
        gender = 'Male';
      } else if (personalInfo.genderName === 'Mwanamke') {
        gender = 'Female';
      } else if (personalInfo.genderName === 'Male' || personalInfo.genderName === 'Female') {
        gender = personalInfo.genderName;
      }
    }

    const contactAddress = [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
      .filter(part => part && part.trim())
      .join(', ') || null;

    const cadre = currentEmployment ?
      [currentEmployment.titlePrefixName, currentEmployment.titleName, currentEmployment.gradeName]
        .filter(part => part && part.trim())
        .join(' ') : null;

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

    let retirementDate = null;
    const activeContract = hrimsData.contractDetails?.find((c: any) => c.isActive);
    if (activeContract?.toDate && activeContract.toDate !== '1900-01-01T00:00:00') {
      retirementDate = new Date(activeContract.toDate);
    }

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

    const { institutionId: instId, ...employeeDataWithoutInstId } = dbEmployeeData;

    await db.employee.upsert({
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
    console.error('Error saving employee:', error);
    throw error;
  }
}

/**
 * Process a single HRIMS sync job
 */
async function processHRIMSSyncJob(job: Job<HRIMSSyncJobData>): Promise<any> {
  const { institutionId, institutionName, requestId, identifier, identifierLabel, pageSize } = job.data;

  const startTime = Date.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Processing HRIMS Sync Job: ${job.id}`);
  console.log(`   Institution: ${institutionName}`);
  console.log(`   Identifier: ${identifierLabel} = ${identifier}`);
  console.log(`   Page size: ${pageSize}`);
  console.log(`${'='.repeat(80)}\n`);

  // Update progress
  await job.updateProgress({
    type: 'progress',
    phase: 'fetching',
    message: `Starting fetch for ${institutionName} using ${identifierLabel}`,
    progressPercent: 0,
  } as HRIMSSyncProgress);

  // Fetch all employees
  const allEmployees: any[] = [];
  let currentPage = 0;
  let overallDataSize = 0;
  let hasMoreData = true;
  const MAX_PAGES = 200;
  let failedPages = 0;

  while (hasMoreData && currentPage < MAX_PAGES) {
    const pageStartTime = Date.now();
    console.log(`\n📄 [Page ${currentPage}] Fetching from HRIMS...`);

    await job.updateProgress({
      type: 'progress',
      phase: 'fetching',
      message: `Fetching page ${currentPage}...`,
      currentPage,
      totalFetched: allEmployees.length,
      estimatedTotal: overallDataSize,
    } as HRIMSSyncProgress);

    try {
      const employeeListResponse = await fetchFromHRIMS(requestId, {
        PageNumber: currentPage,
        PageSize: pageSize,
        RequestBody: identifier
      });

      const pageFetchTime = Date.now() - pageStartTime;
      console.log(`   Response received in ${pageFetchTime}ms`);

      if (employeeListResponse.code !== 200) {
        failedPages++;
        console.log(`   ❌ Page ${currentPage} failed with code ${employeeListResponse.code}`);

        if (currentPage === 0) {
          throw new Error(employeeListResponse.message || `No employees found for ${identifierLabel}: ${identifier}`);
        }

        if (failedPages >= 3) {
          console.log(`   ⚠️ 3 consecutive page failures, stopping pagination`);
          break;
        }

        currentPage++;
        continue;
      }

      failedPages = 0;

      if (currentPage === 0) {
        overallDataSize = employeeListResponse.overallDataSize || 0;
        console.log(`\n📊 Total employees reported: ${overallDataSize}`);

        await job.updateProgress({
          type: 'progress',
          phase: 'fetching',
          message: `Found ${overallDataSize} total employees`,
          estimatedTotal: overallDataSize,
          estimatedPages: Math.ceil(overallDataSize / pageSize),
        } as HRIMSSyncProgress);
      }

      if (employeeListResponse.data && Array.isArray(employeeListResponse.data)) {
        allEmployees.push(...employeeListResponse.data);
        const progress = overallDataSize > 0 ? ((allEmployees.length / overallDataSize) * 100) : 0;
        console.log(`   ✓ Added ${employeeListResponse.data.length} employees`);
        console.log(`   📈 Progress: ${allEmployees.length}/${overallDataSize} (${progress.toFixed(1)}%)`);

        await job.updateProgress({
          type: 'progress',
          phase: 'fetching',
          message: `Fetched ${allEmployees.length} of ${overallDataSize} employees`,
          currentPage: currentPage + 1,
          totalFetched: allEmployees.length,
          estimatedTotal: overallDataSize,
          progressPercent: progress,
        } as HRIMSSyncProgress);
      }

      const currentDataSize = employeeListResponse.currentDataSize || employeeListResponse.data?.length || 0;

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
        throw error;
      }

      currentPage++;
    }
  }

  const fetchTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (allEmployees.length === 0) {
    throw new Error(`No employees found for ${identifierLabel}: ${identifier}`);
  }

  // Save employees
  console.log(`\n💾 Saving ${allEmployees.length} employees to database...`);

  await job.updateProgress({
    type: 'progress',
    phase: 'saving',
    message: `Starting to save ${allEmployees.length} employees to database...`,
    totalFetched: allEmployees.length,
  } as HRIMSSyncProgress);

  const savedEmployees = [];
  let skippedCount = 0;

  for (let i = 0; i < allEmployees.length; i++) {
    try {
      const employeeData = await saveEmployeeFromDetailedData(allEmployees[i], institutionId);
      if (employeeData) {
        savedEmployees.push(employeeData);

        if ((savedEmployees.length + skippedCount) % 10 === 0 || i === allEmployees.length - 1) {
          const percentage = (((savedEmployees.length + skippedCount) / allEmployees.length) * 100);
          await job.updateProgress({
            type: 'progress',
            phase: 'saving',
            message: `Saving employees to database...`,
            saved: savedEmployees.length,
            skipped: skippedCount,
            total: allEmployees.length,
            progressPercent: percentage,
          } as HRIMSSyncProgress);
        }
      } else {
        skippedCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`   ❌ Error processing employee:`, error);
      skippedCount++;
    }
  }

  const saveTime = ((Date.now() - startTime - parseFloat(fetchTime) * 1000) / 1000).toFixed(1);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Processing complete!`);
  console.log(`   Saved: ${savedEmployees.length}, Skipped: ${skippedCount}`);
  console.log(`   Total time: ${totalTime}s`);

  return {
    success: true,
    institutionName,
    employeeCount: savedEmployees.length,
    skippedCount,
    totalFetched: allEmployees.length,
    pagesFetched: currentPage + (hasMoreData ? 0 : 1),
    fetchTime,
    saveTime,
    totalTime,
    employees: savedEmployees.slice(0, 10),
  };
}

/**
 * Create and start the HRIMS sync worker
 */
export function createHRIMSSyncWorker(): Worker {
  const worker = new Worker<HRIMSSyncJobData>(
    HRIMS_SYNC_QUEUE_NAME,
    processHRIMSSyncJob,
    {
      connection: createRedisConnection(),
      concurrency: 2, // Process up to 2 jobs in parallel
      limiter: {
        max: 5, // Max 5 jobs
        duration: 60000, // per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  console.log('✅ HRIMS Sync Worker started');

  return worker;
}
