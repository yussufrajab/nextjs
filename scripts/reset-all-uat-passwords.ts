/**
 * reset-all-uat-passwords.ts
 *
 * Batch-reset passwords for UAT testing — one or two users per role.
 * Default password: Csms@2026
 *
 * Usage:
 *   npx tsx scripts/reset-all-uat-passwords.ts
 *   npx tsx scripts/reset-all-uat-passwords.ts MyCustom@Pass123
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/password-hash';

const prisma = new PrismaClient();

// UAT users: 1–2 per role
const UAT_USERS: Record<string, string[]> = {
  Admin:     ['ymrajab', 'akassim'],
  ADMIN:     ['admin'],
  CSCS:      ['zhaji'],
  DO:        ['maitest', 'mussi'],
  EMPLOYEE:  ['abdillahomarnajim', 'abdullaameiramour'],
  HHRMD:     ['skhamis', 'vuai'],
  HRMO:      ['fautest', 'fiddi'],
  HRO:       ['skawesu', 'lela', 'yhzubeir'],
  HRRP:      ['Hassan', 'shuwekhaawesu', 'khamadi'],
  PO:        ['mishak'],
};

async function main() {
  const newPassword = process.argv[2] || 'Csms@2026';
  const hashedPassword = await hashPassword(newPassword);

  console.log(`\n🔑 Resetting UAT user passwords to: ${newPassword}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [role, usernames] of Object.entries(UAT_USERS)) {
    console.log(`\n━━━ ${role} ━━━`);
    for (const username of usernames) {
      try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          console.log(`  ✗ ${username} — NOT FOUND`);
          failCount++;
          continue;
        }

        await prisma.user.update({
          where: { username },
          data: {
            password: hashedPassword,
            passwordExpiresAt: null,
            failedLoginAttempts: 0,
            loginLockedUntil: null,
            lastPasswordChange: new Date(),
            isTemporaryPassword: false,
            mustChangePassword: false,
          },
        });

        console.log(`  ✓ ${username} (${user.name}) — password reset`);
        successCount++;
      } catch (error: any) {
        console.log(`  ✗ ${username} — ERROR: ${error.message}`);
        failCount++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Done: ${successCount} reset, ${failCount} failed`);
  console.log(`🔑 Password: ${newPassword}\n`);

  await prisma.$disconnect();
}

main();
