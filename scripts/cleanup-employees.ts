/**
 * Production Cleanup Script
 * Deletes all employees and related data while preserving institutions and users
 */

import { PrismaClient } from '@prisma/client';
import { Client as MinioClient } from 'minio';

const prisma = new PrismaClient();

// MinIO client configuration
const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'documents';

async function deleteMinioFiles() {
  console.log('\n--- Deleting MinIO Files ---');

  try {
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      console.log(`Bucket ${BUCKET_NAME} does not exist, skipping MinIO cleanup`);
      return;
    }

    // List and delete all objects in the bucket
    const objectsStream = minioClient.listObjects(BUCKET_NAME, '', true);
    const objectsToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      objectsStream.on('data', (obj) => {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      });
      objectsStream.on('error', reject);
      objectsStream.on('end', resolve);
    });

    console.log(`Found ${objectsToDelete.length} files to delete`);

    // Delete in batches
    for (const objectName of objectsToDelete) {
      try {
        await minioClient.removeObject(BUCKET_NAME, objectName);
        console.log(`  Deleted: ${objectName}`);
      } catch (error) {
        console.error(`  Failed to delete ${objectName}:`, error);
      }
    }

    console.log(`MinIO cleanup complete: ${objectsToDelete.length} files deleted`);
  } catch (error) {
    console.error('MinIO cleanup error:', error);
    console.log('Continuing with database cleanup...');
  }
}

