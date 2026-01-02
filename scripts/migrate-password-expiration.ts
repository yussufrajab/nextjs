import { PrismaClient } from '@prisma/client';
import { calculatePasswordExpirationDate } from '../src/lib/password-expiration-utils';

const prisma = new PrismaClient();

async function migratePasswordExpiration() {
  console.log('Starting password expiration migration...');

  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        lastPasswordChange: true,
        isTemporaryPassword: true,
      },
    });

    console.log(`Found ${users.length} active users to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip temporary passwords
      if (user.isTemporaryPassword) {
        skipped++;
        continue;
      }

      // Use lastPasswordChange if available, otherwise use current date
      const baseDate = user.lastPasswordChange || new Date();
      const expiresAt = calculatePasswordExpirationDate(baseDate, user.role);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordExpiresAt: expiresAt,
          lastPasswordChange: baseDate,
          lastExpirationWarningLevel: 0,
          gracePeriodStartedAt: null,
        },
      });

      migrated++;
      console.log(
        `Migrated user ${user.username}: expires ${expiresAt.toLocaleDateString()}`
      );
    }

    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePasswordExpiration();
