import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test promotion requests...\n');

  // Calculate date range (today and yesterday)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  console.log('Date range:');
  console.log(`  From: ${yesterday.toISOString()}`);
  console.log(`  To:   ${now.toISOString()}\n`);

  // First, count how many will be deleted
  const count = await prisma.promotionRequest.count({
    where: {
      createdAt: {
        gte: yesterday,
        lte: now,
      },
    },
  });

  console.log(`Found ${count} promotion request(s) created in this period.\n`);

  if (count === 0) {
    console.log('✅ No test data to clean up.');
    return;
  }

  // Show some examples before deleting
  const examples = await prisma.promotionRequest.findMany({
    where: {
      createdAt: {
        gte: yesterday,
        lte: now,
      },
    },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      promotionType: true,
      status: true,
      Employee: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log('Examples of records to be deleted:');
  examples.forEach((req, index) => {
    console.log(
      `  ${index + 1}. ${req.Employee.name} - ${req.promotionType} - ${req.status} (${req.createdAt.toISOString()})`
    );
  });
  console.log();

  // Delete the records
  console.log('Deleting...');
  const result = await prisma.promotionRequest.deleteMany({
    where: {
      createdAt: {
        gte: yesterday,
        lte: now,
      },
    },
  });

  console.log(`\n✅ Successfully deleted ${result.count} promotion request(s)!`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
