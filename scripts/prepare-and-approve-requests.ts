/**
 * prepare-and-approve-requests.ts
 *
 * End-to-end UAT flow against a running server (default http://localhost:9002):
 *
 *   1. GET /api/auth/csrf-token           → pre-login CSRF cookie
 *   2. Login as HRO  yhzubeir (MFA)        → OTP pulled from MfaToken table → verify-otp
 *   3. Create 30 LWOP requests             (cycle over Confirmed employees in yhzubeir's institution)
 *   4. Login as HRRP khamadi (MFA)         → OTP from DB → verify-otp
 *   5. Approve 10 of yhzubeir's pending LWOP requests (HRRP → Commission)
 *
 * MFA: the login response is { code: 'MFA_REQUIRED', data: { userId } } and the
 * 6-digit OTP is stored in the MfaToken table (tokenType 'OTP', plain). We query
 * the latest unused, unexpired one and POST it to /api/auth/mfa/verify-otp.
 *
 * CSRF: login + mfa/verify-otp + the state-changing LWOP calls all enforce
 * double-submit CSRF, so every POST/PATCH carries the x-csrf-token header that
 * matches the csrf-token cookie (issued by the csrf-token endpoint / completeLogin).
 *
 * Usage:
 *   npx tsx scripts/prepare-and-approve-requests.ts [serverUrl]
 *
 * Prerequisites:
 *   - Server running (pm2 / npm start) with the CSRF + Prisma-strip fixes built.
 *   - yhzubeir (HRO) and khamadi (HRRP) passwords reset to Csms@2026, same institution.
 */
import { PrismaClient } from '@prisma/client';

const SERVER = process.argv[2] || 'http://localhost:9002';
const HRO = 'yhzubeir';
const HRRP = 'khamadi';
const PASS = 'Csms@2026';
const CREATE_COUNT = 30;
const APPROVE_COUNT = 10;

const prisma = new PrismaClient();

function collectCookies(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const first = sc.split(';')[0];
    const eq = first.indexOf('=');
    if (eq > -1) out[first.slice(0, eq).trim()] = decodeURIComponent(first.slice(eq + 1).trim());
  }
  return out;
}
const cookieHdr = (j: Record<string, string>) => Object.entries(j).map(([k, v]) => `${k}=${v}`).join('; ');
const csrfHeader = (j: Record<string, string>) => j['csrf-token'] ? { 'x-csrf-token': j['csrf-token'] } : {};

/** GET /api/auth/csrf-token to seed a pre-login CSRF cookie. Tolerant of older builds without it. */
async function seedCsrf(jar: Record<string, string>): Promise<void> {
  try {
    const r = await fetch(`${SERVER}/api/auth/csrf-token`, { headers: { 'x-device-info': 'null' } });
    if (r.ok) Object.assign(jar, collectCookies(r));
  } catch {
    /* server may not have the endpoint yet — login will tell us if CSRF is enforced */
  }
}

/** Get the latest valid OTP for a user from the MfaToken table. */
async function getOtp(userId: string): Promise<string | null> {
  const mfa = await prisma.mfaToken.findFirst({
    where: { userId, tokenType: 'OTP', usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  return mfa?.token ?? null;
}

/**
 * Full login flow (CSRF → login → MFA OTP from DB → verify-otp).
 * Returns the authenticated cookie jar (session + csrf).
 */
async function loginWithMfa(username: string, password: string): Promise<{ jar: Record<string, string>; userId: string }> {
  const jar: Record<string, string> = {};
  await seedCsrf(jar);

  // 1. login (triggers MFA) — send the csrf cookie (Cookie header) AND the
  // matching x-csrf-token header; the server validates both (double-submit).
  const lr = await fetch(`${SERVER}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null', Cookie: cookieHdr(jar), ...csrfHeader(jar) },
    body: JSON.stringify({ username, password }),
  });
  Object.assign(jar, collectCookies(lr));
  const lb = await lr.json().catch(() => ({}));
  if (lr.status === 403 && lb?.error === 'CSRF_VALIDATION_FAILED') {
    throw new Error(`login blocked by CSRF (server enforces it but csrf-token endpoint missing?). ${JSON.stringify(lb)}`);
  }
  if (lb?.code !== 'MFA_REQUIRED' || !lb?.data?.userId) {
    throw new Error(`login did not return MFA_REQUIRED for ${username}: status=${lr.status} body=${JSON.stringify(lb).slice(0, 200)}`);
  }
  const userId = lb.data.userId as string;

  // 2. pull OTP from DB
  const otp = await getOtp(userId);
  if (!otp) throw new Error(`no valid OTP found in MfaToken for ${username} (${userId})`);

  // 3. verify-otp → completeLogin sets session + new csrf cookie
  const vr = await fetch(`${SERVER}/api/auth/mfa/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null', Cookie: cookieHdr(jar), ...csrfHeader(jar) },
    body: JSON.stringify({ userId, otpCode: otp }),
  });
  Object.assign(jar, collectCookies(vr));
  const vb = await vr.json().catch(() => ({}));
  if (!vr.ok || vb?.success === false) {
    throw new Error(`MFA verify failed for ${username}: status=${vr.status} body=${JSON.stringify(vb).slice(0, 200)}`);
  }
  return { jar, userId };
}

/** POST /api/lwop to create a pending LWOP request as the logged-in HRO/HRRP. */
async function createLwop(jar: Record<string, string>, employeeId: string, n: number): Promise<boolean> {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const r = await fetch(`${SERVER}/api/lwop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null', Cookie: cookieHdr(jar), ...csrfHeader(jar) },
    body: JSON.stringify({
      employeeId,
      duration: '30 days',
      reason: `UAT test LWOP request #${n} (automated)`,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      documents: [],
    }),
  });
  return r.ok;
}

