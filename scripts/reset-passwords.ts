import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/password-hash';

const prisma = new PrismaClient();

async function resetPasswords() {
  try {
    const newPassword = 'Admin@123';
    const hashedPassword = await hashPassword(newPassword);

    // Update akassim
    const akassim = await prisma.user.update({
      where: { username: 'akassim' },
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

    console.log(`✓ Reset password for akassim. New password: ${newPassword}`);

    // Update ymrajab
    const ymrajab = await prisma.user.update({
      where: { username: 'ymrajab' },
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

    console.log(`✓ Reset password for ymrajab. New password: ${newPassword}`);
  } catch (error) {
    console.error('Error resetting passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();
