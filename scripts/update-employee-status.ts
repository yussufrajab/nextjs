import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateEmployeeStatus() {
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

    if (confirmedCount < 300) {
      console.warn(
        `⚠️  Only ${confirmedCount} confirmed employees found, will update all of them`
      );
    }

    // Get random 300 confirmed employees (or all if less than 300)
    const employeesToUpdate = await prisma.employee.findMany({
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
      take: Math.min(300, confirmedCount),
    });

    console.log(`\n🎯 Selected ${employeesToUpdate.length} employees to update`);
    console.log('\nSample of employees to be updated:');
    employeesToUpdate.slice(0, 5).forEach((emp, idx) => {
      console.log(
        `  ${idx + 1}. ${emp.name} (${emp.zanId}) - Current: ${emp.status}`
      );
    });

    // Confirm before proceeding
    console.log('\n⚠️  ABOUT TO UPDATE STATUS FROM "Confirmed" TO "On Probation"');
    console.log(`   Institution: ${institution.name}`);
    console.log(`   Number of employees: ${employeesToUpdate.length}`);

    // Update the status
    const employeeIds = employeesToUpdate.map((emp) => emp.id);

    const updateResult = await prisma.employee.updateMany({
      where: {
        id: {
          in: employeeIds,
        },
      },
      data: {
        status: 'On Probation',
      },
    });

    console.log(
      `\n✅ Successfully updated ${updateResult.count} employees to "On Probation"`
    );

    // Verify the changes
    const verifyCount = await prisma.employee.count({
      where: {
        id: {
          in: employeeIds,
        },
        status: 'On Probation',
      },
    });

    console.log(`✅ Verification: ${verifyCount} employees now have "On Probation" status`);

    // Show updated statistics
    const newStats = await prisma.employee.groupBy({
      by: ['status'],
      where: {
        institutionId: institution.id,
      },
      _count: {
        status: true,
      },
    });

    console.log('\n📊 Updated status distribution for WIZARA YA AFYA:');
    newStats.forEach((stat) => {
      console.log(`   ${stat.status}: ${stat._count.status} employees`);
    });
  } catch (error) {
    console.error('❌ Error updating employee status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateEmployeeStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
