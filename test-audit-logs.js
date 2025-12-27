const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditLogs() {
  try {
    console.log('Checking audit logs in database...\n');

    // Get total count
    const total = await prisma.auditLog.count();
    console.log(`Total audit logs: ${total}\n`);

    // Get count by event type
    const byType = await prisma.auditLog.groupBy({
      by: ['eventType', 'eventCategory'],
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc'
        }
      }
    });

    console.log('Logs by type:');
    byType.forEach(item => {
      console.log(`  ${item.eventType} (${item.eventCategory}): ${item._count}`);
    });

    // Get recent REQUEST_APPROVED and REQUEST_REJECTED logs
    console.log('\nRecent REQUEST_APPROVED/REJECTED logs:');
    const recentRequests = await prisma.auditLog.findMany({
      where: {
        OR: [
          { eventType: 'REQUEST_APPROVED' },
          { eventType: 'REQUEST_REJECTED' }
        ]
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 5,
      select: {
        eventType: true,
        username: true,
        userRole: true,
        timestamp: true,
        additionalData: true
      }
    });

    if (recentRequests.length === 0) {
      console.log('  ❌ No REQUEST_APPROVED or REQUEST_REJECTED logs found!');
    } else {
      recentRequests.forEach(log => {
        console.log(`  ${log.eventType} by ${log.username} (${log.userRole}) at ${log.timestamp}`);
        if (log.additionalData) {
          console.log(`    Request: ${log.additionalData.requestType}, Employee: ${log.additionalData.employeeName}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditLogs();
