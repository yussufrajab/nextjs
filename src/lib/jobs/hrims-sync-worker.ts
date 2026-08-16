/**
 * HRIMS Sync Worker
 *
 * Background worker that processes HRIMS synchronization jobs
 * Runs independently and processes jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { createRedisConnection } from '../redis';
import { workerLogger } from '@/lib/logger';
import {
  HRIMS_SYNC_QUEUE_NAME,
  HRIMSSyncJobData,
  HRIMSSyncProgress,
} from './hrims-sync-queue';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

async function fetchFromHRIMS(
  requestId: string,
  requestPayloadData: any,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
): Promise<any> {
  try {
    const response = await axios.post(
      `${hrimsConfig.BASE_URL}/Employees`,
      {
        RequestId: requestId,
        RequestPayloadData: requestPayloadData,
      },
      {
        headers: {
          ApiKey: hrimsConfig.API_KEY,
          Token: hrimsConfig.TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 900000, // 15 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `HRIMS API error: ${response.status} ${response.statusText}`
      );
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

/**
 * Case-insensitive, whitespace-normalised comparison of two workplace
 * names. Returns true when they refer to the same institution. Handles
 * minor formatting differences (extra spaces, case) that HRIMS and the
 * local Institution table may carry.
 */
function workplaceMatch(workplace: string, institutionName: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return norm(workplace) === norm(institutionName);
}

