/**
 * Fix Auth InstitutionId Script
 *
 * This script checks and fixes user authentication data to ensure institutionId
 * is properly included in the auth state.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-auth-institutionId.ts [username]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];

  if (!username) {
    console.error('Usage: npx ts-node --compiler-options \'{"module":"commonjs"}\' scripts/fix-auth-institutionId.ts [username]');
    process.exit(1);
  }

  try {
    // Find user
    const user = await prisma.user.findFirst({
      where: { username },
    });

    if (!user) {
      console.error(`❌ User '${username}' not found`);
      process.exit(1);
    }

    console.log('\n=== User Information ===');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('InstitutionId:', user.institutionId || '(not set)');
    console.log('Active:', user.active);

    if (!user.institutionId) {
      console.error('\n❌ User has no institutionId assigned in database!');
      console.log('Please assign an institution to this user first.');
      process.exit(1);
    }

    // Get institution details
    const institution = await prisma.institution.findUnique({
      where: { id: user.institutionId },
    });

    if (institution) {
      console.log('\n=== Institution Information ===');
      console.log('Name:', institution.name);
      console.log('Manual Entry Enabled:', institution.manualEntryEnabled);
      console.log('Start Date:', institution.manualEntryStartDate?.toISOString() || '(not set)');
      console.log('End Date:', institution.manualEntryEndDate?.toISOString() || '(not set)');
    }

    console.log('\n=== Authentication Fix Instructions ===');
    console.log('The database shows the user has an institutionId.');
    console.log('To fix the authentication state, the user needs to:');
    console.log('');
    console.log('1. Logout completely');
    console.log('2. Clear browser cache and cookies (or use Ctrl+Shift+R to hard refresh)');
    console.log('3. Login again');
    console.log('');
    console.log('This will refresh the auth state with the correct institutionId.');
    console.log('');
    console.log('Alternative: Clear localStorage in browser console:');
    console.log('  > localStorage.clear()');
    console.log('  > document.cookie = "auth-storage=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"');
    console.log('  > location.reload()');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
