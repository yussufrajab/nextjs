/**
 * Script to check retirement request dates for debugging the report issue
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const zanId = '090025189';

  console.log(`\nChecking retirement requests for ZanID: ${zanId}\n`);

  // Find the employee
  const employee = await prisma.employee.findUnique({
    where: { zanId },
    select: { id: true, name: true, zanId: true },
  });

  if (!employee) {
    console.log('Employee not found');
    return;
  }

  console.log(`Employee: ${employee.name} (${employee.zanId})`);
  console.log('='.repeat(80));

  // Get all retirement requests for this employee
  const requests = await prisma.retirementRequest.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      createdAt: true,
      proposedDate: true,
      retirementType: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${requests.length} retirement request(s):\n`);

  requests.forEach((req, index) => {
    console.log(`${index + 1}. Request ID: ${req.id}`);
    console.log(`   Created At: ${req.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Proposed Date: ${req.proposedDate.toISOString().split('T')[0]}`);
    console.log(`   Type: ${req.retirementType}`);
    console.log(`   Status: ${req.status}`);
    console.log('');
  });

  // Test the date filter
  const fromDate = new Date('2026-01-01');
  const toDate = new Date('2026-01-07');
  toDate.setHours(23, 59, 59, 999);

  console.log('='.repeat(80));
  console.log(`\nTesting date filter: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}\n`);

  // Filter by proposedDate (current implementation)
  const byProposedDate = requests.filter(req => {
    const proposed = new Date(req.proposedDate);
    return proposed >= fromDate && proposed <= toDate;
  });

  console.log(`Results filtering by PROPOSED DATE: ${byProposedDate.length} request(s)`);
  byProposedDate.forEach((req, index) => {
    console.log(`  ${index + 1}. ${req.id} - Proposed: ${req.proposedDate.toISOString().split('T')[0]}`);
  });

  // Filter by createdAt (what user might expect)
  const byCreatedAt = requests.filter(req => {
    const created = new Date(req.createdAt);
    return created >= fromDate && created <= toDate;
  });

  console.log(`\nResults filtering by CREATED AT: ${byCreatedAt.length} request(s)`);
  byCreatedAt.forEach((req, index) => {
    console.log(`  ${index + 1}. ${req.id} - Created: ${req.createdAt.toISOString().split('T')[0]}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\nConclusion:');
  console.log(`- Current implementation filters by proposedDate: ${byProposedDate.length} results`);
  console.log(`- If filtered by createdAt instead: ${byCreatedAt.length} results`);
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
