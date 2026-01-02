import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  TIMEOUT: 3600000, // 60 minutes
  PAGE_SIZE: 50, // Smaller page size for problematic institutions
  MAX_RETRIES: 3,
  RETRY_DELAY: 60000, // 1 minute between retries
  PAUSE_BETWEEN_INSTITUTIONS: 30000, // 30 seconds
  LOG_DIR: './logs',
};

// ============================================================================
// INSTITUTIONS TO RETRY
// ============================================================================
// Add institution IDs or vote numbers of failed institutions here
const FAILED_INSTITUTIONS = [
  { voteNumber: '025', name: 'Hospitali ya Mnazi Mmoja' },
  { voteNumber: '008', name: 'WIZARA YA AFYA' },
  { voteNumber: '011', name: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
  { voteNumber: '012', name: 'WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO' },
];

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
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(message: string, logFile?: fs.WriteStream): void {
  const logMessage = `[${getCurrentTimestamp()}] ${message}`;
  console.log(logMessage);
  if (logFile) logFile.write(logMessage + '\n');
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

async function fetchInstitution(
  institution: any,
  retryAttempt = 0,
  logFile?: fs.WriteStream
): Promise<any> {
  const startTime = Date.now();
  const retryText = retryAttempt > 0 ? ` (Retry ${retryAttempt}/${CONFIG.MAX_RETRIES})` : '';

  log(`\n${'='.repeat(70)}`, logFile);
  log(`Fetching: ${institution.name}${retryText}`, logFile);
  log(`Vote Number: ${institution.voteNumber}`, logFile);
  log(`Page Size: ${CONFIG.PAGE_SIZE}`, logFile);
  log(`${'='.repeat(70)}`, logFile);

  try {
    const response = await axios.post(
      CONFIG.API_URL,
      {
        identifierType: 'votecode',
        voteNumber: institution.voteNumber,
        institutionId: institution.id,
        pageSize: CONFIG.PAGE_SIZE,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: CONFIG.TIMEOUT,
        validateStatus: (status) => status < 500,
      }
    );

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (response.status === 200 && response.data.success) {
      const data = response.data.data;
      log(`✅ SUCCESS: Fetched ${data.employeeCount} employees in ${formatDuration(duration)}`, logFile);
      log(`   Pages: ${data.pagesFetched}, Skipped: ${data.skippedCount}`, logFile);
      return { success: true, institution, data, duration };
    } else {
      const error = response.data?.message || `HTTP ${response.status}`;
      log(`❌ FAILED: ${error}`, logFile);

      // Retry if possible
      if (retryAttempt < CONFIG.MAX_RETRIES) {
        log(`⏳ Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`, logFile);
        await sleep(CONFIG.RETRY_DELAY);
        return fetchInstitution(institution, retryAttempt + 1, logFile);
      }

      return { success: false, institution, error, duration };
    }
  } catch (error: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = `Timeout after ${CONFIG.TIMEOUT / 60000} minutes`;
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = error.message;
    }

    log(`❌ ERROR: ${errorMessage}`, logFile);

    // Retry on timeout or network errors
    if (retryAttempt < CONFIG.MAX_RETRIES) {
      log(`⏳ Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`, logFile);
      await sleep(CONFIG.RETRY_DELAY);
      return fetchInstitution(institution, retryAttempt + 1, logFile);
    }

    return { success: false, institution, error: errorMessage, duration };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Create logs directory
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }

  // Create log file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logFilePath = path.join(CONFIG.LOG_DIR, `fetch-failed-retry-${timestamp}.log`);
  const logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

  log('\n' + '='.repeat(80), logFile);
  log('🔄 RETRY FAILED INSTITUTIONS SCRIPT', logFile);
  log('='.repeat(80), logFile);
  log(`Started: ${getCurrentTimestamp()}`, logFile);
  log(`Log: ${logFilePath}`, logFile);
  log(`Page Size: ${CONFIG.PAGE_SIZE} (smaller for large institutions)`, logFile);
  log(`Max Retries: ${CONFIG.MAX_RETRIES}`, logFile);
  log('='.repeat(80) + '\n', logFile);

  const results: any[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Process each failed institution
  for (let i = 0; i < FAILED_INSTITUTIONS.length; i++) {
    const failedInst = FAILED_INSTITUTIONS[i];

    log(`\n[${i + 1}/${FAILED_INSTITUTIONS.length}] Processing: ${failedInst.name}`, logFile);

    // Find institution in database
    const institution = await prisma.institution.findFirst({
      where: { voteNumber: failedInst.voteNumber }
    });

    if (!institution) {
      log(`⚠️  Institution not found in database: ${failedInst.name}`, logFile);
      continue;
    }

    // Fetch
    const result = await fetchInstitution(institution, 0, logFile);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Pause before next institution
    if (i < FAILED_INSTITUTIONS.length - 1) {
      log(`\n⏳ Pausing ${CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000}s...`, logFile);
      await sleep(CONFIG.PAUSE_BETWEEN_INSTITUTIONS);
    }
  }

  // Final Summary
  log('\n' + '='.repeat(80), logFile);
  log('📊 RETRY SUMMARY', logFile);
  log('='.repeat(80), logFile);
  log(`Completed: ${getCurrentTimestamp()}`, logFile);
  log(`\nTotal attempted: ${FAILED_INSTITUTIONS.length}`, logFile);
  log(`✅ Successful: ${successCount}`, logFile);
  log(`❌ Still failed: ${failureCount}`, logFile);
  log('='.repeat(80), logFile);

  // Detailed results
  if (successCount > 0) {
    log('\n✅ Successfully Retried:', logFile);
    results.filter(r => r.success).forEach((r, i) => {
      log(`${i + 1}. ${r.institution.name} - ${r.data.employeeCount} employees`, logFile);
    });
  }

  if (failureCount > 0) {
    log('\n❌ Still Failed:', logFile);
    results.filter(r => !r.success).forEach((r, i) => {
      log(`${i + 1}. ${r.institution.name} - ${r.error}`, logFile);
    });
    log('\n💡 Suggestions for still-failed institutions:', logFile);
    log('   - Try smaller page size (e.g., PAGE_SIZE: 25)', logFile);
    log('   - Increase timeout (e.g., TIMEOUT: 7200000)', logFile);
    log('   - Check HRIMS system status', logFile);
    log('   - Contact HRIMS administrator', logFile);
  }

  log('\n' + '='.repeat(80) + '\n', logFile);

  logFile.end();
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
