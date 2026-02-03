#!/usr/bin/env tsx

/**
 * List All Institutions with Manual Entry Status
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listInstitutions() {
  try {
    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        manualEntryEnabled: true,
        manualEntryStartDate: true,
        manualEntryEndDate: true,
        _count: {
          select: {
            User: true,
            Employee: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('📋 Institutions List');
    console.log('=' .repeat(100));
    console.log('');

    institutions.forEach((inst, index) => {
      const status = inst.manualEntryEnabled ? '✅ Enabled' : '❌ Disabled';
      const now = new Date();
      let timeStatus = '';

      if (inst.manualEntryEnabled && inst.manualEntryStartDate && inst.manualEntryEndDate) {
        const inWindow = now >= inst.manualEntryStartDate && now <= inst.manualEntryEndDate;
        timeStatus = inWindow ? '🟢 Active' : '🔴 Outside time window';
      }

      console.log(`${index + 1}. ${inst.name}`);
      console.log(`   ID: ${inst.id}`);
      console.log(`   Manual Entry: ${status} ${timeStatus}`);
      if (inst.manualEntryStartDate) {
        console.log(`   Start: ${inst.manualEntryStartDate.toLocaleString()}`);
      }
      if (inst.manualEntryEndDate) {
        console.log(`   End: ${inst.manualEntryEndDate.toLocaleString()}`);
      }
      console.log(`   Users: ${inst._count.User}, Employees: ${inst._count.Employee}`);
      console.log('');
    });

    console.log('=' .repeat(100));
    console.log(`Total: ${institutions.length} institutions`);
    console.log('');
    console.log('To enable manual entry for an institution:');
    console.log('  npx tsx scripts/enable-manual-entry.ts <institutionId>');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listInstitutions();
