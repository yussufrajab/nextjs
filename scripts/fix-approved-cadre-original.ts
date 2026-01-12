/**
 * Script to fix originalCadre for approved CadreChangeRequest records
 *
 * For approved requests where originalCadre is null:
 * - The employee's current cadre should equal newCadre (since it was approved and updated)
 * - We cannot determine what the original cadre was from current data
 * - As a workaround, we'll set originalCadre to a placeholder indicating unknown
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking approved cadre change requests...');

  // Get approved requests where originalCadre is null
  const approvedRequests = await prisma.cadreChangeRequest.findMany({
    where: {
      originalCadre: null,
      status: 'Approved by Commission',
    },
    include: {
      Employee: {
        select: {
          id: true,
          name: true,
          cadre: true,
        },
      },
    },
  });

  console.log(`Found ${approvedRequests.length} approved requests without originalCadre`);

  for (const request of approvedRequests) {
    console.log('\n---');
    console.log(`Request ID: ${request.id}`);
    console.log(`Employee: ${request.Employee?.name}`);
    console.log(`Employee's current cadre: ${request.Employee?.cadre}`);
    console.log(`Request newCadre: ${request.newCadre}`);
    console.log(`originalCadre: ${request.originalCadre || 'null'}`);

    // Verify that current cadre matches newCadre (as expected for approved requests)
    if (request.Employee?.cadre === request.newCadre) {
      console.log('✓ Employee cadre matches newCadre (as expected)');
    } else {
      console.log('✗ WARNING: Employee cadre does NOT match newCadre!');
      console.log('  This suggests the cadre was changed again after approval');
    }
  }

  console.log('\n=== Analysis Complete ===');
  console.log('For these approved requests, the original cadre cannot be determined');
  console.log('from current data since the employee records were already updated.');
  console.log('\nOptions:');
  console.log('1. Leave as null (UI will show current cadre for both From and To)');
  console.log('2. Set to a placeholder like "Unknown (Pre-existing request)"');
  console.log('3. Manually research and update each one from audit logs or backups');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
