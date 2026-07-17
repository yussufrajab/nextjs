import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { execFileSync } from 'child_process';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Authentication
// The fetch-by-institution endpoint is protected by withAuth (Admin/HHRMD) and
// requires a valid `session` cookie AND a matching `csrf-token` (double-submit
// CSRF). We log in as an admin, read the MFA OTP directly from the DB, verify
// it, then capture the session + CSRF cookies for every subsequent request.
// ---------------------------------------------------------------------------
const AUTH = {
  BASE_URL: process.env.HRIMS_FETCH_BASE_URL || 'http://localhost:9002',
  // Credentials MUST be supplied via environment variables — never committed.
  USERNAME: process.env.HRIMS_FETCH_USER || '',
  PASSWORD: process.env.HRIMS_FETCH_PASSWORD || '',
  // DB connection used only to read the freshly-minted OTP (same trick the
  // security test scripts use). Falls back to the standard PG* env if set.
  DB_HOST: process.env.PGHOST || 'localhost',
  DB_PORT: process.env.PGPORT || '5432',
  DB_USER: process.env.PGUSER || 'postgres',
  DB_NAME: process.env.PGDATABASE || 'nody',
  DB_PASSWORD: process.env.PGPASSWORD || '',
};

interface CookieJar {
  [name: string]: string;
}

/**
 * Store a single "name=value" Set-Cookie pair in the jar. Honours the leading
 * name=value and ignores attributes (Path, HttpOnly, Expires, ...).
 */
function storeCookie(jar: CookieJar, setCookie: string): void {
  const sep = setCookie.indexOf('=');
  if (sep === -1) return;
  const name = setCookie.substring(0, sep).trim();
  // value ends at the first ';' (attribute separator)
  const afterEq = setCookie.substring(sep + 1);
  const value = afterEq.split(';')[0].trim();
  if (name) jar[name] = value;
}

/**
 * Absorb every Set-Cookie header from an axios response into the jar.
 */
function absorbCookies(jar: CookieJar, setCookieHeaders: string | string[] | undefined): void {
  if (!setCookieHeaders) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const c of list) storeCookie(jar, c);
}

/**
 * Serialize the jar into a Cookie request header.
 */
function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Read the most recent unused OTP for a user straight from the MfaToken table.
 */
function readOtpFromDb(userId: string): string {
  const sql = `SELECT token FROM "MfaToken" WHERE "userId" = '${userId}' AND "tokenType" = 'OTP' AND "usedAt" IS NULL AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1;`;
  const out = execFileSync('psql', [
    '-h', AUTH.DB_HOST,
    '-p', String(AUTH.DB_PORT),
    '-U', AUTH.DB_USER,
    '-d', AUTH.DB_NAME,
    '-t', '-A',
    '-c', sql,
  ], {
    env: { ...process.env, PGPASSWORD: AUTH.DB_PASSWORD },
    encoding: 'utf8',
  }).trim();
  return out;
}

/**
 * Perform the full login: mint a pre-login CSRF token, log in (MFA required
 * because the admin has an email), read the OTP from the DB, verify it, and
 * return a cookie jar holding the session + csrf-token cookies.
 */
async function login(): Promise<CookieJar> {
  const jar: CookieJar = {};

  // 1. Pre-login CSRF token (unauthenticated GET, sets csrf-token cookie).
  const csrfRes = await axios.get(`${AUTH.BASE_URL}/api/auth/csrf-token`, {
    validateStatus: () => true,
  });
  absorbCookies(jar, csrfRes.headers['set-cookie']);
  const preCsrf = jar['csrf-token'];
  if (!preCsrf) {
    throw new Error('Failed to obtain pre-login CSRF token');
  }

  // 2. Login → returns userId + MFA_REQUIRED (admin has an email on file).
  const loginRes = await axios.post(
    `${AUTH.BASE_URL}/api/auth/login`,
    { username: AUTH.USERNAME, password: AUTH.PASSWORD },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': preCsrf,
        Cookie: cookieHeader(jar),
      },
      validateStatus: () => true,
    }
  );
  absorbCookies(jar, loginRes.headers['set-cookie']);

  const loginData = loginRes.data as { success?: boolean; code?: string; data?: { userId?: string } };
  if (!loginData.success || loginData.code !== 'MFA_REQUIRED' || !loginData.data?.userId) {
    throw new Error(
      `Login did not reach MFA stage: ${JSON.stringify(loginData).slice(0, 200)}`
    );
  }
  const userId = loginData.data.userId;
  logInfo(`Logged in as ${AUTH.USERNAME} (userId=${userId}), MFA required`);

  // 3. Read the OTP the server emailed (we read it from the DB directly).
  const otp = readOtpFromDb(userId);
  if (!otp) {
    throw new Error('No valid OTP found in MfaToken table for this user');
  }
  logInfo(`Retrieved OTP from DB (length=${otp.length})`);

  // 4. Verify OTP → completeLogin sets the session + per-session csrf-token.
  const otpRes = await axios.post(
    `${AUTH.BASE_URL}/api/auth/mfa/verify-otp`,
    { userId, otpCode: otp },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': preCsrf,
        Cookie: cookieHeader(jar),
      },
      validateStatus: () => true,
    }
  );
  absorbCookies(jar, otpRes.headers['set-cookie']);

  // completeLogin sets the session under either `session` (dev) or
  // `__Host-session` (prod), depending on NODE_ENV. Normalise to `session`
  // so downstream code only needs to know one name.
  const prodSession = jar['__Host-session'];
  if (prodSession && !jar['session']) {
    jar['session'] = prodSession;
  }

  const otpData = otpRes.data as { success?: boolean; message?: string };
  if (!otpData.success || !jar['session'] || !jar['csrf-token']) {
    throw new Error(
      `OTP verification failed: ${JSON.stringify(otpData).slice(0, 200)}`
    );
  }
  logSuccess(`MFA verified — session cookie acquired`);
  return jar;
}

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
  jar: CookieJar,
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

  // Per-session CSRF token lives in the jar's csrf-token cookie. Send it both
  // as the double-submit cookie and as the x-csrf-token header.
  const csrf = jar['csrf-token'];
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(jar),
  };
  if (csrf) authHeaders['x-csrf-token'] = csrf;

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
        headers: authHeaders,
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

  // Authenticate before touching the protected endpoint.
  logInfo('Authenticating as admin (MFA via DB-read OTP)...');
  const jar = await login();
  logInfo('Authentication complete — proceeding with fetch\n');

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
    const result = await fetchInstitutionData(institution, jar);
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
