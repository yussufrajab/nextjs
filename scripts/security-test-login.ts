/**
 * security-test-login.ts
 *
 * Helper: login + MFA bypass for security testing.
 * Returns session cookies for use with curl.
 *
 * Usage:
 *   npx tsx scripts/security-test-login.ts <username> <password> <output-cookie-file>
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const [username, password, outFile] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: npx tsx scripts/security-test-login.ts <username> <password> [cookie-file]');
    process.exit(1);
  }

  try {
    // 1. Find user and verify password
    const user = await prisma.user.findUnique({
      where: { username },
      include: { Institution: true },
    });
    if (!user) { console.error('User not found'); process.exit(1); }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { console.error('Invalid password'); process.exit(1); }

    console.log(`✓ Authenticated: ${user.username} (${user.role})`);
    console.log(`  Institution: ${user.Institution?.name} (${user.institutionId})`);

    // 2. If user has email, we need to handle MFA
    if (user.email) {
      // Create an OTP token directly in DB
      const otpToken = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Invalidate old tokens
      await prisma.mfaToken.updateMany({
        where: { userId: user.id, tokenType: 'OTP', usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.mfaToken.create({
        data: {
          userId: user.id,
          token: otpToken,
          tokenType: 'OTP',
          email: user.email,
          expiresAt,
          ipAddress: '127.0.0.1',
          userAgent: 'security-test',
        },
      });

      console.log(`  MFA OTP token created: ${otpToken}`);
      console.log(`  Verify at: POST /api/auth/mfa/verify-otp`);
      console.log(`  Body: { "userId": "${user.id}", "otpCode": "${otpToken}" }`);
    } else {
      console.log('  No email — MFA skipped');
    }

    // Output user info for test scripts
    console.log(`\n--- USER INFO ---`);
    console.log(`userId=${user.id}`);
    console.log(`username=${user.username}`);
    console.log(`role=${user.role}`);
    console.log(`institutionId=${user.institutionId}`);
    console.log(`email=${user.email || 'none'}`);
    console.log(`--- END ---`);

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
