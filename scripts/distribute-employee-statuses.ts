import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee statuses to distribute (excluding "On Probation" which we already did)
const STATUSES_TO_DISTRIBUTE = [
  'On LWOP',
  'Retired',
  'Resigned',
  'Terminated',
  'Dismissed',
];

const EMPLOYEES_PER_STATUS = 100;

async function distributeEmployeeStatuses() {
  try {
    console.log('🔍 Finding WIZARA YA AFYA institution...');

    // Find the institution
    const institution = await prisma.institution.findFirst({
      where: {
        name: {
          contains: 'WIZARA YA AFYA',
          mode: 'insensitive',
        },
      },
    });

    if (!institution) {
      console.error('❌ Institution "WIZARA YA AFYA" not found');
      return;
    }

    console.log(`✅ Found institution: ${institution.name} (ID: ${institution.id})`);

    // Count confirmed employees
    const confirmedCount = await prisma.employee.count({
      where: {
        institutionId: institution.id,
        status: 'Confirmed',
      },
    });

    console.log(`📊 Total confirmed employees: ${confirmedCount}`);

    const totalNeeded = STATUSES_TO_DISTRIBUTE.length * EMPLOYEES_PER_STATUS;
    console.log(`📊 Total employees needed: ${totalNeeded} (${EMPLOYEES_PER_STATUS} per status)`);

    if (confirmedCount < totalNeeded) {
      console.error(
        `❌ Not enough confirmed employees. Need ${totalNeeded}, but only ${confirmedCount} available`
      );
      return;
    }

    // Get confirmed employees to distribute
    const employeesToDistribute = await prisma.employee.findMany({
      where: {
        institutionId: institution.id,
        status: 'Confirmed',
      },
      select: {
        id: true,
        name: true,
        zanId: true,
        status: true,
      },
      take: totalNeeded,
    });

    console.log(`\n🎯 Selected ${employeesToDistribute.length} confirmed employees to distribute`);
    console.log(`\n📋 Status distribution plan:`);
    STATUSES_TO_DISTRIBUTE.forEach((status, idx) => {
      const start = idx * EMPLOYEES_PER_STATUS;
      const end = start + EMPLOYEES_PER_STATUS;
      console.log(`   ${idx + 1}. ${status}: ${EMPLOYEES_PER_STATUS} employees (indices ${start}-${end - 1})`);
    });

    console.log('\n⚠️  ABOUT TO UPDATE EMPLOYEE STATUSES');
    console.log(`   Institution: ${institution.name}`);
    console.log(`   Total employees to update: ${employeesToDistribute.length}`);

    const updateResults: Array<{ status: string; count: number; sample: string[] }> = [];

    // Distribute employees to each status
    for (let i = 0; i < STATUSES_TO_DISTRIBUTE.length; i++) {
      const status = STATUSES_TO_DISTRIBUTE[i];
      const start = i * EMPLOYEES_PER_STATUS;
      const end = start + EMPLOYEES_PER_STATUS;
      const employeesForStatus = employeesToDistribute.slice(start, end);
      const employeeIds = employeesForStatus.map((emp) => emp.id);

      console.log(`\n🔄 Updating ${employeesForStatus.length} employees to "${status}"...`);

      // Show sample
      const sample = employeesForStatus.slice(0, 3).map((emp) => `${emp.name} (${emp.zanId})`);
      console.log(`   Sample: ${sample.join(', ')}`);

      // Update the status
      const updateResult = await prisma.employee.updateMany({
        where: {
          id: {
            in: employeeIds,
          },
        },
        data: {
          status: status,
        },
      });

      console.log(`   ✅ Updated ${updateResult.count} employees`);

      // Verify
      const verifyCount = await prisma.employee.count({
        where: {
          id: {
            in: employeeIds,
          },
          status: status,
        },
      });

      console.log(`   ✅ Verification: ${verifyCount} employees now have "${status}" status`);

      updateResults.push({
        status,
        count: updateResult.count,
        sample: sample,
      });
    }

    // Show final statistics
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL STATUS DISTRIBUTION FOR WIZARA YA AFYA');
    console.log('='.repeat(70));

    const finalStats = await prisma.employee.groupBy({
      by: ['status'],
      where: {
        institutionId: institution.id,
      },
      _count: {
        status: true,
      },
      orderBy: {
        _count: {
          status: 'desc',
        },
      },
    });

    finalStats.forEach((stat) => {
      const isUpdated = STATUSES_TO_DISTRIBUTE.includes(stat.status || '');
      const emoji = isUpdated ? '✨' : '  ';
      console.log(`${emoji} ${stat.status || 'Unknown'}: ${stat._count.status} employees`);
    });

    console.log('\n📋 Update Summary:');
    updateResults.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.status}: ${result.count} employees`);
      console.log(`   Sample: ${result.sample.join(', ')}`);
    });

    console.log('\n✅ All status updates completed successfully!');
  } catch (error) {
    console.error('❌ Error distributing employee statuses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
distributeEmployeeStatuses()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
