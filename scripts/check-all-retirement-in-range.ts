/**
 * Script to check all retirement requests in a date range
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fromDate = new Date('2026-01-01');
  const toDate = new Date('2026-01-07');
  toDate.setHours(23, 59, 59, 999);

  console.log(`\nChecking ALL retirement requests from ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}\n`);
  console.log('='.repeat(100));

  // Filter by createdAt
  const byCreatedAt = await prisma.retirementRequest.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      Employee: {
        select: {
          name: true,
          zanId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n** Results filtering by CREATED AT: ${byCreatedAt.length} request(s) **\n`);
  byCreatedAt.forEach((req, index) => {
    console.log(`${index + 1}. ${req.Employee?.name} (ZanID: ${req.Employee?.zanId})`);
    console.log(`   Request ID: ${req.id}`);
    console.log(`   Created At: ${req.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Proposed Date: ${req.proposedDate.toISOString().split('T')[0]}`);
    console.log(`   Type: ${req.retirementType}`);
    console.log(`   Status: ${req.status}`);
    console.log('');
  });

  console.log('='.repeat(100));

  // Filter by proposedDate
  const byProposedDate = await prisma.retirementRequest.findMany({
    where: {
      proposedDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      Employee: {
        select: {
          name: true,
          zanId: true,
        },
      },
    },
    orderBy: { proposedDate: 'desc' },
  });

  console.log(`\n** Results filtering by PROPOSED DATE: ${byProposedDate.length} request(s) **\n`);
  byProposedDate.forEach((req, index) => {
    console.log(`${index + 1}. ${req.Employee?.name} (ZanID: ${req.Employee?.zanId})`);
    console.log(`   Request ID: ${req.id}`);
    console.log(`   Created At: ${req.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Proposed Date: ${req.proposedDate.toISOString().split('T')[0]}`);
    console.log(`   Type: ${req.retirementType}`);
    console.log(`   Status: ${req.status}`);
    console.log('');
  });

  console.log('='.repeat(100));
  console.log('\nSummary:');
  console.log(`- Filtering by createdAt: ${byCreatedAt.length} results`);
  console.log(`- Filtering by proposedDate (current implementation): ${byProposedDate.length} results`);

  // Check if user is expecting results for ZanID 090025189 specifically
  const forSpecificEmployee = byCreatedAt.filter(req => req.Employee?.zanId === '090025189');
  console.log(`- Requests for ZanID 090025189 (by createdAt): ${forSpecificEmployee.length}`);

  const forSpecificEmployeeProposed = byProposedDate.filter(req => req.Employee?.zanId === '090025189');
  console.log(`- Requests for ZanID 090025189 (by proposedDate): ${forSpecificEmployeeProposed.length}`);
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
