/**
 * End-to-end CSRF verification for /api/auth/activity.
 *
 * Full flow against a running server:
 *   1. POST /api/auth/login            → MFA_REQUIRED (captures pre-session cookie + userId)
 *   2. Read the 6-digit OTP from the MfaToken DB table
 *   3. POST /api/auth/mfa/verify-otp    → session + csrf-token cookies
 *   4. POST /api/auth/activity WITHOUT x-csrf-token  → expect 403 (bug reproduction)
 *   5. POST /api/auth/activity WITH    x-csrf-token  → expect 200 (fix verification)
 *
 * Usage:
 *   npx tsx scripts/test-csrf-activity-flow.ts [serverUrl] [username] [password]
 *
 * Defaults: serverUrl=http://localhost:9003  username=ymrajab  password=Csms@2026
 *
 * (If the target user has no email on file, login completes in one shot and the
 * MFA step is skipped automatically — the script still works.)
 */
import { PrismaClient } from '@prisma/client';

const SERVER = process.argv[2] || 'http://localhost:9003';
const USERNAME = process.argv[3] || 'ymrajab';
const PASSWORD = process.argv[4] || 'Csms@2026';

const prisma = new PrismaClient();

/** Parse all Set-Cookie header values from a Response into a flat Cookie header string. */
function collectCookies(response: Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const sc of raw) {
    const first = sc.split(';')[0];
    const eq = first.indexOf('=');
    if (eq > -1) {
      const name = first.slice(0, eq).trim();
      // Decode the stored value the same way a browser's document.cookie would
      // expose it, so the value we send as x-csrf-token matches the server's
      // decoded cookie read (Next's request.cookies.get decodes it too).
      const value = decodeURIComponent(first.slice(eq + 1).trim());
      cookies[name] = value;
    }
  }
  return cookies;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  const jar: Record<string, string> = {};

  // ---- Step 1: login (triggers MFA) ----
  console.log(`\n[1] POST ${SERVER}/api/auth/login  (user=${USERNAME})`);
  const loginRes = await fetch(`${SERVER}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-info': 'null' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  Object.assign(jar, collectCookies(loginRes));
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log(`    status=${loginRes.status} code=${loginBody.code} success=${loginBody.success}`);
  if (!loginRes.ok && loginBody.code !== 'MFA_REQUIRED') {
    console.log('    body:', JSON.stringify(loginBody).slice(0, 300));
  }

  // If login completed directly (no email → no MFA), skip to step 4.
  if (loginBody.success && loginBody.code !== 'MFA_REQUIRED') {
    console.log('    (no MFA — login completed directly)');
  } else if (loginBody.code === 'MFA_REQUIRED') {
    const userId: string = loginBody.data.userId;

    // ---- Step 2: read OTP from DB ----
    console.log(`\n[2] Reading latest OTP from MfaToken for userId=${userId}`);
    const mfa = await prisma.mfaToken.findFirst({
      where: { userId, tokenType: 'OTP', usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { token: true, expiresAt: true },
    });
    if (!mfa) {
      console.error('    No valid OTP found in MfaToken table. Aborting.');
      process.exit(1);
    }
    console.log(`    OTP=${mfa.token}  expiresAt=${mfa.expiresAt.toISOString()}`);

    // ---- Step 3: verify OTP ----
    console.log(`\n[3] POST ${SERVER}/api/auth/mfa/verify-otp`);
    const verifyRes = await fetch(`${SERVER}/api/auth/mfa/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(jar),
        'x-device-info': 'null',
      },
      body: JSON.stringify({ userId, otpCode: mfa.token }),
    });
    Object.assign(jar, collectCookies(verifyRes));
    const verifyBody = await verifyRes.json().catch(() => ({}));
    console.log(`    status=${verifyRes.status} success=${verifyBody.success}`);
    if (!verifyRes.ok) {
      console.log('    body:', JSON.stringify(verifyBody).slice(0, 300));
      process.exit(1);
    }
  } else {
    console.error('    Login did not succeed. Aborting.');
    process.exit(1);
  }

  console.log(`\n    session cookie present: ${!!jar.session || !!jar['__Host-session']}`);
  console.log(`    csrf-token cookie present: ${!!jar['csrf-token']}`);

  const csrf = jar['csrf-token'];
  const sessionName = jar['__Host-session'] ? '__Host-session' : 'session';

  // ---- Step 4: activity WITHOUT csrf header (expect 403) ----
  console.log(`\n[4] POST /api/auth/activity  WITHOUT x-csrf-token  (expect 403)`);
  const noHeaderRes = await fetch(`${SERVER}/api/auth/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(jar) },
    body: JSON.stringify({ userId: 'x' }),
  });
  const noHeaderBody = await noHeaderRes.json().catch(() => ({}));
  console.log(`    status=${noHeaderRes.status} body=${JSON.stringify(noHeaderBody).slice(0, 200)}`);

  // ---- Step 5: activity WITH csrf header (expect 200) ----
  console.log(`\n[5] POST /api/auth/activity  WITH x-csrf-token  (expect 200)`);
  const withHeaderRes = await fetch(`${SERVER}/api/auth/activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(jar),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
    body: JSON.stringify({ userId: 'x' }),
  });
  const withHeaderBody = await withHeaderRes.json().catch(() => ({}));
  console.log(`    status=${withHeaderRes.status} body=${JSON.stringify(withHeaderBody).slice(0, 200)}`);

  // ---- Verdict ----
  console.log('\n=== VERDICT ===');
  const step4Pass = noHeaderRes.status === 403;
  const step5Pass = withHeaderRes.status === 200;
  console.log(`  Step 4 (no header → 403):   ${step4Pass ? 'PASS' : 'FAIL (got ' + noHeaderRes.status + ')'}`);
  console.log(`  Step 5 (with header → 200): ${step5Pass ? 'PASS' : 'FAIL (got ' + withHeaderRes.status + ')'}`);
  console.log(step4Pass && step5Pass
    ? '\n✅ CSRF enforcement on /api/auth/activity is working correctly.'
    : '\n❌ Unexpected result — investigate above.');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});