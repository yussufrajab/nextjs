import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // API Configuration
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  STATUS_URL_BASE: 'http://localhost:9002/api/hrims/sync-status',
  TIMEOUT: 3600000, // 60 minutes per institution (allows for large institutions)

  // Pagination Configuration
  PAGE_SIZE: 100, // Number of records per page

  // Retry Configuration
  MAX_RETRIES: 3, // Number of retries for failed institutions
  RETRY_DELAY: 30000, // 30 seconds wait before retry
  NETWORK_RETRY_DELAY: 60000, // 60 seconds wait for network errors

  // Job Polling Configuration
  JOB_POLL_INTERVAL: 5000, // 5 seconds between status checks
  JOB_TIMEOUT: 3600000, // 60 minutes max wait for a job

  // Flow Control
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds between institutions
  PAUSE_AFTER_ERROR: 30000, // 30 seconds pause after an error

  // State Management
  STATE_DIR: './scripts/state',
  STATE_FILE: 'fetch-progress.json',

  // Logging
  LOG_DIR: './logs',
  LOG_FILE_PREFIX: 'resumable-fetch',
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
  retryCount?: number;
}

interface FetchProgressState {
  startedAt: string;
  lastUpdatedAt: string;
  totalInstitutions: number;
  completedInstitutions: InstitutionFetchState[];
  currentInstitutionIndex: number;
  isComplete: boolean;
  totalEmployeesFetched: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
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
  duration?: number;
  retryAttempt?: number;
  pagesFetched?: number;
}

// ============================================================================
// STATE MANAGEMENT FUNCTIONS
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
  // Ensure state directory exists
  if (!fs.existsSync(CONFIG.STATE_DIR)) {
    fs.mkdirSync(CONFIG.STATE_DIR, { recursive: true });
  }

  state.lastUpdatedAt = new Date().toISOString();
  const statePath = getStatePath();

  // Write to temp file first, then rename (atomic write)
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
    currentInstitutionIndex: 0,
    isComplete: false,
    totalEmployeesFetched: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
  };
}

function isInstitutionCompleted(
  state: FetchProgressState,
  institutionId: string
): boolean {
  return state.completedInstitutions.some(
    (inst) =>
      inst.institutionId === institutionId && inst.status === 'completed'
  );
}

function markInstitutionCompleted(
  state: FetchProgressState,
  result: FetchResult
): void {
  // Remove any existing entry for this institution
  state.completedInstitutions = state.completedInstitutions.filter(
    (inst) => inst.institutionId !== result.institutionId
  );

  let status: 'completed' | 'failed' | 'skipped';
  if (result.success) {
    status = 'completed';
    state.successCount++;
    state.totalEmployeesFetched += result.employeeCount || 0;
  } else if (
    result.error === 'No identifier available' ||
    result.error === 'No vote number or TIN number available'
  ) {
    status = 'skipped';
    state.skippedCount++;
  } else {
    status = 'failed';
    state.failureCount++;
  }

  state.completedInstitutions.push({
    institutionId: result.institutionId,
    institutionName: result.institutionName,
    status,
    employeeCount: result.employeeCount,
    error: result.error,
    completedAt: new Date().toISOString(),
    retryCount: result.retryAttempt,
  });

  state.currentInstitutionIndex++;
  saveState(state);
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

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

let logFile: fs.WriteStream | null = null;

function logInfo(message: string): void {
  const logMessage = `[${getCurrentTimestamp()}] INFO: ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logSuccess(message: string): void {
  const logMessage = `[${getCurrentTimestamp()}] SUCCESS: ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logError(message: string): void {
  const logMessage = `[${getCurrentTimestamp()}] ERROR: ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logWarning(message: string): void {
  const logMessage = `[${getCurrentTimestamp()}] WARNING: ${message}`;
  console.log(logMessage);
  if (logFile) {
    logFile.write(logMessage + '\n');
  }
}

function logDivider(char = '=', length = 80): void {
  const divider = char.repeat(length);
  console.log(divider);
  if (logFile) {
    logFile.write(divider + '\n');
  }
}

// ============================================================================
// NETWORK ERROR DETECTION
// ============================================================================

function isNetworkError(error: string): boolean {
  const networkErrorPatterns = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'timeout',
    'network',
    'No response',
    'socket hang up',
    'Connection refused',
    'EHOSTUNREACH',
  ];

  return networkErrorPatterns.some((pattern) =>
    error.toLowerCase().includes(pattern.toLowerCase())
  );
}

// ============================================================================
// JOB STATUS POLLING
// ============================================================================

interface JobStatusResponse {
  success: boolean;
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: {
    phase?: 'fetching' | 'saving';
    message?: string;
    currentPage?: number;
    totalFetched?: number;
    saved?: number;
    skipped?: number;
    progressPercent?: number;
  };
  result?: {
    employeeCount?: number;
    skippedCount?: number;
    pagesFetched?: number;
    totalFetched?: number;
  };
  failedReason?: string;
}

async function waitForJobCompletionViaSSE(
  jobId: string,
  institutionName: string
): Promise<{ success: boolean; employeeCount?: number; skippedCount?: number; pagesFetched?: number; error?: string }> {
  const startTime = Date.now();
  let lastLoggedProgress = '';
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;

  // Use simple polling with the JSON endpoint
  while (Date.now() - startTime < CONFIG.JOB_TIMEOUT) {
    try {
      const statusResponse = await axios.get(
        `http://localhost:9002/api/hrims/job-status/${jobId}`,
        {
          timeout: 30000,
          validateStatus: (status) => status < 500,
        }
      );

      if (statusResponse.status === 200 && statusResponse.data?.success) {
        const jobStatus = statusResponse.data as JobStatusResponse;
        consecutiveErrors = 0; // Reset error counter on success

        // Log progress if changed
        if (jobStatus.progress?.message && jobStatus.progress.message !== lastLoggedProgress) {
          const pct = jobStatus.progress.progressPercent
            ? ` (${Math.round(jobStatus.progress.progressPercent)}%)`
            : '';
          logInfo(`  ${jobStatus.progress.message}${pct}`);
          lastLoggedProgress = jobStatus.progress.message;
        }

        if (jobStatus.state === 'completed') {
          return {
            success: true,
            employeeCount: jobStatus.result?.employeeCount || 0,
            skippedCount: jobStatus.result?.skippedCount || 0,
            pagesFetched: jobStatus.result?.pagesFetched || 0,
          };
        }

        if (jobStatus.state === 'failed') {
          return {
            success: false,
            error: jobStatus.failedReason || 'Job failed',
          };
        }

        // Job still running (waiting, active, delayed), wait before next poll
        await sleep(CONFIG.JOB_POLL_INTERVAL);
      } else if (statusResponse.status === 404) {
        // Job not found - might have been cleaned up or not started yet
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return {
            success: false,
            error: 'Job not found after multiple attempts',
          };
        }
        await sleep(CONFIG.JOB_POLL_INTERVAL);
      } else {
        // Other error
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return {
            success: false,
            error: `Failed to get job status: HTTP ${statusResponse.status}`,
          };
        }
        await sleep(CONFIG.JOB_POLL_INTERVAL);
      }
    } catch (error) {
      consecutiveErrors++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      if (isNetworkError(errorMsg)) {
        logWarning(`  Network error polling job status: ${errorMsg}`);
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return {
            success: false,
            error: `Network error polling job status: ${errorMsg}`,
          };
        }
        // Wait longer for network errors
        await sleep(CONFIG.JOB_POLL_INTERVAL * 2);
      } else {
        if (consecutiveErrors >= maxConsecutiveErrors) {
          return {
            success: false,
            error: `Error polling job status: ${errorMsg}`,
          };
        }
        await sleep(CONFIG.JOB_POLL_INTERVAL);
      }
    }
  }

  return {
    success: false,
    error: `Job timeout after ${CONFIG.JOB_TIMEOUT / 60000} minutes`,
  };
}

// ============================================================================
// FETCH FUNCTION WITH ENHANCED RETRY
// ============================================================================