/** PATCH /api/lwop to approve (HRRP → Commission) a pending request. */
async function approveLwop(jar: Record<string, string>, hrrpUserId: string, requestId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const r = await fetch(`${SERVER}/api/lwop`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null', Cookie: cookieHdr(jar), ...csrfHeader(jar) },
    body: JSON.stringify({
      id: requestId,
      status: 'Approved by HRRP - Awaiting Commission Review',
      reviewStage: 'hrrp_review',
      hrrpReviewedById: hrrpUserId,
      hrrpReviewedAt: now,
      decisionDate: now,
      userRole: 'HRRP',
    }),
  });
  return r.ok;
}

async function main() {
  // ---- resolve users + eligible employees ----------------------------------
  const hroUser = await prisma.user.findUnique({ where: { username: HRO }, select: { id: true, institutionId: true } });
  const hrrpUser = await prisma.user.findUnique({ where: { username: HRRP }, select: { id: true, institutionId: true } });
  if (!hroUser || !hrrpUser) throw new Error(`user not found: ${HRO}=${!!hroUser} ${HRRP}=${!!hrrpUser}`);
  if (hroUser.institutionId !== hrrpUser.institutionId) {
    console.warn(`⚠ HRO and HRRP are in different institutions (${hroUser.institutionId} vs ${hrrpUser.institutionId}); approvals will be blocked by institution ownership.`);
  }
  const instId = hroUser.institutionId;
  console.log(`HRO  ${HRO}  (${hroUser.id})  institution ${instId}`);
  console.log(`HRRP ${HRRP} (${hrrpUser.id}) institution ${hrrpUser.institutionId}`);

  // LWOP-eligible = employees whose status is NOT in the LWOP restriction map
  // (On Probation / On LWOP / Retired / Resigned / Terminated / Dismissed are restricted).
  // In practice that means 'Confirmed' (and any unmapped status).
  const LWOP_BLOCKED = ['On Probation', 'On LWOP', 'Retired', 'Resigned', 'Terminated', 'Dismissed'];
  const employees = await prisma.employee.findMany({
    where: { institutionId: instId, status: { notIn: LWOP_BLOCKED } },
    select: { id: true, name: true, status: true },
    take: 200,
  });
  console.log(`LWOP-eligible employees in institution: ${employees.length}`);
  if (employees.length === 0) throw new Error('no LWOP-eligible employees to create requests for');

  // ---- 1) HRO: create 30 LWOP requests -------------------------------------
  console.log(`\n[1] Login as HRO ${HRO} (MFA)…`);
  const { jar: hroJar } = await loginWithMfa(HRO, PASS);
  console.log(`    logged in (session cookie present: ${!!hroJar['session'] || !!hroJar['__Host-session']})`);

  let created = 0;
  let attempts = 0;
  const createdIds: string[] = [];
  while (created < CREATE_COUNT && attempts < CREATE_COUNT * 3) {
    const emp = employees[created % employees.length]; // cycle through eligible employees
    attempts++;
    const ok = await createLwop(hroJar, emp.id, created + 1);
    if (ok) {
      created++;
      if (created <= 3 || created % 10 === 0) console.log(`    created LWOP #${created} for ${emp.name} (${emp.status})`);
    } else {
      console.log(`    ✗ create failed for ${emp.name} (${emp.status}) — trying next`);
    }
  }
  console.log(`✓ Created ${created}/${CREATE_COUNT} LWOP requests as ${HRO} (after ${attempts} attempts)`);

  // pull the actual pending request ids submitted by yhzubeir (authoritative from DB)
  const pending = await prisma.lwopRequest.findMany({
    where: { submittedById: hroUser.id, status: 'Pending HRRP Review' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, employeeId: true },
    take: created,
  });
  console.log(`   pending 'Pending HRRP Review' requests by ${HRO}: ${pending.length}`);

  // ---- 2) HRRP: approve 10 of them -----------------------------------------
  console.log(`\n[2] Login as HRRP ${HRRP} (MFA)…`);
  const { jar: hrrpJar } = await loginWithMfa(HRRP, PASS);
  console.log(`    logged in (session cookie present: ${!!hrrpJar['session'] || !!hrrpJar['__Host-session']})`);

  const toApprove = pending.slice(0, APPROVE_COUNT);
  let approved = 0;
  for (const req of toApprove) {
    const ok = await approveLwop(hrrpJar, hrrpUser.id, req.id);
    if (ok) {
      approved++;
      console.log(`    approved #${approved}  request ${req.id}`);
    } else {
      console.log(`    ✗ approve failed for request ${req.id}`);
    }
  }
  console.log(`✓ Approved ${approved}/${toApprove.length} requests as ${HRRP}`);

  // ---- summary -------------------------------------------------------------
  const stillPending = await prisma.lwopRequest.count({ where: { submittedById: hroUser.id, status: 'Pending HRRP Review' } });
  const hrrpApproved = await prisma.lwopRequest.count({ where: { submittedById: hroUser.id, status: 'Approved by HRRP - Awaiting Commission Review' } });
  console.log(`\n==== SUMMARY ====`);
  console.log(`LWOP created by ${HRO}:          ${created}`);
  console.log(`  still 'Pending HRRP Review':   ${stillPending}`);
  console.log(`  'Approved by HRRP…':           ${hrrpApproved}`);
  console.log(`Approved by ${HRRP} this run:    ${approved}`);
}

main()
  .catch((e) => { console.error('\n✖ Script failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());