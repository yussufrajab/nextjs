import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getTestDb() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

export async function cleanupTestData() {
  const db = getTestDb();

  // Delete in correct order to respect foreign keys
  await db.promotionRequest.deleteMany();
  await db.notification.deleteMany();
  await db.session.deleteMany();
  await db.auditLog.deleteMany();

  console.log('✅ Test data cleaned up');
}

export async function disconnectTestDb() {
  if (prisma) {
    await prisma.$disconnect();
  }
}
