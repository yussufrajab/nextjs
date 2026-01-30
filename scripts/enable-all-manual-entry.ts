#!/usr/bin/env tsx

/**
 * Enable Manual Entry for ALL Institutions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableAllManualEntry() {
  try {
    const now = new Date();
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const result = await prisma.institution.updateMany({
      data: {
        manualEntryEnabled: true,
        manualEntryStartDate: now,
        manualEntryEndDate: oneYearLater,
      },
    });

    console.log('✅ Manual Entry Enabled for ALL Institutions!');
    console.log(`   Updated: ${result.count} institutions`);
    console.log(`   Start Date: ${now.toLocaleString()}`);
    console.log(`   End Date: ${oneYearLater.toLocaleString()}`);
    console.log('');
    console.log('💡 All HRO users can now see the "Add Employee" menu item.');
    console.log('   They need to refresh their browser (Ctrl+Shift+R) to see the change.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableAllManualEntry();
