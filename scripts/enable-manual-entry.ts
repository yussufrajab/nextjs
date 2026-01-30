#!/usr/bin/env tsx

/**
 * Enable Manual Entry for an Institution
 * Usage: npx tsx scripts/enable-manual-entry.ts <institutionId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableManualEntry(institutionId: string) {
  try {
    // First, check if institution exists
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        id: true,
        name: true,
        manualEntryEnabled: true,
        manualEntryStartDate: true,
        manualEntryEndDate: true,
      },
    });

    if (!institution) {
      console.error(`❌ Institution with ID "${institutionId}" not found`);
      process.exit(1);
    }

    console.log('📋 Current Settings:');
    console.log(`   Institution: ${institution.name}`);
    console.log(`   ID: ${institution.id}`);
    console.log(`   Manual Entry Enabled: ${institution.manualEntryEnabled}`);
    console.log(`   Start Date: ${institution.manualEntryStartDate || 'Not set'}`);
    console.log(`   End Date: ${institution.manualEntryEndDate || 'Not set'}`);
    console.log('');

    // Enable manual entry
    const updated = await prisma.institution.update({
      where: { id: institutionId },
      data: {
        manualEntryEnabled: true,
        // Set time window to 1 year from now
        manualEntryStartDate: new Date(),
        manualEntryEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('✅ Manual Entry Enabled Successfully!');
    console.log(`   Institution: ${updated.name}`);
    console.log(`   Enabled: ${updated.manualEntryEnabled}`);
    console.log(`   Start Date: ${updated.manualEntryStartDate}`);
    console.log(`   End Date: ${updated.manualEntryEndDate}`);
    console.log('');
    console.log('💡 HRO users from this institution can now see the "Add Employee" menu item.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get institution ID from command line
const institutionId = process.argv[2];

if (!institutionId) {
  console.log('Usage: npx tsx scripts/enable-manual-entry.ts <institutionId>');
  console.log('');
  console.log('To find institution IDs, use:');
  console.log('  npx tsx -e "import {PrismaClient} from \'@prisma/client\'; const p = new PrismaClient(); p.institution.findMany({select:{id:true,name:true}}).then(console.log)"');
  process.exit(1);
}

enableManualEntry(institutionId);
