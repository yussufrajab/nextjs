import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // API Configuration
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  TIMEOUT: 3600000, // 60 minutes per institution (allows for large institutions)

  // Pagination Configuration
  PAGE_SIZE: 100, // Number of records per page (can be adjusted: 50, 100, 150, etc.)

  // Retry Configuration
  MAX_RETRIES: 2, // Number of retries for failed institutions
  RETRY_DELAY: 30000, // 30 seconds wait before retry

  // Flow Control
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds between institutions
  ENABLE_RETRIES: true, // Set to false to disable retries

  // Logging
  LOG_DIR: './logs',
  LOG_FILE_PREFIX: 'hrims-fetch',
  DETAILED_LOGGING: true, // Set to false for less verbose logs
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

interface FetchResult {
  institutionId: string;
  institutionName: string;
  identifier: string;
  identifierType: 'votecode' | 'tin';
  success: boolean;
  employeeCount?: number;
  skippedCount?: number;
  error?: string;
  duration?: number; // in seconds
  retryAttempt?: number;
  pagesFetched?: number;
}

interface FetchStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  totalEmployees: number;
  totalDuration: number; // in seconds
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function logInfo(message: string, logFile?: fs.WriteStream): void {
  const logMessage = `[${getCurrentTimestamp()}] ℹ️  ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logSuccess(message: string, logFile?: fs.WriteStream): void {
  const logMessage = `[${getCurrentTimestamp()}] ✅ ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logError(message: string, logFile?: fs.WriteStream): void {
  const logMessage = `[${getCurrentTimestamp()}] ❌ ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logWarning(message: string, logFile?: fs.WriteStream): void {
  const logMessage = `[${getCurrentTimestamp()}] ⚠️  ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logDivider(char = '=', length = 80, logFile?: fs.WriteStream): void {
  const divider = char.repeat(length);
  console.log(divider);
  if (logFile) {
    logFile.write(divider + '\n');
  }
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

async function fetchInstitutionData(
  institution: Institution,
  retryAttempt = 0,
  logFile?: fs.WriteStream
): Promise<FetchResult> {
  const startTime = Date.now();

  // Determine which identifier to use (prefer vote number)
  let identifierType: 'votecode' | 'tin';
  let identifier: string;

  if (institution.voteNumber) {
    identifierType = 'votecode';
    identifier = institution.voteNumber;
  } else if (institution.tinNumber) {
    identifierType = 'tin';
    identifier = institution.tinNumber;
  } else {
    return {
      institutionId: institution.id,
      institutionName: institution.name,
      identifier: 'N/A',
      identifierType: 'votecode',
      success: false,
      error: 'No vote number or TIN number available',
      duration: 0,
      retryAttempt: 0,
    };
  }

  const retryText = retryAttempt > 0 ? ` (Retry ${retryAttempt}/${CONFIG.MAX_RETRIES})` : '';
  logInfo(`Fetching: ${institution.name}${retryText}`, logFile);
  logInfo(`  Using ${identifierType}: ${identifier}`, logFile);
  logInfo(`  Page size: ${CONFIG.PAGE_SIZE}`, logFile);

  try {
    const response = await axios.post(
      CONFIG.API_URL,
      {
        identifierType,
        voteNumber: institution.voteNumber,
        tinNumber: institution.tinNumber,
        institutionId: institution.id,
        pageSize: CONFIG.PAGE_SIZE,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: CONFIG.TIMEOUT,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      }
    );

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (response.status === 200 && response.data.success) {
      const employeeCount = response.data.data?.employeeCount || 0;
      const skippedCount = response.data.data?.skippedCount || 0;
      const pagesFetched = response.data.data?.pagesFetched || 0;

      logSuccess(
        `${institution.name}: Fetched ${employeeCount} employees ` +
        `(${pagesFetched} pages, ${skippedCount} skipped, ${formatDuration(durationSeconds)})`,
        logFile
      );

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: true,
        employeeCount,
        skippedCount,
        duration: durationSeconds,
        retryAttempt,
        pagesFetched,
      };
    } else {
      const errorMsg = response.data?.message || `HTTP ${response.status}`;
      logError(`${institution.name}: ${errorMsg}`, logFile);

      // Retry on certain errors
      if (CONFIG.ENABLE_RETRIES && retryAttempt < CONFIG.MAX_RETRIES) {
        logInfo(`  ⏳ Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`, logFile);
        await sleep(CONFIG.RETRY_DELAY);
        return fetchInstitutionData(institution, retryAttempt + 1, logFile);
      }

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: errorMsg,
        duration: durationSeconds,
        retryAttempt,
      };
    }
  } catch (error) {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = `Timeout after ${CONFIG.TIMEOUT / 60000} minutes`;
      } else if (error.response) {
        errorMessage = error.response.data?.message ||
                      `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logError(`${institution.name}: ${errorMessage}`, logFile);

    // Retry on network errors or timeouts
    if (
      CONFIG.ENABLE_RETRIES &&
      retryAttempt < CONFIG.MAX_RETRIES &&
      (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('No response'))
    ) {
      logInfo(`  ⏳ Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`, logFile);
      await sleep(CONFIG.RETRY_DELAY);
      return fetchInstitutionData(institution, retryAttempt + 1, logFile);
    }

    return {
      institutionId: institution.id,
      institutionName: institution.name,
      identifier,
      identifierType,
      success: false,
      error: errorMessage,
      duration: durationSeconds,
      retryAttempt,
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Create log directory if it doesn't exist
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }

  // Create log file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logFileName = `${CONFIG.LOG_FILE_PREFIX}-${timestamp}.log`;
  const logFilePath = path.join(CONFIG.LOG_DIR, logFileName);
  const logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

  console.log('\n');
  logDivider('=', 80, logFile);
  logInfo('🚀 HRIMS AUTO FETCH SCRIPT - ALL INSTITUTIONS', logFile);
  logDivider('=', 80, logFile);
  logInfo(`Started at: ${getCurrentTimestamp()}`, logFile);
  logInfo(`Log file: ${logFilePath}`, logFile);
  logInfo('', logFile);
  logInfo('CONFIGURATION:', logFile);
  logInfo(`  - Timeout per institution: ${CONFIG.TIMEOUT / 60000} minutes`, logFile);
  logInfo(`  - Page size: ${CONFIG.PAGE_SIZE}`, logFile);
  logInfo(`  - Max retries: ${CONFIG.MAX_RETRIES}`, logFile);
  logInfo(`  - Retry enabled: ${CONFIG.ENABLE_RETRIES}`, logFile);
  logInfo(`  - Pause between institutions: ${CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000}s`, logFile);
  logDivider('=', 80, logFile);
  logInfo('', logFile);

  const scriptStartTime = Date.now();

  // Fetch all institutions
  logInfo('📂 Loading institutions from database...', logFile);
  const institutions = await prisma.institution.findMany({
    orderBy: { name: 'asc' },
  });

  logInfo(`📊 Found ${institutions.length} institutions\n`, logFile);

  const results: FetchResult[] = [];
  const stats: FetchStats = {
    total: institutions.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    totalEmployees: 0,
    totalDuration: 0,
  };

  // Process each institution
  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    const progress = `[${i + 1}/${institutions.length}]`;

    console.log('');
    logDivider('─', 70, logFile);
    logInfo(`${progress} INSTITUTION: ${institution.name}`, logFile);
    logDivider('─', 70, logFile);

    // Check if institution has any identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      logWarning(`Skipping: No vote number or TIN number`, logFile);
      stats.skipped++;
      results.push({
        institutionId: institution.id,
        institutionName: institution.name,
        identifier: 'N/A',
        identifierType: 'votecode',
        success: false,
        error: 'No identifier available',
        duration: 0,
      });
      continue;
    }

    // Fetch data for this institution
    const result = await fetchInstitutionData(institution, 0, logFile);
    results.push(result);

    // Update statistics
    if (result.success) {
      stats.successful++;
      stats.totalEmployees += result.employeeCount || 0;
    } else if (result.error === 'No identifier available') {
      stats.skipped++;
    } else {
      stats.failed++;
    }
    stats.totalDuration += result.duration || 0;

    // Show running progress
    const progressPct = ((i + 1) / institutions.length * 100).toFixed(1);
    logInfo(
      `📈 Progress: ${i + 1}/${institutions.length} (${progressPct}%) | ` +
      `✅ ${stats.successful} | ❌ ${stats.failed} | ⏭️ ${stats.skipped}`,
      logFile
    );

    // Pause between institutions (except for the last one)
    if (i < institutions.length - 1) {
      const pauseSeconds = CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000;
      logInfo(`⏳ Pausing ${pauseSeconds}s before next institution...\n`, logFile);
      await sleep(CONFIG.PAUSE_BETWEEN_INSTITUTIONS);
    }
  }

  const totalScriptDuration = Math.floor((Date.now() - scriptStartTime) / 1000);

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n');
  logDivider('=', 80, logFile);
  logInfo('📊 FINAL SUMMARY', logFile);
  logDivider('=', 80, logFile);
  logInfo(`Completed at: ${getCurrentTimestamp()}`, logFile);
  logInfo(`Total duration: ${formatDuration(totalScriptDuration)}`, logFile);
  logInfo('', logFile);
  logInfo(`Total institutions: ${stats.total}`, logFile);
  logInfo(`✅ Successfully fetched: ${stats.successful}`, logFile);
  logInfo(`❌ Failed: ${stats.failed}`, logFile);
  logInfo(`⏭️  Skipped (no identifier): ${stats.skipped}`, logFile);
  logInfo(`👥 Total employees fetched: ${stats.totalEmployees.toLocaleString()}`, logFile);

  const avgFetchTime = stats.successful > 0 ? stats.totalDuration / stats.successful : 0;
  logInfo(`⏱️  Average fetch time: ${formatDuration(Math.floor(avgFetchTime))}`, logFile);
  logDivider('=', 80, logFile);

  // ============================================================================
  // SUCCESSFUL FETCHES
  // ============================================================================
  if (stats.successful > 0) {
    console.log('');
    logInfo('✅ SUCCESSFUL FETCHES:', logFile);
    logDivider('-', 80, logFile);

    const successfulResults = results
      .filter(r => r.success)
      .sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0));

    successfulResults.forEach((r, i) => {
      const employeeCountStr = String(r.employeeCount).padStart(6);
      const durationStr = formatDuration(r.duration || 0).padStart(12);
      const pagesStr = r.pagesFetched ? ` | ${r.pagesFetched} pages` : '';
      const skippedStr = r.skippedCount ? ` | ${r.skippedCount} skipped` : '';

      logInfo(
        `${String(i + 1).padStart(3)}. ${r.institutionName.padEnd(50)} | ` +
        `${employeeCountStr} employees | ${durationStr}${pagesStr}${skippedStr}`,
        logFile
      );
    });
  }

  // ============================================================================
  // FAILED FETCHES
  // ============================================================================
  if (stats.failed > 0) {
    console.log('');
    logInfo('❌ FAILED FETCHES:', logFile);
    logDivider('-', 80, logFile);

    const failedResults = results.filter(r => !r.success && r.error !== 'No identifier available');

    failedResults.forEach((r, i) => {
      const retryInfo = r.retryAttempt && r.retryAttempt > 0 ? ` (after ${r.retryAttempt} retries)` : '';
      logInfo(`${String(i + 1).padStart(3)}. ${r.institutionName}`, logFile);
      logInfo(`     Error: ${r.error}${retryInfo}`, logFile);
    });
  }

  // ============================================================================
  // SKIPPED INSTITUTIONS
  // ============================================================================
  if (stats.skipped > 0) {
    console.log('');
    logInfo('⏭️  SKIPPED INSTITUTIONS (No identifier):', logFile);
    logDivider('-', 80, logFile);

    const skippedResults = results.filter(r => r.error === 'No identifier available');

    skippedResults.forEach((r, i) => {
      logInfo(`${String(i + 1).padStart(3)}. ${r.institutionName}`, logFile);
    });
  }

  // ============================================================================
  // DATABASE STATISTICS
  // ============================================================================
  try {
    const totalEmployeesInDb = await prisma.employee.count();
    const totalInstitutionsInDb = await prisma.institution.count();

    console.log('');
    logDivider('=', 80, logFile);
    logInfo('📊 DATABASE STATISTICS', logFile);
    logDivider('=', 80, logFile);
    logInfo(`Total employees in database: ${totalEmployeesInDb.toLocaleString()}`, logFile);
    logInfo(`Total institutions in database: ${totalInstitutionsInDb}`, logFile);
    logDivider('=', 80, logFile);
  } catch (error) {
    logError(`Failed to get database statistics: ${error}`, logFile);
  }

  console.log('');
  logInfo(`📝 Full log saved to: ${logFilePath}`, logFile);
  logInfo('', logFile);
  logDivider('=', 80, logFile);
  logInfo('✨ Script completed successfully!', logFile);
  logDivider('=', 80, logFile);
  console.log('');

  logFile.end();
  await prisma.$disconnect();
}

// ============================================================================
// ERROR HANDLING & EXECUTION
// ============================================================================

main()
  .catch((error) => {
    console.error('\n' + '='.repeat(80));
    console.error('💥 FATAL ERROR:');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80) + '\n');
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
