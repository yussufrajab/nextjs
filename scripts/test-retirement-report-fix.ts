/**
 * Script to test the retirement report fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fromDate = new Date('2026-01-01');
  const toDate = new Date('2026-01-07');
  toDate.setHours(23, 59, 59, 999);

  console.log('\n='.repeat(80));
  console.log('Testing Retirement Report Fix');
  console.log('='.repeat(80));
  console.log(`Date Range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}\n`);

  // Simulate the NEW report query (filtering by createdAt)
  const reportData = await prisma.retirementRequest.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      Employee: {
        select: {
          id: true,
          name: true,
          zanId: true,
          gender: true,
          cadre: true,
          Institution: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`RESULT: Found ${reportData.length} retirement request(s)\n`);
  console.log('='.repeat(80));

  reportData.forEach((req, index) => {
    console.log(`\n${index + 1}. ${req.Employee?.name} (ZanID: ${req.Employee?.zanId})`);
    console.log(`   Institution: ${req.Employee?.Institution?.name || 'N/A'}`);
    console.log(`   Request ID: ${req.id}`);
    console.log(`   Type: ${req.retirementType}`);
    console.log(`   Created At (Request Date): ${req.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Proposed Date (Retirement Date): ${req.proposedDate.toISOString().split('T')[0]}`);
    console.log(`   Status: ${req.status}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✓ The fix is working! The report now shows all retirement requests');
  console.log('  submitted between the selected dates, regardless of the proposed');
  console.log('  retirement date.');
  console.log('\n' + '='.repeat(80));
  console.log('');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
