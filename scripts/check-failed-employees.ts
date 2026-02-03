#!/usr/bin/env npx tsx

/**
 * Check Failed Employees Status
 *
 * This script checks which employees from an institution failed to fetch documents
 * and provides a summary of their status.
 *
 * Usage: npx tsx scripts/check-failed-employees.ts [options]
 *
 * Options:
 *   --institution-id=<id>    Institution ID (default: cmd06nn7r0002e67w8df8thtn for Wizara ya Elimu)
 *   --show-details           Show detailed list of failed employees (default: false)
 *   --limit=<n>              Limit number of failed employees to display (default: 50)
 */

import { db } from '../src/lib/db';

// Default configuration
const DEFAULT_INSTITUTION_ID = 'cmd06nn7r0002e67w8df8thtn'; // Wizara ya Elimu

// Parse command line arguments
function parseArgs(): {
  institutionId: string;
  showDetails: boolean;
  limit: number;
} {
  const args = process.argv.slice(2);

  const institutionIdArg = args.find(arg => arg.startsWith('--institution-id='));
  const showDetailsArg = args.find(arg => arg === '--show-details');
  const limitArg = args.find(arg => arg.startsWith('--limit='));

  return {
    institutionId: institutionIdArg?.split('=')[1] || DEFAULT_INSTITUTION_ID,
    showDetails: !!showDetailsArg,
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : 50,
  };
}

async function main() {
  const config = parseArgs();

  console.log('📊 Failed Employees Status Check\n');
  console.log('═'.repeat(80));

  try {
    // Fetch institution details
    const institution = await db.institution.findUnique({
      where: { id: config.institutionId },
      select: { id: true, name: true, voteNumber: true, tinNumber: true },
    });

    if (!institution) {
      console.error(`❌ Institution not found: ${config.institutionId}`);
      process.exit(1);
    }

    console.log(`Institution: ${institution.name}`);
    console.log(`Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}`);
    console.log('═'.repeat(80));

    // Fetch all employees for this institution
    const allEmployees = await db.employee.findMany({
      where: { institutionId: config.institutionId },
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        zanId: true,
        ardhilHaliUrl: true,
        jobContractUrl: true,
        birthCertificateUrl: true,
        confirmationLetterUrl: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`\n📊 Total Employees: ${allEmployees.length}\n`);

    // Categorize employees
    const withPayrollOrZanId = allEmployees.filter(emp => emp.payrollNumber || emp.zanId);
    const withoutIds = allEmployees.filter(emp => !emp.payrollNumber && !emp.zanId);

    console.log(`Employees with IDs (payroll/zanId): ${withPayrollOrZanId.length}`);
    console.log(`Employees without IDs: ${withoutIds.length}\n`);

    // Check document status
    const employeesWithDocs = withPayrollOrZanId.filter(emp => {
      const hasArdhilHali = emp.ardhilHaliUrl?.startsWith('/api/files/');
      const hasJobContract = emp.jobContractUrl?.startsWith('/api/files/');
      const hasBirthCert = emp.birthCertificateUrl?.startsWith('/api/files/');
      const hasConfirmation = emp.confirmationLetterUrl?.startsWith('/api/files/');
      return hasArdhilHali || hasJobContract || hasBirthCert || hasConfirmation;
    });

    const employeesWithoutDocs = withPayrollOrZanId.filter(emp => {
      const hasArdhilHali = emp.ardhilHaliUrl?.startsWith('/api/files/');
      const hasJobContract = emp.jobContractUrl?.startsWith('/api/files/');
      const hasBirthCert = emp.birthCertificateUrl?.startsWith('/api/files/');
      const hasConfirmation = emp.confirmationLetterUrl?.startsWith('/api/files/');
      return !(hasArdhilHali || hasJobContract || hasBirthCert || hasConfirmation);
    });

    const successRate = withPayrollOrZanId.length > 0
      ? ((employeesWithDocs.length / withPayrollOrZanId.length) * 100).toFixed(1)
      : '0.0';

    console.log('─'.repeat(80));
    console.log('DOCUMENT FETCH STATUS\n');
    console.log(`✅ Employees with documents in MinIO: ${employeesWithDocs.length}`);
    console.log(`❌ Employees without documents: ${employeesWithoutDocs.length}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log('─'.repeat(80));

    // Document type breakdown for successful employees
    let ardhilHaliCount = 0;
    let jobContractCount = 0;
    let birthCertCount = 0;
    let confirmationCount = 0;

    employeesWithDocs.forEach(emp => {
      if (emp.ardhilHaliUrl?.startsWith('/api/files/')) ardhilHaliCount++;
      if (emp.jobContractUrl?.startsWith('/api/files/')) jobContractCount++;
      if (emp.birthCertificateUrl?.startsWith('/api/files/')) birthCertCount++;
      if (emp.confirmationLetterUrl?.startsWith('/api/files/')) confirmationCount++;
    });

    console.log('\nDOCUMENT TYPE BREAKDOWN (Successful Employees)\n');
    console.log(`📄 Ardhil Hali: ${ardhilHaliCount}`);
    console.log(`📄 Job Contract: ${jobContractCount}`);
    console.log(`📄 Birth Certificate: ${birthCertCount}`);
    console.log(`📄 Confirmation Letter: ${confirmationCount}`);
    console.log('─'.repeat(80));

    // Show failed employees details if requested
    if (config.showDetails && employeesWithoutDocs.length > 0) {
      console.log(`\n❌ FAILED EMPLOYEES (showing first ${config.limit}):\n`);

      const displayCount = Math.min(employeesWithoutDocs.length, config.limit);
      for (let i = 0; i < displayCount; i++) {
        const emp = employeesWithoutDocs[i];
        console.log(`${i + 1}. ${emp.name}`);
        console.log(`   Payroll: ${emp.payrollNumber || 'N/A'} | ZanID: ${emp.zanId || 'N/A'}`);
        console.log(`   ID: ${emp.id}`);
        console.log('');
      }

      if (employeesWithoutDocs.length > config.limit) {
        console.log(`... and ${employeesWithoutDocs.length - config.limit} more\n`);
      }
    }

    console.log('\n💡 NEXT STEPS:\n');
    if (employeesWithoutDocs.length > 0) {
      console.log('To retry failed employees, run:');
      console.log(`npx tsx scripts/retry-failed-wizara-employees.ts\n`);
      console.log('To see detailed list of failed employees:');
      console.log(`npx tsx scripts/check-failed-employees.ts --show-details\n`);
      console.log('To retry a limited number (for testing):');
      console.log(`npx tsx scripts/retry-failed-wizara-employees.ts --limit=10\n`);
    } else {
      console.log('🎉 All employees with IDs have documents! No retry needed.\n');
    }

    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n🚨 Fatal error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