async function cleanupDatabase() {
  console.log('\n--- Starting Database Cleanup ---');
  console.log('This will delete all employees and related data while preserving institutions and users.\n');

  // Get counts before deletion
  const beforeCounts = {
    employees: await prisma.employee.count(),
    certificates: await prisma.employeeCertificate.count(),
    promotionRequests: await prisma.promotionRequest.count(),
    confirmationRequests: await prisma.confirmationRequest.count(),
    cadreChangeRequests: await prisma.cadreChangeRequest.count(),
    lwopRequests: await prisma.lwopRequest.count(),
    resignationRequests: await prisma.resignationRequest.count(),
    retirementRequests: await prisma.retirementRequest.count(),
    separationRequests: await prisma.separationRequest.count(),
    serviceExtensionRequests: await prisma.serviceExtensionRequest.count(),
    complaints: await prisma.complaint.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    sessions: await prisma.session.count(),
  };

  console.log('Records to delete:');
  console.log(`  - Employees: ${beforeCounts.employees}`);
  console.log(`  - Certificates: ${beforeCounts.certificates}`);
  console.log(`  - Promotion Requests: ${beforeCounts.promotionRequests}`);
  console.log(`  - Confirmation Requests: ${beforeCounts.confirmationRequests}`);
  console.log(`  - Cadre Change Requests: ${beforeCounts.cadreChangeRequests}`);
  console.log(`  - LWOP Requests: ${beforeCounts.lwopRequests}`);
  console.log(`  - Resignation Requests: ${beforeCounts.resignationRequests}`);
  console.log(`  - Retirement Requests: ${beforeCounts.retirementRequests}`);
  console.log(`  - Separation Requests: ${beforeCounts.separationRequests}`);
  console.log(`  - Service Extension Requests: ${beforeCounts.serviceExtensionRequests}`);
  console.log(`  - Complaints: ${beforeCounts.complaints}`);
  console.log(`  - Notifications: ${beforeCounts.notifications}`);
  console.log(`  - Audit Logs: ${beforeCounts.auditLogs}`);
  console.log(`  - Sessions: ${beforeCounts.sessions}`);

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Delete all HR request types
    console.log('\n1. Deleting HR requests...');

    const deletedPromotion = await tx.promotionRequest.deleteMany();
    console.log(`   - Promotion Requests: ${deletedPromotion.count}`);

    const deletedConfirmation = await tx.confirmationRequest.deleteMany();
    console.log(`   - Confirmation Requests: ${deletedConfirmation.count}`);

    const deletedCadreChange = await tx.cadreChangeRequest.deleteMany();
    console.log(`   - Cadre Change Requests: ${deletedCadreChange.count}`);

    const deletedLwop = await tx.lwopRequest.deleteMany();
    console.log(`   - LWOP Requests: ${deletedLwop.count}`);

    const deletedResignation = await tx.resignationRequest.deleteMany();
    console.log(`   - Resignation Requests: ${deletedResignation.count}`);

    const deletedRetirement = await tx.retirementRequest.deleteMany();
    console.log(`   - Retirement Requests: ${deletedRetirement.count}`);

    const deletedSeparation = await tx.separationRequest.deleteMany();
    console.log(`   - Separation Requests: ${deletedSeparation.count}`);

    const deletedServiceExtension = await tx.serviceExtensionRequest.deleteMany();
    console.log(`   - Service Extension Requests: ${deletedServiceExtension.count}`);

    const deletedComplaints = await tx.complaint.deleteMany();
    console.log(`   - Complaints: ${deletedComplaints.count}`);

    // 2. Delete notifications, audit logs, and sessions
    console.log('\n2. Deleting notifications, audit logs, and sessions...');
    const deletedNotifications = await tx.notification.deleteMany();
    console.log(`   - Notifications: ${deletedNotifications.count}`);

    const deletedAuditLogs = await tx.auditLog.deleteMany();
    console.log(`   - Audit Logs: ${deletedAuditLogs.count}`);

    const deletedSessions = await tx.session.deleteMany();
    console.log(`   - Sessions: ${deletedSessions.count}`);

    // 3. Delete all employee certificates
    console.log('\n3. Deleting employee certificates...');
    const deletedCertificates = await tx.employeeCertificate.deleteMany();
    console.log(`   - Certificates: ${deletedCertificates.count}`);

    // 4. Unlink employees from users (set employeeId to NULL)
    console.log('\n4. Unlinking employees from users...');
    const unlinkedUsers = await tx.user.updateMany({
      where: { employeeId: { not: null } },
      data: { employeeId: null },
    });
    console.log(`   - Users unlinked: ${unlinkedUsers.count}`);

    // 5. Delete all employees
    console.log('\n5. Deleting all employees...');
    const deletedEmployees = await tx.employee.deleteMany();
    console.log(`   - Employees: ${deletedEmployees.count}`);
  });

  // Verify cleanup
  console.log('\n--- Verification ---');
  const afterCounts = {
    employees: await prisma.employee.count(),
    certificates: await prisma.employeeCertificate.count(),
    promotionRequests: await prisma.promotionRequest.count(),
    confirmationRequests: await prisma.confirmationRequest.count(),
    complaints: await prisma.complaint.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    sessions: await prisma.session.count(),
    institutions: await prisma.institution.count(),
    users: await prisma.user.count(),
  };

  console.log('Remaining records (should be 0):');
  console.log(`  - Employees: ${afterCounts.employees}`);
  console.log(`  - Certificates: ${afterCounts.certificates}`);
  console.log(`  - Promotion Requests: ${afterCounts.promotionRequests}`);
  console.log(`  - Confirmation Requests: ${afterCounts.confirmationRequests}`);
  console.log(`  - Complaints: ${afterCounts.complaints}`);
  console.log(`  - Notifications: ${afterCounts.notifications}`);
  console.log(`  - Audit Logs: ${afterCounts.auditLogs}`);
  console.log(`  - Sessions: ${afterCounts.sessions}`);
  console.log('Preserved:');
  console.log(`  - Institutions: ${afterCounts.institutions}`);
  console.log(`  - Users: ${afterCounts.users}`);

  if (afterCounts.employees === 0 && afterCounts.certificates === 0 && afterCounts.complaints === 0) {
    console.log('\n✓ Database cleanup completed successfully!');
  } else {
    console.error('\n✗ Some records may not have been deleted. Please check.');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('PRODUCTION CLEANUP SCRIPT');
  console.log('Deleting all employees and related data');
  console.log('='.repeat(60));

  try {
    // First, clean up database
    await cleanupDatabase();

    // Then, clean up MinIO files
    await deleteMinioFiles();

    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP COMPLETE');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nFatal error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