async function saveEmployeeFromDetailedData(
  hrimsData: any,
  institutionId: string,
  institutionName: string
) {
  try {
    const personalInfo = hrimsData.personalInfo;

    if (!personalInfo?.zanIdNumber || personalInfo.zanIdNumber.trim() === '') {
      return null;
    }

    const currentEmployment =
      hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) ||
      hrimsData.employmentHistories?.[0];
    const currentSalary =
      hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) ||
      hrimsData.salaryInformation?.[0];
    const highestEducation =
      hrimsData.educationHistories?.find(
        (edu: any) => edu.isEmploymentHighest
      ) || hrimsData.educationHistories?.[0];

    // ── Workplace filter ───────────────────────────────────────────────
    // The HRIMS API returns ALL employees appointed under a vote code
    // (e.g. 6,408 for Tume ya Utumishi 037), not just those currently
    // working at that institution. A vote code is the appointing authority,
    // not the current workplace. Skip employees whose current workplace
    // does not match the institution being synced, so the database only
    // contains employees who actually work at the institution.
    const workplace = currentEmployment?.entityName ?? '';
    if (
      institutionName &&
      workplace &&
      !workplaceMatch(workplace, institutionName)
    ) {
      workerLogger.debug(
        { zanId: personalInfo.zanIdNumber, workplace, institutionName },
        'Skipping employee — workplace does not match institution'
      );
      return null;
    }

    const existingEmployee = await db.employee.findUnique({
      where: { zanId: personalInfo.zanIdNumber },
    });

    const employeeId = existingEmployee?.id || uuidv4();

    const fullName = [
      personalInfo.firstName,
      personalInfo.middleName,
      personalInfo.lastName,
    ]
      .filter((name) => name && name.trim())
      .join(' ');

    let gender = 'Male';
    if (personalInfo.genderName) {
      if (personalInfo.genderName === 'Mwanamme') {
        gender = 'Male';
      } else if (personalInfo.genderName === 'Mwanamke') {
        gender = 'Female';
      } else if (
        personalInfo.genderName === 'Male' ||
        personalInfo.genderName === 'Female'
      ) {
        gender = personalInfo.genderName;
      }
    }

    const contactAddress =
      [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
        .filter((part) => part && part.trim())
        .join(', ') || null;

    const cadre = currentEmployment
      ? [
          currentEmployment.titlePrefixName,
          currentEmployment.titleName,
          currentEmployment.gradeName,
        ]
          .filter((part) => part && part.trim())
          .join(' ')
      : null;

    let status = 'On Probation';
    if (personalInfo.isEmployeeConfirmed) {
      status = 'Confirmed';
    } else if (currentEmployment) {
      const empStatus = currentEmployment.employeeStatusName?.toLowerCase();
      if (empStatus?.includes('staafu')) status = 'Retired';
      else if (empStatus?.includes('hayupo')) status = 'Resigned';
      else if (empStatus?.includes('aachishwa')) status = 'Terminated';
      else if (empStatus?.includes('fukuzwa')) status = 'Dismissed';
      else if (
        currentEmployment.employmentStatusName?.toLowerCase().includes('hai')
      )
        status = 'Confirmed';
    }

    let retirementDate = null;
    const activeContract = hrimsData.contractDetails?.find(
      (c: any) => c.isActive
    );
    if (
      activeContract?.toDate &&
      activeContract.toDate !== '1900-01-01T00:00:00'
    ) {
      retirementDate = new Date(activeContract.toDate);
    }

    const dbEmployeeData = {
      id: employeeId,
      name: fullName,
      gender: gender,
      dateOfBirth: personalInfo.birthDate
        ? new Date(personalInfo.birthDate)
        : null,
      placeOfBirth: personalInfo.placeOfBirth,
      region:
        personalInfo.districtName ||
        personalInfo.birthRegionName ||
        personalInfo.regionName,
      countryOfBirth: personalInfo.birthCountryName,
      zanId: personalInfo.zanIdNumber,
      phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone,
      contactAddress: contactAddress,
      zssfNumber: personalInfo.zssfNumber,
      payrollNumber: personalInfo.payrollNumber || '',
      cadre: cadre,
      salaryScale: currentSalary?.salaryScaleName,
      ministry:
        currentEmployment?.parentEntityName || currentEmployment?.entityName,
      department: currentEmployment?.subEntityName,
      appointmentType: currentEmployment?.appointmentTypeName,
      contractType: activeContract?.contractTypeName,
      recentTitleDate: currentEmployment?.fromDate
        ? new Date(currentEmployment.fromDate)
        : null,
      currentReportingOffice:
        currentEmployment?.divisionName || currentEmployment?.subEntityName,
      currentWorkplace: currentEmployment?.entityName,
      employmentDate: personalInfo.employmentDate
        ? new Date(personalInfo.employmentDate)
        : null,
      confirmationDate: personalInfo.employmentConfirmationDate
        ? new Date(personalInfo.employmentConfirmationDate)
        : null,
      retirementDate: retirementDate,
      status: status,
      institutionId: institutionId,
      employeeEntityId: personalInfo.zanIdNumber,
    };

    const { institutionId: instId, ...employeeDataWithoutInstId } =
      dbEmployeeData;

    await db.employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      // SECURITY/DATA-INTEGRITY: Do NOT overwrite institutionId on update.
      // zanId is globally unique, so an employee exists exactly once. If the
      // same ZAN ID surfaces in more than one institution's HRIMS feed (or you
      // re-sync a different institution whose feed overlaps), the upsert's
      // update branch previously reset institutionId to whatever institution
      // is currently syncing — silently "stealing" the employee and tagging
      // them under the wrong institution. The institution is assigned once,
      // at creation; later syncs refresh the profile but keep the original
      // institution.
      update: employeeDataWithoutInstId,
      create: {
        ...employeeDataWithoutInstId,
        Institution: {
          connect: { id: institutionId },
        },
      },
    });

    return {
      employeeId,
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      cadre: dbEmployeeData.cadre,
      ministry: dbEmployeeData.ministry,
      status: dbEmployeeData.status,
    };
  } catch (error) {
    workerLogger.error({ err: error }, 'Error saving employee');
    throw error;
  }
}

/**
 * Process a single HRIMS sync job
 */