async function fetchInstitutionData(
  institution: Institution,
  retryAttempt = 0
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

  const retryText =
    retryAttempt > 0 ? ` (Retry ${retryAttempt}/${CONFIG.MAX_RETRIES})` : '';
  logInfo(`Fetching: ${institution.name}${retryText}`);
  logInfo(`  Using ${identifierType}: ${identifier}`);
  logInfo(`  Page size: ${CONFIG.PAGE_SIZE}`);

  try {
    // Step 1: Queue the background job
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
        timeout: 60000, // 60 seconds to queue the job
        validateStatus: (status) => status < 500,
      }
    );

    if (response.status !== 200 || !response.data.success) {
      const errorMsg = response.data?.message || `HTTP ${response.status}`;
      logError(`${institution.name}: Failed to queue job - ${errorMsg}`);

      // Retry
      if (retryAttempt < CONFIG.MAX_RETRIES) {
        logInfo(`  Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`);
        await sleep(CONFIG.RETRY_DELAY);
        return fetchInstitutionData(institution, retryAttempt + 1);
      }

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: errorMsg,
        duration: Math.floor((Date.now() - startTime) / 1000),
        retryAttempt,
      };
    }

    const jobId = response.data.jobId;
    if (!jobId) {
      logError(`${institution.name}: No job ID returned`);
      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: 'No job ID returned from API',
        duration: Math.floor((Date.now() - startTime) / 1000),
        retryAttempt,
      };
    }

    logInfo(`  Job queued: ${jobId}`);
    logInfo(`  Waiting for job completion...`);

    // Step 2: Wait for job to complete via SSE
    const jobResult = await waitForJobCompletionViaSSE(jobId, institution.name);
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (jobResult.success) {
      logSuccess(
        `${institution.name}: Fetched ${jobResult.employeeCount || 0} employees ` +
          `(${jobResult.pagesFetched || 0} pages, ${jobResult.skippedCount || 0} skipped, ${formatDuration(durationSeconds)})`
      );

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: true,
        employeeCount: jobResult.employeeCount || 0,
        skippedCount: jobResult.skippedCount || 0,
        duration: durationSeconds,
        retryAttempt,
        pagesFetched: jobResult.pagesFetched || 0,
      };
    } else {
      logError(`${institution.name}: ${jobResult.error}`);

      // Retry on certain errors
      if (retryAttempt < CONFIG.MAX_RETRIES && isNetworkError(jobResult.error || '')) {
        logWarning(`  Network error detected. Waiting ${CONFIG.NETWORK_RETRY_DELAY / 1000}s before retry...`);
        await sleep(CONFIG.NETWORK_RETRY_DELAY);
        return fetchInstitutionData(institution, retryAttempt + 1);
      }

      if (retryAttempt < CONFIG.MAX_RETRIES && jobResult.error?.includes('timeout')) {
        logInfo(`  Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`);
        await sleep(CONFIG.RETRY_DELAY);
        return fetchInstitutionData(institution, retryAttempt + 1);
      }

      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: jobResult.error || 'Unknown error',
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
        errorMessage =
          error.response.data?.message ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = `No response from server (${error.code || 'unknown'})`;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logError(`${institution.name}: ${errorMessage}`);

    // Retry on network errors with longer delay
    if (retryAttempt < CONFIG.MAX_RETRIES && isNetworkError(errorMessage)) {
      const retryDelay = CONFIG.NETWORK_RETRY_DELAY;
      logWarning(
        `  Network error detected. Waiting ${retryDelay / 1000}s before retry...`
      );
      await sleep(retryDelay);
      return fetchInstitutionData(institution, retryAttempt + 1);
    }

    // Retry on other errors with normal delay
    if (retryAttempt < CONFIG.MAX_RETRIES) {
      logInfo(`  Waiting ${CONFIG.RETRY_DELAY / 1000}s before retry...`);
      await sleep(CONFIG.RETRY_DELAY);
      return fetchInstitutionData(institution, retryAttempt + 1);
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const forceRestart = args.includes('--force-restart');
  const showStatus = args.includes('--status');

  // Handle --reset flag
  if (shouldReset) {
    resetState();
    process.exit(0);
  }

  // Handle --status flag
  if (showStatus) {
    const existingState = loadState();
    if (existingState) {
      console.log('\n=== CURRENT FETCH PROGRESS ===');
      console.log(`Started at: ${existingState.startedAt}`);
      console.log(`Last updated: ${existingState.lastUpdatedAt}`);
      console.log(`Total institutions: ${existingState.totalInstitutions}`);
      console.log(
        `Progress: ${existingState.currentInstitutionIndex}/${existingState.totalInstitutions}`
      );
      console.log(`Successful: ${existingState.successCount}`);
      console.log(`Failed: ${existingState.failureCount}`);
      console.log(`Skipped: ${existingState.skippedCount}`);
      console.log(
        `Total employees fetched: ${existingState.totalEmployeesFetched}`
      );
      console.log(`Complete: ${existingState.isComplete}`);
      console.log('==============================\n');
    } else {
      console.log('\nNo previous state found. Start fresh with: npx tsx scripts/fetch-all-employees-resumable.ts\n');
    }
    process.exit(0);
  }

  // Create log directory if it doesn't exist
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }

  // Create log file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logFileName = `${CONFIG.LOG_FILE_PREFIX}-${timestamp}.log`;
  const logFilePath = path.join(CONFIG.LOG_DIR, logFileName);
  logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

  console.log('\n');
  logDivider('=');
  logInfo('HRIMS RESUMABLE FETCH SCRIPT - ALL INSTITUTIONS');
  logDivider('=');
  logInfo(`Started at: ${getCurrentTimestamp()}`);
  logInfo(`Log file: ${logFilePath}`);
  logInfo('');
  logInfo('CONFIGURATION:');
  logInfo(`  - Timeout per institution: ${CONFIG.TIMEOUT / 60000} minutes`);
  logInfo(`  - Page size: ${CONFIG.PAGE_SIZE}`);
  logInfo(`  - Max retries: ${CONFIG.MAX_RETRIES}`);
  logInfo(`  - Pause between institutions: ${CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000}s`);
  logInfo(`  - State file: ${getStatePath()}`);
  logDivider('=');
  logInfo('');

  const scriptStartTime = Date.now();

  // Fetch all institutions from API
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
    logError(`Failed to load institutions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }

  if (institutions.length === 0) {
    logError('No institutions found');
    process.exit(1);
  }

  logInfo(`Found ${institutions.length} institutions\n`);

  // Load or initialize state
  let state = loadState();
  const isResuming = state !== null && !state.isComplete && !forceRestart;

  if (isResuming && state) {
    logWarning('RESUMING FROM PREVIOUS RUN');
    logInfo(`  Previous progress: ${state.currentInstitutionIndex}/${state.totalInstitutions}`);
    logInfo(`  Successful: ${state.successCount}`);
    logInfo(`  Failed: ${state.failureCount}`);
    logInfo(`  Skipped: ${state.skippedCount}`);
    logInfo(`  Employees fetched: ${state.totalEmployeesFetched}`);
    logDivider('-');
    logInfo('');
  } else {
    if (forceRestart) {
      logWarning('FORCE RESTART: Starting fresh (ignoring previous state)');
    }
    state = initializeState(institutions.length);
    saveState(state);
  }

  // Process each institution
  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    const progress = `[${i + 1}/${institutions.length}]`;

    // Check if already completed (for resume)
    if (isInstitutionCompleted(state, institution.id)) {
      logInfo(`${progress} SKIPPING (already completed): ${institution.name}`);
      continue;
    }

    console.log('');
    logDivider('-', 70);
    logInfo(`${progress} INSTITUTION: ${institution.name}`);
    logDivider('-', 70);

    // Check if institution has any identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      logWarning(`Skipping: No vote number or TIN number`);
      const result: FetchResult = {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier: 'N/A',
        identifierType: 'votecode',
        success: false,
        error: 'No identifier available',
        duration: 0,
      };
      markInstitutionCompleted(state, result);
      continue;
    }

    // Fetch data for this institution
    const result = await fetchInstitutionData(institution);
    markInstitutionCompleted(state, result);

    // Show running progress
    const progressPct = (((i + 1) / institutions.length) * 100).toFixed(1);
    logInfo(
      `Progress: ${i + 1}/${institutions.length} (${progressPct}%) | ` +
        `SUCCESS: ${state.successCount} | FAILED: ${state.failureCount} | SKIPPED: ${state.skippedCount}`
    );

    // Pause between institutions (except for the last one)
    if (i < institutions.length - 1) {
      const pauseSeconds = CONFIG.PAUSE_BETWEEN_INSTITUTIONS / 1000;
      logInfo(`Pausing ${pauseSeconds}s before next institution...\n`);
      await sleep(CONFIG.PAUSE_BETWEEN_INSTITUTIONS);
    }
  }

  // Mark state as complete
  state.isComplete = true;
  saveState(state);

  const totalScriptDuration = Math.floor((Date.now() - scriptStartTime) / 1000);

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n');
  logDivider('=');
  logInfo('FINAL SUMMARY');
  logDivider('=');
  logInfo(`Completed at: ${getCurrentTimestamp()}`);
  logInfo(`Total duration: ${formatDuration(totalScriptDuration)}`);
  logInfo('');
  logInfo(`Total institutions: ${state.totalInstitutions}`);
  logInfo(`Successfully fetched: ${state.successCount}`);
  logInfo(`Failed: ${state.failureCount}`);
  logInfo(`Skipped (no identifier): ${state.skippedCount}`);
  logInfo(`Total employees fetched: ${state.totalEmployeesFetched.toLocaleString()}`);
  logDivider('=');

  // Print successful fetches
  if (state.successCount > 0) {
    console.log('');
    logInfo('SUCCESSFUL FETCHES:');
    logDivider('-');

    const successfulResults = state.completedInstitutions
      .filter((r) => r.status === 'completed')
      .sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0));

    successfulResults.forEach((r, i) => {
      logInfo(
        `${String(i + 1).padStart(3)}. ${r.institutionName.padEnd(50)} | ${String(r.employeeCount || 0).padStart(6)} employees`
      );
    });
  }

  // Print failed fetches
  if (state.failureCount > 0) {
    console.log('');
    logInfo('FAILED FETCHES:');
    logDivider('-');

    const failedResults = state.completedInstitutions.filter(
      (r) => r.status === 'failed'
    );

    failedResults.forEach((r, i) => {
      const retryInfo =
        r.retryCount && r.retryCount > 0 ? ` (${r.retryCount} retries)` : '';
      logInfo(`${String(i + 1).padStart(3)}. ${r.institutionName}`);
      logInfo(`     Error: ${r.error}${retryInfo}`);
    });
  }

  // Print skipped institutions
  if (state.skippedCount > 0) {
    console.log('');
    logInfo('SKIPPED INSTITUTIONS (No identifier):');
    logDivider('-');

    const skippedResults = state.completedInstitutions.filter(
      (r) => r.status === 'skipped'
    );

    skippedResults.forEach((r, i) => {
      logInfo(`${String(i + 1).padStart(3)}. ${r.institutionName}`);
    });
  }

  // Summary statistics from state
  console.log('');
  logDivider('=');
  logInfo('FETCH STATISTICS');
  logDivider('=');
  logInfo(`Total institutions processed: ${state.totalInstitutions}`);
  logInfo(`Total employees fetched this run: ${state.totalEmployeesFetched.toLocaleString()}`);
  logDivider('=');

  console.log('');
  logInfo(`Full log saved to: ${logFilePath}`);
  logInfo(`State file: ${getStatePath()}`);
  logInfo('');
  logDivider('=');
  logInfo('Script completed successfully!');
  logDivider('=');
  console.log('');

  if (logFile) {
    logFile.end();
  }
}

// ============================================================================
// ERROR HANDLING & EXECUTION
// ============================================================================

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT (Ctrl+C). Progress has been saved.');
  console.log('You can resume by running the script again.');
  console.log('To start fresh, use: npx tsx scripts/fetch-all-employees-resumable.ts --reset\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nReceived SIGTERM. Progress has been saved.');
  console.log('You can resume by running the script again.\n');
  process.exit(0);
});

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
HRIMS Resumable Fetch Script
============================

This script fetches employee data from HRIMS for all institutions.
It saves progress to a state file, so it can resume if interrupted.

Usage:
  npx tsx scripts/fetch-all-employees-resumable.ts [OPTIONS]

Options:
  --help, -h        Show this help message
  --status          Show current fetch progress without running
  --reset           Reset state file and start fresh
  --force-restart   Ignore previous state and start fresh (keeps state file)

Examples:
  # Start or resume fetch
  npx tsx scripts/fetch-all-employees-resumable.ts

  # Check current progress
  npx tsx scripts/fetch-all-employees-resumable.ts --status

  # Reset and start fresh
  npx tsx scripts/fetch-all-employees-resumable.ts --reset
  npx tsx scripts/fetch-all-employees-resumable.ts

  # Run in background (Linux/macOS)
  nohup npx tsx scripts/fetch-all-employees-resumable.ts > fetch.log 2>&1 &

Notes:
  - Press Ctrl+C to safely interrupt. Progress will be saved.
  - The script will automatically resume from the last completed institution.
  - State file location: ${getStatePath()}
`);
  process.exit(0);
}

main()
  .catch((error) => {
    console.error('\n' + '='.repeat(80));
    console.error('FATAL ERROR:');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80));
    console.error('\nProgress has been saved. You can resume by running the script again.\n');
    process.exit(1);
  });
