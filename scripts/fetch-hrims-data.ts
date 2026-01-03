import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  TIMEOUT: 1800000, // 30 minutes per institution
  RETRY_DELAY: 0, // No retries
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds between institutions
  MAX_RETRIES: 0, // No retries - fail after 30 minutes
};

interface FetchResult {
  institutionId: string;
  institutionName: string;
  identifier: string;
  identifierType: 'votecode' | 'tin';
  success: boolean;
  employeeCount?: number;
  error?: string;
  duration?: number; // in seconds
  retryCount?: number;
}

interface FetchStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  totalEmployees: number;
  totalDuration: number; // in seconds
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function logInfo(message: string): void {
  console.log(`[${getCurrentTimestamp()}] ℹ️  ${message}`);
}

function logSuccess(message: string): void {
  console.log(`[${getCurrentTimestamp()}] ✅ ${message}`);
}

function logError(message: string): void {
  console.log(`[${getCurrentTimestamp()}] ❌ ${message}`);
}

function logWarning(message: string): void {
  console.log(`[${getCurrentTimestamp()}] ⚠️  ${message}`);
}

// Main fetch function with retry logic
async function fetchInstitutionData(
  institution: {
    id: string;
    name: string;
    voteNumber: string | null;
    tinNumber: string | null;
  },
  retryCount = 0
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
      retryCount: 0,
    };
  }

  const retryText =
    retryCount > 0 ? ` (Retry ${retryCount}/${CONFIG.MAX_RETRIES})` : '';
  logInfo(`Fetching: ${institution.name}${retryText}`);
  logInfo(`  Using ${identifierType}: ${identifier}`);

  try {
    const response = await axios.post(
      CONFIG.API_URL,
      {
        identifierType,
        voteNumber: institution.voteNumber,
        tinNumber: institution.tinNumber,
        institutionId: institution.id,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: CONFIG.TIMEOUT,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      }
    );

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (response.status === 200 && response.data.success) {
      const employeeCount = response.data.data?.employeeCount || 0;
      logSuccess(
        `${institution.name}: Fetched ${employeeCount} employees (${formatDuration(Date.now() - startTime)})`
      );

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: true,
        employeeCount,
        duration,
        retryCount,
      };
    } else {
      const errorMsg = response.data?.message || `HTTP ${response.status}`;
      logError(`${institution.name}: ${errorMsg}`);

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: errorMsg,
        duration,
        retryCount,
      };
    }
  } catch (error) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = `Timeout after ${CONFIG.TIMEOUT / 60000} minutes`;
      } else if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logError(`${institution.name}: ${errorMessage}`);

    // No retry logic - fail immediately after timeout
    // (MAX_RETRIES is set to 0)

    return {
      institutionId: institution.id,
      institutionName: institution.name,
      identifier,
      identifierType,
      success: false,
      error: errorMessage,
      duration,
      retryCount,
    };
  }
}

// Main execution function
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🚀 HRIMS Data Fetch Script (Axios Implementation)');
  console.log('='.repeat(80));
  console.log(`Started at: ${getCurrentTimestamp()}`);
  console.log(`Timeout per institution: ${CONFIG.TIMEOUT / 60000} minutes`);
  console.log(`Retries: DISABLED (single attempt only)`);
  console.log('='.repeat(80) + '\n');

  const scriptStartTime = Date.now();

  // Fetch all institutions
  logInfo('Loading institutions from database...');
  const institutions = await prisma.institution.findMany({
    orderBy: { name: 'asc' },
  });

  logInfo(`Found ${institutions.length} institutions\n`);

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

    console.log(`\n${progress} ${'='.repeat(70)}`);
    console.log(`${progress} Institution: ${institution.name}`);
    console.log(`${progress} ${'='.repeat(70)}`);

    // Check if institution has any identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      logWarning(`Skipping: No vote number or TIN number`);
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
    const result = await fetchInstitutionData(institution);
    results.push(result);

    // Update statistics
    if (result.success) {
      stats.successful++;
      stats.totalEmployees += result.employeeCount || 0;
    } else {
      stats.failed++;
    }
    stats.totalDuration += result.duration || 0;

    // Pause between institutions (except for the last one)
    if (i < institutions.length - 1) {
      const pauseSeconds = CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000;
      logInfo(`Pausing ${pauseSeconds}s before next institution...\n`);
      await sleep(CONFIG.PAUSE_BETWEEN_INSTITUTIONS);
    }
  }

  const totalScriptDuration = Date.now() - scriptStartTime;

  // Print final summary
  console.log('\n' + '='.repeat(80));
  console.log('  📊 FETCH SUMMARY');
  console.log('='.repeat(80));
  console.log(`Completed at: ${getCurrentTimestamp()}`);
  console.log(`Total duration: ${formatDuration(totalScriptDuration)}`);
  console.log();
  console.log(`Total institutions: ${stats.total}`);
  console.log(`✅ Successfully fetched: ${stats.successful}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏭️  Skipped (no identifier): ${stats.skipped}`);
  console.log(`👥 Total employees fetched: ${stats.totalEmployees}`);
  console.log(
    `⏱️  Average fetch time: ${formatDuration((stats.totalDuration / Math.max(stats.successful + stats.failed, 1)) * 1000)}`
  );
  console.log('='.repeat(80));

  // Print successful fetches
  if (stats.successful > 0) {
    console.log('\n✅ Successful Fetches:');
    console.log('-'.repeat(80));
    results
      .filter((r) => r.success)
      .sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0))
      .forEach((r, i) => {
        console.log(
          `${String(i + 1).padStart(3)}. ${r.institutionName.padEnd(50)} ` +
            `${String(r.employeeCount).padStart(6)} employees ` +
            `(${r.identifierType}: ${r.identifier}) ` +
            `[${formatDuration((r.duration || 0) * 1000)}]`
        );
      });
  }

  // Print failed fetches
  if (stats.failed > 0) {
    console.log('\n❌ Failed Fetches:');
    console.log('-'.repeat(80));
    results
      .filter((r) => !r.success)
      .forEach((r, i) => {
        const retryInfo = r.retryCount ? ` (${r.retryCount} retries)` : '';
        console.log(
          `${String(i + 1).padStart(3)}. ${r.institutionName} - ${r.error}${retryInfo}`
        );
      });
  }

  // Get final employee count from database
  const finalCount = await prisma.employee.count();
  console.log('\n' + '='.repeat(80));
  console.log(`📊 Total Employees in Database: ${finalCount.toLocaleString()}`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

// Execute main function with error handling
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
