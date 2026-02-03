#!/usr/bin/env npx tsx

/**
 * Retry Failed Wizara ya Elimu Employees (Sequential)
 *
 * This script identifies employees from Wizara ya Elimu who failed document fetch
 * and retries them one at a time (sequentially) to improve success rate.
 *
 * Usage: npx tsx scripts/retry-failed-wizara-employees.ts [options]
 *
 * Options:
 *   --institution-id=<id>    Institution ID (default: cmd06nn7r0002e67w8df8thtn for Wizara ya Elimu)
 *   --delay=<ms>             Delay between requests in milliseconds (default: 3000)
 *   --offset=<n>             Skip first N failed employees (default: 0)
 *   --limit=<n>              Limit total employees to retry (optional)
 *   --retry-all              Retry all employees, not just those without documents
 *
 * Examples:
 *   # Retry failed employees from Wizara ya Elimu
 *   npx tsx scripts/retry-failed-wizara-employees.ts
 *
 *   # Start from the 100th failed employee
 *   npx tsx scripts/retry-failed-wizara-employees.ts --offset=100
 *
 *   # Retry only 50 employees for testing
 *   npx tsx scripts/retry-failed-wizara-employees.ts --limit=50
 */

import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

// Get base URL
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const API_BASE_URL = rawBaseUrl.replace(/\/api$/, '');

// Default configuration
const DEFAULT_INSTITUTION_ID = 'cmd06nn7r0002e67w8df8thtn'; // Wizara ya Elimu
const DEFAULT_DELAY = 3000; // 3 seconds between requests
const REQUEST_TIMEOUT = 120000; // 120 second timeout per request

interface Employee {
  id: string;
  name: string;
  payrollNumber: string | null;
  zanId: string | null;
}

interface RetryResult {
  employeeId: string;
  employeeName: string;
  payrollNumber: string | null;
  status: 'success' | 'failed' | 'skipped';
  documentsCount: number;
  message?: string;
  error?: string;
  duration: number;
}

// Parse command line arguments
function parseArgs(): {
  institutionId: string;
  delay: number;
  offset: number;
  limit?: number;
  retryAll: boolean;
} {
  const args = process.argv.slice(2);

  const institutionIdArg = args.find(arg => arg.startsWith('--institution-id='));
  const delayArg = args.find(arg => arg.startsWith('--delay='));
  const offsetArg = args.find(arg => arg.startsWith('--offset='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const retryAllArg = args.find(arg => arg === '--retry-all');

  return {
    institutionId: institutionIdArg?.split('=')[1] || DEFAULT_INSTITUTION_ID,
    delay: delayArg ? parseInt(delayArg.split('=')[1]) : DEFAULT_DELAY,
    offset: offsetArg ? parseInt(offsetArg.split('=')[1]) : 0,
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : undefined,
    retryAll: !!retryAllArg,
  };
}

// Sleep utility
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format time remaining
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Retry document fetch for a single employee
async function retryEmployeeDocuments(
  employee: Employee,
  index: number,
  total: number
): Promise<RetryResult> {
  const startTime = Date.now();

  // Skip if no payrollNumber or zanId
  if (!employee.payrollNumber && !employee.zanId) {
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      payrollNumber: employee.payrollNumber,
      status: 'skipped',
      documentsCount: 0,
      message: 'No payrollNumber or zanId',
      duration: Date.now() - startTime,
    };
  }

  console.log(`\n[$${index}/${total}] 📄 Fetching: ${employee.name}`);
  console.log(`   Payroll: ${employee.payrollNumber || 'N/A'} | ZanID: ${employee.zanId || 'N/A'}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(
      `${API_BASE_URL}/api/employees/${employee.id}/fetch-documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (result.success) {
      const documentsCount = Object.keys(result.data?.documentsStored || {}).length +
                            (result.data?.certificatesStored?.length || 0);

      const statusEmoji = documentsCount > 0 ? '✅' : '⚠️';
      console.log(`   ${statusEmoji} ${result.message || 'Completed'}`);
      console.log(`   📦 Documents: ${documentsCount} | Duration: ${(duration / 1000).toFixed(1)}s`);

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        payrollNumber: employee.payrollNumber,
        status: documentsCount > 0 ? 'success' : 'failed',
        documentsCount,
        message: result.message,
        duration,
      };
    } else {
      console.log(`   ❌ Failed: ${result.message}`);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        payrollNumber: employee.payrollNumber,
        status: 'failed',
        documentsCount: 0,
        error: result.message,
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.log(`   ❌ Error: ${errorMessage}`);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      payrollNumber: employee.payrollNumber,
      status: 'failed',
      documentsCount: 0,
      error: errorMessage,
      duration,
    };
  }
}

// Save failed employees to log file
function saveFailedEmployees(institutionId: string, failedResults: RetryResult[]): void {
  const logsDir = path.join(process.cwd(), 'scripts/logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `failed-retry-${institutionId}-${timestamp}.json`);

  const logData = {
    institutionId,
    timestamp: new Date().toISOString(),
    totalFailed: failedResults.length,
    employees: failedResults.map(r => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      payrollNumber: r.payrollNumber,
      error: r.error,
    })),
  };

  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  console.log(`\n📝 Failed employees saved to: ${logFile}`);
}

// Save success summary
function saveSummary(institutionId: string, results: RetryResult[], duration: number): void {
  const logsDir = path.join(process.cwd(), 'scripts/logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFile = path.join(logsDir, `retry-summary-${institutionId}-${timestamp}.json`);

  const summary = {
    institutionId,
    timestamp: new Date().toISOString(),
    duration: `${formatTime(duration)}`,
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    successRate: results.length > 0
      ? `${((results.filter(r => r.status === 'success').length / results.length) * 100).toFixed(1)}%`
      : '0%',
  };

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`📊 Summary saved to: ${summaryFile}`);
}

