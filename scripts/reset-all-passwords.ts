/**
 * reset-all-passwords.ts
 *
 * One-off script: reset EVERY user's password to a single known test password
 * using the new Argon2id hashPassword() from src/lib/password-hash.
 *
 * ⚠️  TESTING/UAT ONLY — do not run in production. This overwrites every
 *     user's password in the database.
 *
 * Default password: Csms@2026
 *
 * Usage:
 *   npx tsx scripts/reset-all-passwords.ts                 # uses Csms@2026
 *   npx tsx scripts/reset-all-passwords.ts MyCustom@Pass123 # custom password
 *
 * What it does:
 *   - Fetches all users from the database.
 *   - Hashes the fixed password once with Argon2id (OWASP baseline params).
 *   - Updates every user's `password` field to that Argon2id hash.
 *   - Clears password-expiry / lockout / failed-attempt state and the
 *     `mustChangePassword` + `isTemporaryPassword` flags so users can log in
 *     immediately with the new password.
 *   - Logs the count of users updated.
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/password-hash';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Csms@2026';

async function main() {
  const newPassword = process.argv[2] || DEFAULT_PASSWORD;

  console.log(`\n🔑 Resetting ALL user passwords to: ${newPassword}`);
  console.log('   Hashing with Argon2id (memoryCost=19456, timeCost=2, parallelism=1)...\n');

  // Hash the target password once and reuse the hash for every user.
  const hashedPassword = await hashPassword(newPassword);

  // Fetch every user (we only need ids, but select minimal fields for the log).
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
  });

  console.log(`Found ${users.length} user(s) in the database.\n`);

  if (users.length === 0) {
    console.log('Nothing to update — no users found.');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordExpiresAt: null,
          passwordHistory: [],
          failedLoginAttempts: 0,
          loginLockedUntil: null,
          lastPasswordChange: new Date(),
          isTemporaryPassword: false,
          mustChangePassword: false,
        },
      });
      updated++;
      console.log(`  ✓ ${user.username}`);
    } catch (error: any) {
      failed++;
      console.log(`  ✗ ${user.username} — ERROR: ${error.message}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Done: ${updated} user(s) updated, ${failed} failed`);
  console.log(`🔑 All updated users can now log in with: ${newPassword}\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error resetting passwords:', error);
  prisma.$disconnect().finally(() => process.exit(1));
});