async function processHRIMSSyncJob(job: Job<HRIMSSyncJobData>): Promise<any> {
  const HRIMS_CONFIG = await getHrimsApiConfig();
  const {
    institutionId,
    institutionName,
    requestId,
    identifier,
    identifierLabel,
    pageSize,
  } = job.data;

  const startTime = Date.now();
  workerLogger.info(
    { jobId: job.id, institutionName, identifierLabel, identifier, pageSize },
    'Processing HRIMS sync job'
  );

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
    workerLogger.info({ page: currentPage }, 'Fetching page from HRIMS');

    await job.updateProgress({
      type: 'progress',
      phase: 'fetching',
      message: `Fetching page ${currentPage}...`,
      currentPage,
      totalFetched: allEmployees.length,
      estimatedTotal: overallDataSize,
    } as HRIMSSyncProgress);

    try {
      const employeeListResponse = await fetchFromHRIMS(
        requestId,
        {
          PageNumber: currentPage,
          PageSize: pageSize,
          RequestBody: identifier,
        },
        HRIMS_CONFIG
      );

      const pageFetchTime = Date.now() - pageStartTime;
      workerLogger.info({ page: currentPage, fetchTimeMs: pageFetchTime }, 'HRIMS page response received');

      if (employeeListResponse.code !== 200) {
        failedPages++;
        workerLogger.warn(
          { page: currentPage, code: employeeListResponse.code },
          'HRIMS page fetch failed with non-200 code'
        );

        if (currentPage === 0) {
          throw new Error(
            employeeListResponse.message ||
              `No employees found for ${identifierLabel}: ${identifier}`
          );
        }

        if (failedPages >= 3) {
          workerLogger.warn({ failedPages }, '3 consecutive page failures, stopping pagination');
          break;
        }

        currentPage++;
        continue;
      }

      failedPages = 0;

      if (currentPage === 0) {
        overallDataSize = employeeListResponse.overallDataSize || 0;
        workerLogger.info({ overallDataSize }, 'Total employees reported by HRIMS');

        await job.updateProgress({
          type: 'progress',
          phase: 'fetching',
          message: `Found ${overallDataSize} total employees`,
          estimatedTotal: overallDataSize,
          estimatedPages: Math.ceil(overallDataSize / pageSize),
        } as HRIMSSyncProgress);
      }

      if (
        employeeListResponse.data &&
        Array.isArray(employeeListResponse.data)
      ) {
        allEmployees.push(...employeeListResponse.data);
        const progress =
          overallDataSize > 0
            ? (allEmployees.length / overallDataSize) * 100
            : 0;
        workerLogger.info(
          { added: employeeListResponse.data.length, totalFetched: allEmployees.length, overallDataSize, progressPercent: progress.toFixed(1) },
          'Employees fetched from HRIMS page'
        );

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

      const currentDataSize =
        employeeListResponse.currentDataSize ||
        employeeListResponse.data?.length ||
        0;

      if (
        currentDataSize === 0 ||
        currentDataSize < pageSize ||
        (overallDataSize > 0 && allEmployees.length >= overallDataSize)
      ) {
        hasMoreData = false;
        workerLogger.info({ totalFetched: allEmployees.length }, 'Pagination complete');
      } else {
        currentPage++;
      }
    } catch (error) {
      failedPages++;
      workerLogger.error({ err: error, page: currentPage }, 'Error fetching HRIMS page');

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
  workerLogger.info({ totalEmployees: allEmployees.length }, 'Saving employees to database');

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
      const employeeData = await saveEmployeeFromDetailedData(
        allEmployees[i],
        institutionId,
        institutionName
      );
      if (employeeData) {
        savedEmployees.push(employeeData);

        if (
          (savedEmployees.length + skippedCount) % 10 === 0 ||
          i === allEmployees.length - 1
        ) {
          const percentage =
            ((savedEmployees.length + skippedCount) / allEmployees.length) *
            100;
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

      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (error) {
      workerLogger.error({ err: error }, 'Error processing employee');
      skippedCount++;
    }
  }

  const saveTime = (
    (Date.now() - startTime - parseFloat(fetchTime) * 1000) /
    1000
  ).toFixed(1);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  workerLogger.info(
    { saved: savedEmployees.length, skipped: skippedCount, totalTimeSec: totalTime },
    'HRIMS sync processing complete'
  );

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
    workerLogger.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, error) => {
    workerLogger.error({ jobId: job?.id, err: error }, 'Job failed');
  });

  worker.on('error', (error) => {
    workerLogger.error({ err: error }, 'Worker error');
  });

  workerLogger.info('HRIMS Sync Worker started');

  return worker;
}