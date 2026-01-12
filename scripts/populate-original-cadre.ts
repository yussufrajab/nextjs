/**
 * Script to populate originalCadre field for existing CadreChangeRequest records
 *
 * For existing requests that don't have originalCadre set:
 * - For non-approved requests: Set originalCadre to employee's current cadre
 * - For approved requests: Cannot reliably determine, so leave as null
 *   (these old records will show duplicate cadre in UI, but new ones will work correctly)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to populate originalCadre field...');

  // Get all cadre change requests where originalCadre is null
  const requestsWithoutOriginalCadre = await prisma.cadreChangeRequest.findMany({
    where: {
      originalCadre: null,
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

  console.log(
    `Found ${requestsWithoutOriginalCadre.length} requests without originalCadre`
  );

  let updatedCount = 0;
  let skippedCount = 0;

  for (const request of requestsWithoutOriginalCadre) {
    // Only update non-approved requests since we can reliably determine their original cadre
    // For approved requests, the employee's cadre has already been changed to newCadre
    if (request.status !== 'Approved by Commission') {
      if (request.Employee?.cadre) {
        await prisma.cadreChangeRequest.update({
          where: { id: request.id },
          data: { originalCadre: request.Employee.cadre },
        });
        console.log(
          `Updated request ${request.id} for ${request.Employee.name}: originalCadre = "${request.Employee.cadre}"`
        );
        updatedCount++;
      } else {
        console.log(
          `Skipped request ${request.id}: Employee has no cadre set`
        );
        skippedCount++;
      }
    } else {
      console.log(
        `Skipped request ${request.id}: Already approved (cannot determine original cadre)`
      );
      skippedCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total requests processed: ${requestsWithoutOriginalCadre.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log('\nDone!');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
