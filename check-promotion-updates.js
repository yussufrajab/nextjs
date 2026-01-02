const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentPromotions() {
  try {
    console.log('Checking recent promotion updates...\n');

    // Get most recent promotion requests
    const recent = await prisma.promotionRequest.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        reviewStage: true,
        reviewedById: true,
        updatedAt: true,
        Employee: {
          select: { name: true },
        },
      },
    });

    console.log('Recent promotion requests:');
    recent.forEach((req) => {
      console.log(`  ${req.Employee?.name}: ${req.status}`);
      console.log(`    Updated: ${req.updatedAt}`);
      console.log(`    ReviewedById: ${req.reviewedById || 'None'}`);
      console.log(`    ReviewStage: ${req.reviewStage}\n`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentPromotions();
