/**
 * reset-user-password.ts
 *
 * Reset any user's password by username.
 *
 * Usage:
 *   npx tsx scripts/reset-user-password.ts <username> <new-password>
 *
 * Examples:
 *   npx tsx scripts/reset-user-password.ts skawesu Csms@2029
 *   npx tsx scripts/reset-user-password.ts ymrajab Tume@2020
 *
 * What it does:
 *   - Hashes the new password with Argon2id
 *   - Clears password expiration, lockout, and failed attempt counters
 *   - Sets lastPasswordChange to now
 *   - Unsets mustChangePassword and isTemporaryPassword flags
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/password-hash';

const prisma = new PrismaClient();

async function main() {
  const [username, newPassword] = process.argv.slice(2);

  if (!username || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-user-password.ts <username> <new-password>');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/reset-user-password.ts skawesu Csms@2029');
    console.error('  npx tsx scripts/reset-user-password.ts ymrajab Tume@2020');
    process.exit(1);
  }

  try {
    // Check user exists
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.error(`✗ User "${username}" not found.`);
      process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);

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

    console.log(`✓ Password reset for "${username}" (id: ${user.id})`);
    console.log(`  New password: ${newPassword}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Institution: ${user.institutionId || 'N/A'}`);
    console.log('');
    console.log('  Flags cleared:');
    console.log('    - passwordExpiresAt → null');
    console.log('    - failedLoginAttempts → 0');
    console.log('    - loginLockedUntil → null');
    console.log('    - isTemporaryPassword → false');
    console.log('    - mustChangePassword → false');
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