async function main() {
  const config = parseArgs();

  console.log('🔄 Sequential Retry Script for Failed Employees\n');
  console.log('═'.repeat(80));
  console.log(`Institution ID: ${config.institutionId}`);
  console.log(`Delay Between Requests: ${config.delay}ms`);
  console.log(`Starting Offset: ${config.offset}`);
  if (config.limit) console.log(`Limit: ${config.limit} employees`);
  console.log(`Mode: ${config.retryAll ? 'Retry All' : 'Only Failed (no documents in MinIO)'}`);
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

    console.log(`\n🏛️  Institution: ${institution.name}`);
    console.log(`   Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}\n`);

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

    console.log(`📊 Total employees in institution: ${allEmployees.length}`);

    // Filter employees based on mode
    let failedEmployees;
    if (config.retryAll) {
      // Retry all employees with payroll numbers
      failedEmployees = allEmployees.filter(emp => emp.payrollNumber || emp.zanId);
      console.log(`   🔄 Retrying all ${failedEmployees.length} employees with IDs`);
    } else {
      // Only retry employees without documents in MinIO
      failedEmployees = allEmployees.filter(emp => {
        // Must have payroll number or zanId
        if (!emp.payrollNumber && !emp.zanId) return false;

        // Check if employee has NO documents in MinIO
        const hasArdhilHali = emp.ardhilHaliUrl?.startsWith('/api/files/');
        const hasJobContract = emp.jobContractUrl?.startsWith('/api/files/');
        const hasBirthCert = emp.birthCertificateUrl?.startsWith('/api/files/');
        const hasConfirmation = emp.confirmationLetterUrl?.startsWith('/api/files/');

        // Only include employees with NO documents
        return !(hasArdhilHali || hasJobContract || hasBirthCert || hasConfirmation);
      });

      const alreadySuccessful = allEmployees.length - failedEmployees.length;
      console.log(`   ✅ ${alreadySuccessful} employees already have documents`);
      console.log(`   ❌ ${failedEmployees.length} employees need retry`);
    }

    if (failedEmployees.length === 0) {
      console.log('\n🎉 Great! All employees already have documents!');
      return;
    }

    // Apply offset and limit
    let employeesToRetry = failedEmployees.slice(config.offset);
    if (config.limit) {
      employeesToRetry = employeesToRetry.slice(0, config.limit);
    }

    console.log(`\n🔄 Retrying ${employeesToRetry.length} employees (starting from #${config.offset + 1})\n`);

    if (employeesToRetry.length === 0) {
      console.log('⚠️  No employees to retry');
      return;
    }

    const startTime = Date.now();
    const allResults: RetryResult[] = [];

    // Process employees sequentially
    for (let i = 0; i < employeesToRetry.length; i++) {
      const employee = employeesToRetry[i];

      const result = await retryEmployeeDocuments(
        employee,
        i + 1,
        employeesToRetry.length
      );

      allResults.push(result);

      // Display running stats
      const successful = allResults.filter(r => r.status === 'success').length;
      const failed = allResults.filter(r => r.status === 'failed').length;
      const skipped = allResults.filter(r => r.status === 'skipped').length;
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = allResults.length / elapsed;
      const remaining = employeesToRetry.length - allResults.length;
      const estimatedSeconds = remaining / rate;

      console.log(`   📊 Progress: ${allResults.length}/${employeesToRetry.length} | ✓${successful} ✗${failed} ⊘${skipped} | ETA: ${formatTime(estimatedSeconds)}`);

      // Add delay between requests (except for the last one)
      if (i < employeesToRetry.length - 1) {
        console.log(`   ⏳ Waiting ${config.delay / 1000}s...`);
        await sleep(config.delay);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;

    // Display final summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 FINAL SUMMARY\n');
    console.log('─'.repeat(80));

    const successful = allResults.filter(r => r.status === 'success').length;
    const failed = allResults.filter(r => r.status === 'failed').length;
    const skipped = allResults.filter(r => r.status === 'skipped').length;
    const successRate = allResults.length > 0
      ? ((successful / allResults.length) * 100).toFixed(1)
      : '0.0';

    console.log(`Institution: ${institution.name}`);
    console.log(`Total Employees Retried: ${allResults.length}`);
    console.log(`  ✅ Successful: ${successful}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⊘  Skipped: ${skipped}`);
    console.log(`  ⏱️  Duration: ${formatTime(totalDuration)}`);
    console.log(`  📈 Average Rate: ${(allResults.length / totalDuration).toFixed(2)} employees/second`);
    console.log(`  📊 Success Rate: ${successRate}%\n`);

    // Save results to files
    const failedResults = allResults.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
      saveFailedEmployees(config.institutionId, failedResults);

      console.log(`\n❌ Failed Employees (${failedResults.length}):`);
      if (failedResults.length <= 20) {
        failedResults.forEach((r, idx) => {
          console.log(`   ${idx + 1}. ${r.employeeName} (${r.payrollNumber || 'No payroll'})`);
          console.log(`      Error: ${r.error || 'Unknown error'}`);
        });
      } else {
        console.log(`   (List saved to log file - too many to display)`);
      }
    }

    saveSummary(config.institutionId, allResults, totalDuration);

    console.log('\n═'.repeat(80));
    console.log('✅ Retry process completed!\n');

    // Next steps
    if (failed > 0) {
      console.log('💡 Recommendations:');
      console.log('   • Check the failed employees log file for details');
      console.log('   • You can retry failed employees again with:');
      console.log(`     npx tsx scripts/retry-failed-wizara-employees.ts --offset=${config.offset + allResults.length}\n`);
    }

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
