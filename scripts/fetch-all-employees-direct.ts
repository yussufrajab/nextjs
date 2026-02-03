/**
 * HRIMS Direct Fetch Script - All Institutions
 *
 * This script fetches employee data directly from HRIMS API and saves to the database.
 * It does NOT use the web application's job queue - it's a standalone script.
 *
 * Features:
 * - Resumable: Saves progress to state file
 * - Direct HRIMS API calls
 * - Pagination support
 * - Network error retry
 *
 * Usage:
 *   npx tsx scripts/fetch-all-employees-direct.ts [OPTIONS]
 *
 * Options:
 *   --status        Show current progress
 *   --reset         Reset state and start fresh
 *   --help          Show help
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Use a single Prisma client with limited connection pool
// Add connection_limit=3 to prevent overwhelming the database
const dbUrl = process.env.DATABASE_URL?.includes('connection_limit')
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}&connection_limit=3`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // HRIMS API Configuration (hardcoded for standalone script)
  HRIMS_BASE_URL: 'http://10.0.217.11:8135/api',
  HRIMS_API_KEY: '0ea1e3f5-ea57-410b-a199-246fa288b851',
  HRIMS_TOKEN: 'CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4',

  // Pagination
  PAGE_SIZE: 100,

  // Timeouts
  HRIMS_TIMEOUT: 900000, // 15 minutes for HRIMS API

  // Retries
  MAX_RETRIES: 3,
  RETRY_DELAY: 30000, // 30 seconds
  NETWORK_RETRY_DELAY: 60000, // 60 seconds for network errors

  // Flow Control
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds

  // State Management
  STATE_DIR: './scripts/state',
  STATE_FILE: 'direct-fetch-progress.json',

  // Logging
  LOG_DIR: './logs',
  LOG_FILE_PREFIX: 'direct-fetch',
};

// ============================================================================
// TYPES
// ============================================================================
interface Institution {
  id: string;
  name: string;
  voteNumber: string | null;
  tinNumber: string | null;
}

interface InstitutionFetchState {
  institutionId: string;
  institutionName: string;
  status: 'completed' | 'failed' | 'skipped';
  employeeCount?: number;
  error?: string;
  completedAt: string;
}

interface FetchProgressState {
  startedAt: string;
  lastUpdatedAt: string;
  totalInstitutions: number;
  completedInstitutions: InstitutionFetchState[];
  isComplete: boolean;
  totalEmployeesFetched: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
function getStatePath(): string {
  return path.join(CONFIG.STATE_DIR, CONFIG.STATE_FILE);
}

function loadState(): FetchProgressState | null {
  const statePath = getStatePath();
  if (fs.existsSync(statePath)) {
    try {
      const stateData = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(stateData) as FetchProgressState;
    } catch (error) {
      console.error('Error loading state file:', error);
      return null;
    }
  }
  return null;
}

function saveState(state: FetchProgressState): void {
  if (!fs.existsSync(CONFIG.STATE_DIR)) {
    fs.mkdirSync(CONFIG.STATE_DIR, { recursive: true });
  }
  state.lastUpdatedAt = new Date().toISOString();
  const statePath = getStatePath();
  const tempPath = statePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
  fs.renameSync(tempPath, statePath);
}

function initializeState(totalInstitutions: number): FetchProgressState {
  return {
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    totalInstitutions,
    completedInstitutions: [],
    isComplete: false,
    totalEmployeesFetched: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
  };
}

function isInstitutionCompleted(state: FetchProgressState, institutionId: string): boolean {
  return state.completedInstitutions.some(
    (inst) => inst.institutionId === institutionId && inst.status === 'completed'
  );
}

function resetState(): void {
  const statePath = getStatePath();
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log('State file reset successfully.');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

let logFile: fs.WriteStream | null = null;

function log(level: string, message: string): void {
  const logMessage = `[${getCurrentTimestamp()}] ${level}: ${message}`;
  console.log(logMessage);
  if (logFile) logFile.write(logMessage + '\n');
}

function logInfo(message: string): void { log('INFO', message); }
function logSuccess(message: string): void { log('SUCCESS', message); }
function logError(message: string): void { log('ERROR', message); }
function logWarning(message: string): void { log('WARNING', message); }

function logDivider(char = '=', length = 80): void {
  const divider = char.repeat(length);
  console.log(divider);
  if (logFile) logFile.write(divider + '\n');
}

function isNetworkError(error: string): boolean {
  const patterns = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'timeout', 'network', 'No response', 'socket hang up'];
  return patterns.some((p) => error.toLowerCase().includes(p.toLowerCase()));
}

// ============================================================================
// HRIMS API FUNCTIONS
// ============================================================================
async function fetchFromHRIMS(requestId: string, requestPayloadData: any): Promise<any> {
  const response = await axios.post(
    `${CONFIG.HRIMS_BASE_URL}/Employees`,
    {
      RequestId: requestId,
      RequestPayloadData: requestPayloadData,
    },
    {
      headers: {
        ApiKey: CONFIG.HRIMS_API_KEY,
        Token: CONFIG.HRIMS_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: CONFIG.HRIMS_TIMEOUT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  if (response.status !== 200) {
    throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
  }

  return response.data;
}

// ============================================================================
// EMPLOYEE DATA TRANSFORMATION (matches Prisma schema)
// ============================================================================
function transformEmployeeData(hrimsData: any, institutionId: string): { data: any; zanId: string } | null {
  const personalInfo = hrimsData.personalInfo;
  if (!personalInfo?.zanIdNumber || personalInfo.zanIdNumber.trim() === '') {
    return null;
  }

  const currentEmployment = hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) || hrimsData.employmentHistories?.[0];
  const currentSalary = hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) || hrimsData.salaryInformation?.[0];
  const activeContract = hrimsData.contractDetails?.find((c: any) => c.isActive);

  const employeeId = uuidv4();

  const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
    .filter((name) => name && name.trim())
    .join(' ');

  let gender = 'Male';
  if (personalInfo.genderName) {
    if (personalInfo.genderName === 'Mwanamme') gender = 'Male';
    else if (personalInfo.genderName === 'Mwanamke') gender = 'Female';
    else if (personalInfo.genderName === 'Male' || personalInfo.genderName === 'Female') gender = personalInfo.genderName;
  }

  const contactAddress = [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
    .filter((part) => part && part.trim())
    .join(', ') || null;

  const cadre = currentEmployment
    ? [currentEmployment.titlePrefixName, currentEmployment.titleName, currentEmployment.gradeName]
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
    else if (currentEmployment.employmentStatusName?.toLowerCase().includes('hai')) status = 'Confirmed';
  }

  let retirementDate = null;
  if (activeContract?.toDate && activeContract.toDate !== '1900-01-01T00:00:00') {
    retirementDate = new Date(activeContract.toDate);
  }

  // Match the exact Prisma schema fields
  return {
    zanId: personalInfo.zanIdNumber,
    data: {
      id: employeeId,
      name: fullName,
      gender: gender,
      dateOfBirth: personalInfo.birthDate ? new Date(personalInfo.birthDate) : null,
      placeOfBirth: personalInfo.placeOfBirth || null,
      region: personalInfo.districtName || personalInfo.birthRegionName || personalInfo.regionName || null,
      countryOfBirth: personalInfo.birthCountryName || null,
      zanId: personalInfo.zanIdNumber,
      phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone || null,
      contactAddress: contactAddress,
      zssfNumber: personalInfo.zssfNumber || null,
      payrollNumber: personalInfo.payrollNumber || '',
      cadre: cadre,
      salaryScale: currentSalary?.salaryScaleName || null,
      ministry: currentEmployment?.parentEntityName || currentEmployment?.entityName || null,
      department: currentEmployment?.subEntityName || null,
      appointmentType: currentEmployment?.appointmentTypeName || null,
      contractType: activeContract?.contractTypeName || null,
      recentTitleDate: currentEmployment?.fromDate ? new Date(currentEmployment.fromDate) : null,
      currentReportingOffice: currentEmployment?.divisionName || currentEmployment?.subEntityName || null,
      currentWorkplace: currentEmployment?.entityName || null,
      employmentDate: personalInfo.employmentDate ? new Date(personalInfo.employmentDate) : null,
      confirmationDate: personalInfo.employmentConfirmationDate ? new Date(personalInfo.employmentConfirmationDate) : null,
      retirementDate: retirementDate,
      status: status,
      institutionId: institutionId,
      employeeEntityId: personalInfo.zanIdNumber,
    }
  };
}

// ============================================================================
// BATCH SAVE EMPLOYEES
// ============================================================================
const BATCH_SIZE = 25;

async function saveEmployeesBatch(
  employees: any[],
  institutionId: string,
  onProgress?: (saved: number, skipped: number, total: number) => void
): Promise<{ savedCount: number; skippedCount: number; errorCounts: Record<string, number> }> {
  let savedCount = 0;
  let skippedCount = 0;
  const errorCounts: Record<string, number> = {};

  // Transform all employees first
  const employeeDataList: { data: any; zanId: string }[] = [];
  for (const emp of employees) {
    const transformed = transformEmployeeData(emp, institutionId);
    if (transformed) {
      employeeDataList.push({ data: transformed.data, zanId: transformed.zanId });
    } else {
      skippedCount++;
      errorCounts['No ZanID'] = (errorCounts['No ZanID'] || 0) + 1;
    }
  }

  // Process in batches using transactions
  for (let i = 0; i < employeeDataList.length; i += BATCH_SIZE) {
    const batch = employeeDataList.slice(i, i + BATCH_SIZE);

    try {
      // Use transaction to batch upserts
      await prisma.$transaction(
        batch.map((item) => {
          // Separate institutionId for relation connection
          const { institutionId: instId, ...dataWithoutInstId } = item.data;

          return prisma.employee.upsert({
            where: { zanId: item.zanId },
            update: item.data,
            create: {
              ...dataWithoutInstId,
              Institution: {
                connect: { id: instId },
              },
            },
          });
        }),
        {
          timeout: 60000, // 60 second timeout for transaction
        }
      );

      savedCount += batch.length;
    } catch (error) {
      // If batch fails, try individual saves
      for (const item of batch) {
        try {
          const { institutionId: instId, ...dataWithoutInstId } = item.data;

          await prisma.employee.upsert({
            where: { zanId: item.zanId },
            update: item.data,
            create: {
              ...dataWithoutInstId,
              Institution: {
                connect: { id: instId },
              },
            },
          });
          savedCount++;
        } catch (individualError) {
          skippedCount++;
          const errorMsg = individualError instanceof Error ? individualError.message.substring(0, 80) : 'Unknown';
          errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
        }
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(savedCount, skippedCount, employees.length);
    }

    // Small pause between batches to prevent connection exhaustion
    await sleep(100);
  }

  return { savedCount, skippedCount, errorCounts };
}

// ============================================================================
// FETCH INSTITUTION
// ============================================================================
async function fetchInstitution(
  institution: Institution,
  retryAttempt = 0
): Promise<{ success: boolean; employeeCount: number; error?: string }> {
  const startTime = Date.now();

  let identifierType: 'votecode' | 'tin';
  let identifier: string;
  let requestId: string;

  if (institution.voteNumber) {
    identifierType = 'votecode';
    identifier = institution.voteNumber;
    requestId = '204';
  } else if (institution.tinNumber) {
    identifierType = 'tin';
    identifier = institution.tinNumber;
    requestId = '205';
  } else {
    return { success: false, employeeCount: 0, error: 'No identifier available' };
  }

  const retryText = retryAttempt > 0 ? ` (Retry ${retryAttempt}/${CONFIG.MAX_RETRIES})` : '';
  logInfo(`Fetching: ${institution.name}${retryText}`);
  logInfo(`  Using ${identifierType}: ${identifier}`);

  try {
    let allEmployees: any[] = [];
    let currentPage = 1;
    let hasMoreData = true;

    // Fetch all pages
    while (hasMoreData) {
      logInfo(`  Fetching page ${currentPage}...`);

      const requestPayloadData = {
        RequestBody: identifier,
        PageNumber: currentPage.toString(),
        PageSize: CONFIG.PAGE_SIZE.toString(),
      };

      const response = await fetchFromHRIMS(requestId, requestPayloadData);

      if (response?.code === 200 && response?.data?.length > 0) {
        allEmployees = allEmployees.concat(response.data);
        logInfo(`  Page ${currentPage}: Got ${response.data.length} employees (Total: ${allEmployees.length})`);

        if (response.data.length < CONFIG.PAGE_SIZE) {
          hasMoreData = false;
        } else {
          currentPage++;
          await sleep(2000); // Small pause between pages
        }
      } else if (response?.code === 200 && (!response?.data || response?.data?.length === 0)) {
        hasMoreData = false;
        if (currentPage === 1) {
          logWarning(`  No employees found for this institution`);
        }
      } else {
        throw new Error(response?.message || 'Failed to fetch data from HRIMS');
      }
    }

    if (allEmployees.length === 0) {
      return { success: true, employeeCount: 0 };
    }

    // Save employees in batches
    logInfo(`  Saving ${allEmployees.length} employees to database (batch size: ${BATCH_SIZE})...`);

    let lastProgressUpdate = 0;
    const result = await saveEmployeesBatch(
      allEmployees,
      institution.id,
      (saved, skipped, total) => {
        const processed = saved + skipped;
        // Report progress every 50 employees or at end
        if (processed - lastProgressUpdate >= 50 || processed === total) {
          const pct = Math.round((processed / total) * 100);
          logInfo(`  Progress: ${processed}/${total} (${pct}%) - Saved: ${saved}, Skipped: ${skipped}`);
          lastProgressUpdate = processed;
        }
      }
    );

    // Log error breakdown if there were errors
    if (result.skippedCount > 0) {
      logWarning(`  Skip reasons:`);
      for (const [reason, count] of Object.entries(result.errorCounts)) {
        logWarning(`    - ${reason}: ${count}`);
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    logSuccess(`${institution.name}: Saved ${result.savedCount} employees (${result.skippedCount} skipped) in ${formatDuration(duration)}`);

    return { success: true, employeeCount: result.savedCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logError(`${institution.name}: ${errorMsg}`);

    // Retry on network errors
    if (retryAttempt < CONFIG.MAX_RETRIES && isNetworkError(errorMsg)) {
      logWarning(`  Network error. Waiting ${CONFIG.NETWORK_RETRY_DELAY / 1000}s before retry...`);
      await sleep(CONFIG.NETWORK_RETRY_DELAY);
      return fetchInstitution(institution, retryAttempt + 1);
    }

    // Retry on other errors
    if (retryAttempt < CONFIG.MAX_RETRIES) {
      logInfo(`  Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`);
      await sleep(CONFIG.RETRY_DELAY);
      return fetchInstitution(institution, retryAttempt + 1);
    }

    return { success: false, employeeCount: 0, error: errorMsg };
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HRIMS Direct Fetch Script
=========================

This script fetches employee data directly from HRIMS API for all institutions.
It saves progress to a state file, so it can resume if interrupted.

Usage:
  npx tsx scripts/fetch-all-employees-direct.ts [OPTIONS]

Options:
  --status        Show current fetch progress
  --reset         Reset state file and start fresh
  --help, -h      Show this help message

Examples:
  npx tsx scripts/fetch-all-employees-direct.ts           # Start or resume
  npx tsx scripts/fetch-all-employees-direct.ts --status  # Check progress
  npx tsx scripts/fetch-all-employees-direct.ts --reset   # Reset and start fresh

State file: ${getStatePath()}
`);
    process.exit(0);
  }

  if (args.includes('--reset')) {
    resetState();
    process.exit(0);
  }

  if (args.includes('--status')) {
    const state = loadState();
    if (state) {
      console.log('\n=== CURRENT FETCH PROGRESS ===');
      console.log(`Started at: ${state.startedAt}`);
      console.log(`Last updated: ${state.lastUpdatedAt}`);
      console.log(`Total institutions: ${state.totalInstitutions}`);
      console.log(`Progress: ${state.completedInstitutions.length}/${state.totalInstitutions}`);
      console.log(`Successful: ${state.successCount}`);
      console.log(`Failed: ${state.failureCount}`);
      console.log(`Skipped: ${state.skippedCount}`);
      console.log(`Total employees fetched: ${state.totalEmployeesFetched}`);
      console.log(`Complete: ${state.isComplete}`);
      console.log('==============================\n');
    } else {
      console.log('\nNo previous state found.\n');
    }
    process.exit(0);
  }

  // Create log directory and file
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logFilePath = path.join(CONFIG.LOG_DIR, `${CONFIG.LOG_FILE_PREFIX}-${timestamp}.log`);
  logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

  console.log('\n');
  logDivider('=');
  logInfo('HRIMS DIRECT FETCH SCRIPT - ALL INSTITUTIONS');
  logDivider('=');
  logInfo(`Started at: ${getCurrentTimestamp()}`);
  logInfo(`Log file: ${logFilePath}`);
  logInfo('');
  logInfo('CONFIGURATION:');
  logInfo(`  - HRIMS API: ${CONFIG.HRIMS_BASE_URL}`);
  logInfo(`  - Page size: ${CONFIG.PAGE_SIZE}`);
  logInfo(`  - Max retries: ${CONFIG.MAX_RETRIES}`);
  logInfo(`  - Pause between institutions: ${CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000}s`);
  logInfo(`  - State file: ${getStatePath()}`);
  logDivider('=');
  logInfo('');

  const scriptStartTime = Date.now();

  // Load institutions from API (to avoid database connection issues at startup)
  logInfo('Loading institutions from API...');
  let institutions: Institution[] = [];

  try {
    const response = await axios.get('http://localhost:9002/api/institutions', {
      timeout: 60000,
    });

    if (response.data?.data) {
      institutions = response.data.data
        .map((inst: any) => ({
          id: inst.id,
          name: inst.name,
          voteNumber: inst.voteNumber || null,
          tinNumber: inst.tinNumber || null,
        }))
        .sort((a: Institution, b: Institution) => a.name.localeCompare(b.name));
    }
  } catch (error) {
    logError(`Failed to load institutions from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logInfo('Trying to load from database instead...');

    try {
      const dbInstitutions = await prisma.institution.findMany({
        orderBy: { name: 'asc' },
      });
      institutions = dbInstitutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        voteNumber: inst.voteNumber || null,
        tinNumber: inst.tinNumber || null,
      }));
    } catch (dbError) {
      logError(`Failed to load institutions: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  if (institutions.length === 0) {
    logError('No institutions found');
    process.exit(1);
  }

  logInfo(`Found ${institutions.length} institutions\n`);

  // Load or initialize state
  let state = loadState();
  const isResuming = state !== null && !state.isComplete;

  if (isResuming && state) {
    logWarning('RESUMING FROM PREVIOUS RUN');
    logInfo(`  Previous progress: ${state.completedInstitutions.length}/${state.totalInstitutions}`);
    logInfo(`  Successful: ${state.successCount}`);
    logInfo(`  Failed: ${state.failureCount}`);
    logInfo(`  Skipped: ${state.skippedCount}`);
    logInfo(`  Employees fetched: ${state.totalEmployeesFetched}`);
    logDivider('-');
    logInfo('');
  } else {
    state = initializeState(institutions.length);
    saveState(state);
  }

  // Process each institution
  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    const progress = `[${i + 1}/${institutions.length}]`;

    // Check if already completed
    if (isInstitutionCompleted(state, institution.id)) {
      logInfo(`${progress} SKIPPING (already completed): ${institution.name}`);
      continue;
    }

    console.log('');
    logDivider('-', 70);
    logInfo(`${progress} INSTITUTION: ${institution.name}`);
    logDivider('-', 70);

    // Check if institution has identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      logWarning(`Skipping: No vote number or TIN number`);
      state.skippedCount++;
      state.completedInstitutions.push({
        institutionId: institution.id,
        institutionName: institution.name,
        status: 'skipped',
        error: 'No identifier available',
        completedAt: new Date().toISOString(),
      });
      saveState(state);
      continue;
    }

    // Fetch data
    const result = await fetchInstitution(institution);

    // Update state
    if (result.success) {
      state.successCount++;
      state.totalEmployeesFetched += result.employeeCount;
      state.completedInstitutions.push({
        institutionId: institution.id,
        institutionName: institution.name,
        status: 'completed',
        employeeCount: result.employeeCount,
        completedAt: new Date().toISOString(),
      });
    } else {
      state.failureCount++;
      state.completedInstitutions.push({
        institutionId: institution.id,
        institutionName: institution.name,
        status: 'failed',
        error: result.error,
        completedAt: new Date().toISOString(),
      });
    }

    saveState(state);

    // Show progress
    const pct = (((i + 1) / institutions.length) * 100).toFixed(1);
    logInfo(`Progress: ${i + 1}/${institutions.length} (${pct}%) | SUCCESS: ${state.successCount} | FAILED: ${state.failureCount} | SKIPPED: ${state.skippedCount}`);

    // Pause between institutions
    if (i < institutions.length - 1) {
      logInfo(`Pausing ${CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000}s before next institution...\n`);
      await sleep(CONFIG.PAUSE_BETWEEN_INSTITUTIONS);
    }
  }

  // Mark complete
  state.isComplete = true;
  saveState(state);

  const totalDuration = Math.floor((Date.now() - scriptStartTime) / 1000);

  // Final summary
  console.log('\n');
  logDivider('=');
  logInfo('FINAL SUMMARY');
  logDivider('=');
  logInfo(`Completed at: ${getCurrentTimestamp()}`);
  logInfo(`Total duration: ${formatDuration(totalDuration)}`);
  logInfo('');
  logInfo(`Total institutions: ${state.totalInstitutions}`);
  logInfo(`Successfully fetched: ${state.successCount}`);
  logInfo(`Failed: ${state.failureCount}`);
  logInfo(`Skipped: ${state.skippedCount}`);
  logInfo(`Total employees fetched: ${state.totalEmployeesFetched.toLocaleString()}`);
  logDivider('=');

  // Database statistics
  try {
    const totalEmployees = await prisma.employee.count();
    console.log('');
    logDivider('=');
    logInfo('DATABASE STATISTICS');
    logDivider('=');
    logInfo(`Total employees in database: ${totalEmployees.toLocaleString()}`);
    logDivider('=');
  } catch (error) {
    logError(`Failed to get database statistics: ${error}`);
  }

  console.log('');
  logInfo(`Log file: ${logFilePath}`);
  logInfo(`State file: ${getStatePath()}`);
  logDivider('=');
  logInfo('Script completed!');
  logDivider('=');
  console.log('');

  if (logFile) logFile.end();
  await prisma.$disconnect();
}

// Handle interrupts
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT. Progress has been saved.');
  console.log('Run the script again to resume.\n');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM. Progress has been saved.\n');
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error('\nFATAL ERROR:', error);
  console.error('\nProgress has been saved. Run the script again to resume.\n');
  await prisma.$disconnect();
  process.exit(1);
});
