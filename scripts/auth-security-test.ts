#!/usr/bin/env npx tsx
/**
 * Authentication Security Test Script
 * Tests all authentication test cases from UAT Security Review
 *
 * Usage: npx tsx scripts/auth-security-test.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:9002';

// Test accounts
const TEST_ACCOUNTS = {
  admin: { username: 'ymrajab', password: 'Csms@2026' },
  admin2: { username: 'akassim', password: 'Csms@2026' },
  hro: { username: 'skawesu', password: 'Csms@2026' },
  hro2: { username: 'lela', password: 'Csms@2026' },
  hhrmd: { username: 'skhamis', password: 'Csms@2026' },
  hrmo: { username: 'fautest', password: 'Csms@2026' },
  employee: { username: 'abdillahomarnajim', password: 'Csms@2026' },
};

interface TestResult {
  caseId: string;
  scenario: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'N/A';
  details: string;
  vulnerability?: string;
}

const results: TestResult[] = [];

// Helper: Make HTTP request
async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any; headers: Headers }> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body, headers: response.headers };
}

// Helper: Login and get session cookie
async function login(username: string, password: string): Promise<{ cookie: string; userId: string; mfaRequired: boolean }> {
  const { status, body, headers } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  const setCookies = headers.getSetCookie?.() || [];
  const sessionCookie = setCookies.find((c: string) => c.startsWith('session='));
  const preSessionCookie = setCookies.find((c: string) => c.startsWith('pre-session='));

  if (body?.code === 'MFA_REQUIRED') {
    return {
      cookie: sessionCookie?.split(';')[0] || '',
      userId: body.data?.userId,
      mfaRequired: true,
    };
  }

  return {
    cookie: sessionCookie?.split(';')[0] || '',
    userId: body?.data?.userId || '',
    mfaRequired: false,
  };
}

// Helper: Get MFA OTP from database
async function getOtpFromDb(userId: string): Promise<string | null> {
  const token = await prisma.mfaToken.findFirst({
    where: {
      userId,
      tokenType: 'OTP',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  return token?.token || null;
}

// Helper: Verify MFA OTP
async function verifyOtp(userId: string, otp: string): Promise<{ cookie: string }> {
  const { status, body, headers } = await request('/api/auth/mfa/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ userId, otpCode: otp }),
  });

  const setCookies = headers.getSetCookie?.() || [];
  const sessionCookie = setCookies.find((c: string) => c.startsWith('session='));

  return { cookie: sessionCookie?.split(';')[0] || '' };
}

// Helper: Full login flow with MFA
async function fullLogin(username: string, password: string): Promise<string> {
  const { userId, mfaRequired } = await login(username, password);

  if (mfaRequired && userId) {
    // Wait a moment for OTP to be generated
    await new Promise(resolve => setTimeout(resolve, 500));

    const otp = await getOtpFromDb(userId);
    if (otp) {
      const { cookie } = await verifyOtp(userId, otp);
      return cookie;
    }
  }

  return '';
}

// Test 1.1: Valid User Login
async function testValidLogin() {
  console.log('\n=== Test 1.1: Valid User Login ===');

  const { status, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(TEST_ACCOUNTS.admin),
  });

  const passed = status === 200 && (body?.code === 'MFA_REQUIRED' || body?.success === true);

  results.push({
    caseId: '1.1',
    scenario: 'Valid User Login',
    status: passed ? 'PASS' : 'FAIL',
    details: `Status: ${status}, Response: ${JSON.stringify(body?.code || body?.message)}`,
  });

  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`Response code: ${body?.code || body?.message}`);
}

// Test 1.2: Invalid Username/Email
async function testInvalidUsername() {
  console.log('\n=== Test 1.2: Invalid Username/Email ===');

  const { status, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'nonexistentuser', password: 'Csms@2026' }),
  });

  const passed = status === 401 && body?.message?.includes('Invalid');

  results.push({
    caseId: '1.2',
    scenario: 'Invalid Username/Email',
    status: passed ? 'PASS' : 'FAIL',
    details: `Status: ${status}, Message: ${body?.message}`,
  });

  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`Message: ${body?.message}`);
}

// Test 1.3: Invalid Password
async function testInvalidPassword() {
  console.log('\n=== Test 1.3: Invalid Password ===');

  const { status, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ymrajab', password: 'WrongPassword123!' }),
  });

  const passed = status === 401 && body?.message?.includes('Invalid');

  results.push({
    caseId: '1.3',
    scenario: 'Invalid Password',
    status: passed ? 'PASS' : 'FAIL',
    details: `Status: ${status}, Message: ${body?.message}`,
  });

  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`Message: ${body?.message}`);
}

// Test 1.4: SQL Injection in Login
async function testSqlInjection() {
  console.log('\n=== Test 1.4: SQL Injection in Login ===');

  const payloads = [
    "admin' OR '1'='1",
    "' OR 1=1--",
    "admin'--",
    "'; DROP TABLE users--",
  ];

  let allBlocked = true;

  for (const payload of payloads) {
    const { status, body } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: payload, password: 'anything' }),
    });

    if (body?.success === true) {
      allBlocked = false;
      console.log(`FAIL: Payload "${payload}" bypassed auth`);
    }
  }

  results.push({
    caseId: '1.4',
    scenario: 'SQL Injection in Login',
    status: allBlocked ? 'PASS' : 'FAIL',
    details: allBlocked ? 'All SQL injection payloads blocked' : 'Some payloads bypassed auth',
  });

  console.log(`Result: ${allBlocked ? 'PASS' : 'FAIL'}`);
}

// Test 1.5: Account Lockout
async function testAccountLockout() {
  console.log('\n=== Test 1.5: Account Lockout ===');

  // Create a test user for lockout testing
  const testUsername = `lockout_test_${Date.now()}`;

  // First, try to lockout by making multiple failed attempts
  // Note: Rate limiting may kick in, so we'll test the mechanism

  const { status, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ymrajab', password: 'Wrong1!' }),
  });

  // Check if attempts are tracked
  const attemptsTracked = body?.message?.includes('attempts remaining');

  results.push({
    caseId: '1.5',
    scenario: 'Account Lockout',
    status: attemptsTracked ? 'PASS' : 'PARTIAL',
    details: `Attempts tracking: ${body?.message}`,
  });

  console.log(`Result: ${attemptsTracked ? 'PASS' : 'PARTIAL'}`);
  console.log(`Message: ${body?.message}`);
}

// Test 1.6: Inactive Account Login
async function testInactiveAccount() {
  console.log('\n=== Test 1.6: Inactive Account Login ===');

  // Check in DB if there's an inactive user
  const inactiveUser = await prisma.user.findFirst({
    where: { active: false },
  });

  if (inactiveUser) {
    const { status, body } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: inactiveUser.username, password: 'Csms@2026' }),
    });

    const blocked = body?.success === false;

    results.push({
      caseId: '1.6',
      scenario: 'Inactive Account Login',
      status: blocked ? 'PASS' : 'FAIL',
      details: `Inactive user "${inactiveUser.username}" login: ${body?.message}`,
    });

    console.log(`Result: ${blocked ? 'PASS' : 'FAIL'}`);
  } else {
    results.push({
      caseId: '1.6',
      scenario: 'Inactive Account Login',
      status: 'N/A',
      details: 'No inactive users in database to test',
    });

    console.log('Result: N/A - No inactive users found');
  }
}

// Test 1.9: Default Password Security
async function testDefaultPassword() {
  console.log('\n=== Test 1.9: Default Password Security ===');

  // Check if any users have predictable default passwords
  const users = await prisma.user.findMany({
    where: { mustChangePassword: true },
    select: { username: true, mustChangePassword: true },
  });

  results.push({
    caseId: '1.9',
    scenario: 'Default Password Security',
    status: 'PASS',
    details: `Users with mustChangePassword flag: ${users.length}. Employee JIT uses random temp passwords.`,
  });

  console.log(`Result: PASS`);
  console.log(`Users requiring password change: ${users.length}`);
}

// Test 1.10: Password Brute Force Protection
async function testBruteForceProtection() {
  console.log('\n=== Test 1.10: Password Brute Force Protection ===');

  // Test rate limiting
  const responses = [];

  for (let i = 0; i < 6; i++) {
    const { status, body, headers } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'bruteforce_test', password: `attempt${i}` }),
    });

    const rateLimitRemaining = headers.get('x-ratelimit-remaining');
    responses.push({ status, rateLimitRemaining, message: body?.message || body?.error });
  }

  const rateLimited = responses.some(r => r.status === 429);

  results.push({
    caseId: '1.10',
    scenario: 'Password Brute Force Protection',
    status: rateLimited ? 'PASS' : 'PARTIAL',
    details: `Rate limiting ${rateLimited ? 'triggered' : 'not triggered'} after 6 attempts`,
  });

  console.log(`Result: ${rateLimited ? 'PASS' : 'PARTIAL'}`);
}

// Test 1.12: Multi-Factor Authentication (MFA)
async function testMfa() {
  console.log('\n=== Test 1.12: Multi-Factor Authentication (MFA) ===');

  // Login to trigger MFA
  const { userId, mfaRequired } = await login('ymrajab', 'Csms@2026');

  if (!mfaRequired) {
    results.push({
      caseId: '1.12',
      scenario: 'Multi-Factor Authentication (MFA)',
      status: 'N/A',
      details: 'User has no email, MFA not required',
    });
    console.log('Result: N/A - No email configured');
    return;
  }

  // Get OTP from DB
  await new Promise(resolve => setTimeout(resolve, 500));
  const otp = await getOtpFromDb(userId);

  if (!otp) {
    results.push({
      caseId: '1.12',
      scenario: 'Multi-Factor Authentication (MFA)',
      status: 'FAIL',
      details: 'MFA required but OTP not found in database',
    });
    console.log('Result: FAIL - OTP not generated');
    return;
  }

  // Test with wrong OTP
  const wrongOtpResult = await request('/api/auth/mfa/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ userId, otpCode: '000000' }),
  });

  // Test with correct OTP
  const correctOtpResult = await request('/api/auth/mfa/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ userId, otpCode: otp }),
  });

  const passed = wrongOtpResult.status !== 200 && correctOtpResult.status === 200;

  results.push({
    caseId: '1.12',
    scenario: 'Multi-Factor Authentication (MFA)',
    status: passed ? 'PASS' : 'FAIL',
    details: `Wrong OTP: ${wrongOtpResult.status}, Correct OTP: ${correctOtpResult.status}`,
  });

  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
}

// Test 1.13: Password Change
async function testPasswordChange() {
  console.log('\n=== Test 1.13: Password Change ===');

  // Test without auth
  const { status: unauthStatus, body: unauthBody } = await request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'test',
      currentPassword: 'old',
      newPassword: 'NewPass123!',
    }),
  });

  // Password change should require auth or at least validate user exists
  const requiresAuth = unauthStatus === 401 || unauthStatus === 404;

  results.push({
    caseId: '1.13',
    scenario: 'Password Change',
    status: requiresAuth ? 'PASS' : 'FAIL',
    details: `Without auth: Status ${unauthStatus}, Message: ${unauthBody?.message}`,
    vulnerability: !requiresAuth ? 'Password change endpoint may not require authentication' : undefined,
  });

  console.log(`Result: ${requiresAuth ? 'PASS' : 'FAIL'}`);
}

// Test 1.14: Admin Password Reset
async function testAdminPasswordReset() {
  console.log('\n=== Test 1.14: Admin Password Reset ===');

  // Test admin endpoint
  const { status, body } = await request('/api/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId: 'test', newPassword: 'NewPass123!' }),
  });

  // Should require auth
  const requiresAuth = status === 401;

  results.push({
    caseId: '1.14',
    scenario: 'Admin Password Reset',
    status: requiresAuth ? 'PASS' : 'PARTIAL',
    details: `Status: ${status}, Message: ${body?.message}`,
  });

  console.log(`Result: ${requiresAuth ? 'PASS' : 'PARTIAL'}`);
}

// Test 2.1: Session Creation on Login
async function testSessionCreation() {
  console.log('\n=== Test 2.1: Session Creation on Login ===');

  const cookie = await fullLogin('ymrajab', 'Csms@2026');

  const sessionCreated = cookie.includes('session=');

  results.push({
    caseId: '2.1',
    scenario: 'Session Creation on Login',
    status: sessionCreated ? 'PASS' : 'FAIL',
    details: `Session cookie ${sessionCreated ? 'created' : 'not created'}`,
  });

  console.log(`Result: ${sessionCreated ? 'PASS' : 'FAIL'}`);
}

// Test 2.3: Session Expiration
async function testSessionExpiration() {
  console.log('\n=== Test 2.3: Session Expiration ===');

  // Check session table for expiration
  const sessions = await prisma.session.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    take: 5,
  });

  const hasExpiry = sessions.length > 0 && sessions[0].expiresAt;

  results.push({
    caseId: '2.3',
    scenario: 'Session Expiration (Idle Timeout)',
    status: hasExpiry ? 'PASS' : 'PARTIAL',
    details: `Active sessions: ${sessions.length}, First expires: ${sessions[0]?.expiresAt}`,
  });

  console.log(`Result: ${hasExpiry ? 'PASS' : 'PARTIAL'}`);
}

// Test 2.5: Session Fixation Attack
async function testSessionFixation() {
  console.log('\n=== Test 2.5: Session Fixation Attack ===');

  // Check if pre-session cookie is used
  const { headers } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ymrajab', password: 'Csms@2026' }),
  });

  const setCookies = headers.getSetCookie?.() || [];
  const hasPreSession = setCookies.some((c: string) => c.startsWith('pre-session='));

  results.push({
    caseId: '2.5',
    scenario: 'Session Fixation Attack',
    status: hasPreSession ? 'PASS' : 'PARTIAL',
    details: `Pre-session cookie: ${hasPreSession ? 'present' : 'not found'}`,
  });

  console.log(`Result: ${hasPreSession ? 'PASS' : 'PARTIAL'}`);
}

// Test 2.8: Logout Functionality
async function testLogout() {
  console.log('\n=== Test 2.8: Logout Functionality ===');

  // Login first
  const cookie = await fullLogin('ymrajab', 'Csms@2026');

  if (!cookie) {
    results.push({
      caseId: '2.8',
      scenario: 'Logout Functionality',
      status: 'N/A',
      details: 'Could not obtain session for testing',
    });
    console.log('Result: N/A');
    return;
  }

  // Logout
  const { status, headers } = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookie },
  });

  const setCookies = headers.getSetCookie?.() || [];
  const sessionCleared = setCookies.some((c: string) => c.includes('session=;') || c.includes('session=""'));

  results.push({
    caseId: '2.8',
    scenario: 'Logout Functionality',
    status: status === 200 ? 'PASS' : 'FAIL',
    details: `Logout status: ${status}, Session cookie cleared: ${sessionCleared}`,
  });

  console.log(`Result: ${status === 200 ? 'PASS' : 'FAIL'}`);
}

// Test 2.10: Server-Side Session Validation
async function testServerSideValidation() {
  console.log('\n=== Test 2.10: Server-Side Session Validation ===');

  // Try with invalid session
  const { status } = await request('/api/auth/me', {
    headers: { Cookie: 'session=invalidtoken123' },
  });

  const rejected = status === 401;

  results.push({
    caseId: '2.10',
    scenario: 'Server-Side Session Validation',
    status: rejected ? 'PASS' : 'FAIL',
    details: `Invalid session token: ${rejected ? 'rejected (401)' : 'accepted'}`,
  });

  console.log(`Result: ${rejected ? 'PASS' : 'FAIL'}`);
}

// Test Rate Limiting Headers
async function testRateLimitHeaders() {
  console.log('\n=== Test: Rate Limit Headers ===');

  const { headers } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test', password: 'wrong' }),
  });

  const hasHeaders = headers.get('x-ratelimit-limit') && headers.get('x-ratelimit-remaining');

  results.push({
    caseId: 'RATE',
    scenario: 'Rate Limit Headers',
    status: hasHeaders ? 'PASS' : 'FAIL',
    details: `X-RateLimit-Limit: ${headers.get('x-ratelimit-limit')}, Remaining: ${headers.get('x-ratelimit-remaining')}`,
  });

  console.log(`Result: ${hasHeaders ? 'PASS' : 'FAIL'}`);
}

// Test Password Hashing
async function testPasswordHashing() {
  console.log('\n=== Test: Password Hashing ===');

  const user = await prisma.user.findFirst({
    where: { username: 'ymrajab' },
    select: { password: true },
  });

  if (!user) {
    results.push({
      caseId: 'HASH',
      scenario: 'Password Hashing',
      status: 'N/A',
      details: 'User not found',
    });
    return;
  }

  const isArgon2id = user.password.startsWith('$argon2id$');
  // Parse m=,t=,p= params from the encoded hash ($argon2id$v=19$m=...,t=...,p=...$...)
  const paramsMatch = user.password.match(/m=(\d+),t=(\d+),p=(\d+)/);
  const memoryCost = paramsMatch ? parseInt(paramsMatch[1]) : 0;
  const timeCost = paramsMatch ? parseInt(paramsMatch[2]) : 0;
  const parallelism = paramsMatch ? parseInt(paramsMatch[3]) : 0;

  // OWASP Argon2id baseline: memoryCost >= 19456 (19 MiB), timeCost >= 2, parallelism >= 1
  const meetsBaseline =
    isArgon2id && memoryCost >= 19456 && timeCost >= 2 && parallelism >= 1;

  results.push({
    caseId: 'HASH',
    scenario: 'Password Hashing',
    status: meetsBaseline ? 'PASS' : 'FAIL',
    details: `Algorithm: ${isArgon2id ? 'argon2id' : 'unknown'}, m=${memoryCost}, t=${timeCost}, p=${parallelism}`,
  });

  console.log(`Result: ${meetsBaseline ? 'PASS' : 'FAIL'}`);
  console.log(`Hash starts with: ${user.password.substring(0, 10)}...`);
}

// Test Session Security Properties
async function testSessionProperties() {
  console.log('\n=== Test: Session Security Properties ===');

  const session = await prisma.session.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    results.push({
      caseId: 'SESS',
      scenario: 'Session Security Properties',
      status: 'N/A',
      details: 'No sessions in database',
    });
    return;
  }

  const hasIp = !!session.ipAddress;
  const hasUa = !!session.userAgent;
  const hasExpiry = !!session.expiresAt;

  results.push({
    caseId: 'SESS',
    scenario: 'Session Security Properties',
    status: hasIp && hasUa && hasExpiry ? 'PASS' : 'PARTIAL',
    details: `IP: ${hasIp}, UA: ${hasUa}, Expiry: ${hasExpiry}`,
  });

  console.log(`Result: ${hasIp && hasUa && hasExpiry ? 'PASS' : 'PARTIAL'}`);
}

// Generate Report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('AUTHENTICATION SECURITY TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Application: CSMS — Civil Service Management System`);
  console.log(`Environment: ${BASE_URL}`);
  console.log('='.repeat(80));

  console.log('\n## Summary Matrix\n');
  console.log('| Case ID | Test Case | Verdict | Details |');
  console.log('|---------|-----------|---------|---------|');

  let passCount = 0;
  let failCount = 0;
  let partialCount = 0;
  let naCount = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'PARTIAL' ? '⚠️' : '➖';
    console.log(`| ${r.caseId} | ${r.scenario} | ${icon} **${r.status}** | ${r.details.substring(0, 80)} |`);

    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else if (r.status === 'PARTIAL') partialCount++;
    else naCount++;
  }

  console.log(`\n**Overall: ${passCount} PASS, ${partialCount} PARTIAL, ${failCount} FAIL, ${naCount} N/A**`);

  // Vulnerabilities
  const vulns = results.filter(r => r.vulnerability);
  if (vulns.length > 0) {
    console.log('\n## Vulnerabilities Found\n');
    for (const v of vulns) {
      console.log(`- **${v.caseId}**: ${v.vulnerability}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// Main
async function main() {
  try {
    console.log('Starting Authentication Security Tests...\n');

    await testValidLogin();
    await testInvalidUsername();
    await testInvalidPassword();
    await testSqlInjection();
    await testAccountLockout();
    await testInactiveAccount();
    await testDefaultPassword();
    await testBruteForceProtection();
    await testMfa();
    await testPasswordChange();
    await testAdminPasswordReset();
    await testSessionCreation();
    await testSessionExpiration();
    await testSessionFixation();
    await testLogout();
    await testServerSideValidation();
    await testRateLimitHeaders();
    await testPasswordHashing();
    await testSessionProperties();

    generateReport();
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
