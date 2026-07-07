/**
 * Verifies the step-up re-auth flow for a Tier-1 admin action (reset-password),
 * against a running server.
 *
 *   1. Login as admin (ymrajab) via MFA → session + csrf cookies
 *   2. POST /api/admin/reset-password  (no reauth cookie) → expect 401 REAUTH_REQUIRED
 *   3. POST /api/auth/reauth { scope:'admin.reset-password', password } → reauth cookie
 *   4. POST /api/admin/reset-password  (with reauth cookie) → expect 200
 *
 * This proves: the reset fails ONLY because the client never performs step-up
 * reauth. The server-side guard + reauth issuance both work; the missing piece
 * is the client UI (no code calls /api/auth/reauth today).
 *
 * Usage: npx tsx scripts/test-reauth-flow.ts [serverUrl] [adminUser] [adminPass] [targetUser]
 * Defaults: http://localhost:9003  ymrajab  Csms@2026  kmnyonge
 */
import { PrismaClient } from '@prisma/client';

const SERVER = process.argv[2] || 'http://localhost:9003';
const ADMIN = process.argv[3] || 'ymrajab';
const ADMIN_PASS = process.argv[4] || 'Csms@2026';
const TARGET = process.argv[5] || 'kmnyonge'; // reset this user's password (back to Csms@2026)

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

async function main() {
  const jar: Record<string, string> = {};

  // 1. login (MFA)
  console.log(`\n[1] login as ${ADMIN}`);
  const lr = await fetch(`${SERVER}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null' },
    body: JSON.stringify({ username: ADMIN, password: ADMIN_PASS }),
  });
  Object.assign(jar, collectCookies(lr));
  const lb = await lr.json().catch(() => ({}));
  console.log(`    status=${lr.status} code=${lb.code}`);
  if (lb.code !== 'MFA_REQUIRED') {
    console.log('    (no MFA — aborting; use an MFA-enabled admin for this test) body:', JSON.stringify(lb).slice(0, 200));
    process.exit(1);
  }
  const userId = lb.data.userId;
  const mfa = await prisma.mfaToken.findFirst({
    where: { userId, tokenType: 'OTP', usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }, select: { token: true },
  });
  if (!mfa) { console.error('    no OTP found'); process.exit(1); }
  const vr = await fetch(`${SERVER}/api/auth/mfa/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHdr(jar), 'x-device-info': 'null' },
    body: JSON.stringify({ userId, otpCode: mfa.token }),
  });
  Object.assign(jar, collectCookies(vr));
  console.log(`    mfa verify status=${vr.status}`);

  // find target user id
  const target = await prisma.user.findFirst({ where: { username: TARGET }, select: { id: true, username: true } });
  if (!target) { console.error(`    target user ${TARGET} not found`); process.exit(1); }
  console.log(`    target: ${target.username} (${target.id})`);

  // 2. reset WITHOUT reauth → expect 401 REAUTH_REQUIRED
  console.log(`\n[2] POST /api/admin/reset-password  (NO reauth cookie) → expect 401 REAUTH_REQUIRED`);
  const r1 = await fetch(`${SERVER}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHdr(jar), 'x-csrf-token': jar['csrf-token'] || '' },
    body: JSON.stringify({ userId: target.id, adminId: userId, temporaryPassword: ADMIN_PASS }),
  });
  const b1 = await r1.json().catch(() => ({}));
  console.log(`    status=${r1.status} body=${JSON.stringify(b1).slice(0, 220)}`);

  // 3. reauth
  console.log(`\n[3] POST /api/auth/reauth { scope:'admin.reset-password', password }`);
  const rr = await fetch(`${SERVER}/api/auth/reauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHdr(jar), 'x-csrf-token': jar['csrf-token'] || '' },
    body: JSON.stringify({ scope: 'admin.reset-password', password: ADMIN_PASS }),
  });
  Object.assign(jar, collectCookies(rr));
  const br = await rr.json().catch(() => ({}));
  console.log(`    status=${rr.status} body=${JSON.stringify(br).slice(0, 200)} reauthCookie=${!!jar['reauth']}`);

  // 4. reset WITH reauth → expect 200
  console.log(`\n[4] POST /api/admin/reset-password  (WITH reauth cookie) → expect 200`);
  const r2 = await fetch(`${SERVER}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHdr(jar), 'x-csrf-token': jar['csrf-token'] || '' },
    body: JSON.stringify({ userId: target.id, adminId: userId, temporaryPassword: ADMIN_PASS }),
  });
  const b2 = await r2.json().catch(() => ({}));
  console.log(`    status=${r2.status} body=${JSON.stringify(b2).slice(0, 220)}`);

  console.log('\n=== VERDICT ===');
  console.log(`  Step 2 (no reauth → 401 REAUTH_REQUIRED): ${r1.status === 401 && b1.errorCode === 'REAUTH_REQUIRED' ? 'PASS' : 'FAIL'}`);
  console.log(`  Step 3 (reauth → 200 + cookie):            ${rr.status === 200 && !!jar['reauth'] ? 'PASS' : 'FAIL'}`);
  console.log(`  Step 4 (with reauth → 200):               ${r2.status === 200 ? 'PASS' : 'FAIL'}`);

  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });