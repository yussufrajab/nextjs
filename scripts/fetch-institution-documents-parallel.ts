#!/usr/bin/env npx tsx

/**
 * Parallel Document Fetching Script for Large Institutions
 *
 * Usage: npx tsx scripts/fetch-institution-documents-parallel.ts [options]
 *
 * Options:
 *   --institution-id=<id>    Institution ID to process (required)
 *   --batch-size=<n>         Number of employees to process in parallel (default: 4)
 *   --offset=<n>             Skip first N employees (default: 0)
 *   --limit=<n>              Limit total employees to process (optional)
 *   --skip-no-ids            Skip employees without zanId or payrollNumber (default: true)
 *
 * Examples:
 *   # Process from employee 7000 onwards with batch size of 5
 *   npx tsx scripts/fetch-institution-documents-parallel.ts --institution-id=xxx --offset=7000 --batch-size=5
 *
 *   # Process only 100 employees for testing
 *   npx tsx scripts/fetch-institution-documents-parallel.ts --institution-id=xxx --limit=100
 *
 * This script significantly improves performance by:
 * 1. Processing multiple employees in parallel (default: 4 concurrent)
 * 2. Skipping employees without required IDs
 * 3. Providing resumable offset support
 * 4. Real-time progress tracking with detailed statistics
 */

import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

// Get base URL
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const API_BASE_URL = rawBaseUrl.replace(/\/api$/, '');

// Default configuration
const DEFAULT_BATCH_SIZE = 4; // Process 4 employees concurrently
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches
const MAX_RETRIES = 2; // Retry failed employees up to 2 times

interface Employee {
  id: string;
  name: string;
  payrollNumber: string | null;
  zanId: string | null;
}

interface ProcessResult {
  employeeId: string;
  employeeName: string;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  documentsCount: number;
  message?: string;
  error?: string;
  duration: number;
}

interface BatchStats {
  total: number;
  processed: number;
  successful: number;
  partial: number;
  failed: number;
  skipped: number;
  startTime: number;
  estimatedTimeRemaining: string;
}

// Parse command line arguments
function parseArgs(): {
  institutionId?: string;
  batchSize: number;
  offset: number;
  limit?: number;
  skipNoIds: boolean;
} {
  const args = process.argv.slice(2);

  const institutionIdArg = args.find(arg => arg.startsWith('--institution-id='));
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const offsetArg = args.find(arg => arg.startsWith('--offset='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const skipNoIdsArg = args.find(arg => arg === '--skip-no-ids=false');

  return {
    institutionId: institutionIdArg?.split('=')[1],
    batchSize: batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : DEFAULT_BATCH_SIZE,
    offset: offsetArg ? parseInt(offsetArg.split('=')[1]) : 0,
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : undefined,
    skipNoIds: !skipNoIdsArg, // Default true, only false if explicitly set
  };
}

// Sleep utility
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch documents for a single employee
async function fetchEmployeeDocuments(
  employee: Employee
): Promise<ProcessResult> {
  const startTime = Date.now();

  // Skip if no payrollNumber or zanId
  if (!employee.payrollNumber && !employee.zanId) {
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      status: 'skipped',
      documentsCount: 0,
      message: 'No payrollNumber or zanId',
      duration: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/employees/${employee.id}/fetch-documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (result.success) {
      const documentsCount = Object.keys(result.data?.documentsStored || {}).length +
                            (result.data?.certificatesStored?.length || 0);

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        status: documentsCount > 0 ? 'success' : 'failed',
        documentsCount,
        message: result.message,
        duration,
      };
    } else {
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        status: 'failed',
        documentsCount: 0,
        error: result.message,
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      status: 'failed',
      documentsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

// Process a batch of employees in parallel
async function processBatch(
  employees: Employee[],
  batchNumber: number,
  totalBatches: number
): Promise<ProcessResult[]> {
  console.log(`\n📦 Batch ${batchNumber}/${totalBatches} - Processing ${employees.length} employees in parallel...`);

  const promises = employees.map(employee =>
    fetchEmployeeDocuments(employee)
  );

  const results = await Promise.all(promises);

  // Display batch results
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`   ✅ Batch complete: ${successful} success, ${failed} failed, ${skipped} skipped (avg ${(avgDuration / 1000).toFixed(1)}s per employee)`);

  return results;
}

// Format time remaining
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

// Calculate and display statistics
function displayStats(stats: BatchStats): void {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rate = stats.processed / elapsed; // employees per second
  const remaining = stats.total - stats.processed;
  const estimatedSeconds = remaining / rate;

  const percentComplete = ((stats.processed / stats.total) * 100).toFixed(1);

  process.stdout.write(
    `\r📊 Progress: ${stats.processed}/${stats.total} (${percentComplete}%) | ` +
    `✓${stats.successful} ⚠${stats.partial} ✗${stats.failed} ⊘${stats.skipped} | ` +
    `ETA: ${formatTimeRemaining(estimatedSeconds)} | ` +
    `Rate: ${rate.toFixed(2)} emp/s`
  );
}

// Save progress to file for resumability
function saveProgress(institutionId: string, offset: number, results: ProcessResult[]): void {
  const stateDir = path.join(process.cwd(), 'scripts/state');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const stateFile = path.join(stateDir, `documents-progress-${institutionId}.json`);
  const state = {
    institutionId,
    lastOffset: offset,
    totalProcessed: results.length,
    timestamp: new Date().toISOString(),
    summary: {
      successful: results.filter(r => r.status === 'success').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    },
  };

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

async function main() {
  const config = parseArgs();

  if (!config.institutionId) {
    console.error('❌ Error: --institution-id is required');
    console.log('\nUsage: npx tsx scripts/fetch-institution-documents-parallel.ts --institution-id=<id> [options]');
    console.log('\nOptions:');
    console.log('  --institution-id=<id>    Institution ID to process (required)');
    console.log('  --batch-size=<n>         Parallel batch size (default: 4)');
    console.log('  --offset=<n>             Skip first N employees (default: 0)');
    console.log('  --limit=<n>              Limit total employees to process');
    console.log('  --skip-no-ids=false      Don\'t skip employees without IDs');
    process.exit(1);
  }

  console.log('🚀 Parallel Document Fetching Script\n');
  console.log('─'.repeat(80));
  console.log(`Institution ID: ${config.institutionId}`);
  console.log(`Batch Size: ${config.batchSize} employees in parallel`);
  console.log(`Starting Offset: ${config.offset}`);
  console.log(`Skip No IDs: ${config.skipNoIds ? 'Yes' : 'No'}`);
  if (config.limit) console.log(`Limit: ${config.limit} employees`);
  console.log('─'.repeat(80));

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

    console.log(`\n📋 Institution: ${institution.name}`);
    console.log(`   Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}\n`);

    // Fetch all employees for this institution
    const allEmployeesRaw = await db.employee.findMany({
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

    // Filter employees with IDs if skipNoIds is enabled
    let allEmployees = config.skipNoIds
      ? allEmployeesRaw.filter(emp => emp.payrollNumber || emp.zanId)
      : allEmployeesRaw;

    // Filter out employees who already have documents in MinIO (to avoid re-processing)
    const employeesWithoutDocs = allEmployees.filter(emp => {
      const hasArdhilHali = emp.ardhilHaliUrl?.startsWith('/api/files/');
      const hasJobContract = emp.jobContractUrl?.startsWith('/api/files/');
      const hasBirthCert = emp.birthCertificateUrl?.startsWith('/api/files/');
      const hasConfirmation = emp.confirmationLetterUrl?.startsWith('/api/files/');
      return !(hasArdhilHali || hasJobContract || hasBirthCert || hasConfirmation);
    });

    const alreadyProcessed = allEmployees.length - employeesWithoutDocs.length;
    if (alreadyProcessed > 0) {
      console.log(`   ⏭️  Skipping ${alreadyProcessed} employees who already have documents in MinIO`);
    }

    allEmployees = employeesWithoutDocs;

    console.log(`📊 Total employees in database: ${allEmployees.length}`);

    if (config.skipNoIds) {
      const totalInInstitution = await db.employee.count({
        where: { institutionId: config.institutionId },
      });
      const skippedCount = totalInInstitution - allEmployees.length;
      if (skippedCount > 0) {
        console.log(`   ⊘ Skipped ${skippedCount} employees without zanId or payrollNumber`);
      }
    }

    // Apply offset and limit
    let employeesToProcess = allEmployees.slice(config.offset);
    if (config.limit) {
      employeesToProcess = employeesToProcess.slice(0, config.limit);
    }

    console.log(`📦 Processing ${employeesToProcess.length} employees (starting from #${config.offset + 1})\n`);

    if (employeesToProcess.length === 0) {
      console.log('⚠️  No employees to process');
      return;
    }

    const stats: BatchStats = {
      total: employeesToProcess.length,
      processed: 0,
      successful: 0,
      partial: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      estimatedTimeRemaining: 'Calculating...',
    };

    const allResults: ProcessResult[] = [];

    // Process in batches
    const totalBatches = Math.ceil(employeesToProcess.length / config.batchSize);

    for (let i = 0; i < employeesToProcess.length; i += config.batchSize) {
      const batch = employeesToProcess.slice(i, i + config.batchSize);
      const batchNumber = Math.floor(i / config.batchSize) + 1;

      const results = await processBatch(
        batch,
        batchNumber,
        totalBatches
      );

      allResults.push(...results);

      // Update statistics
      stats.processed += results.length;
      stats.successful += results.filter(r => r.status === 'success').length;
      stats.partial += results.filter(r => r.status === 'partial').length;
      stats.failed += results.filter(r => r.status === 'failed').length;
      stats.skipped += results.filter(r => r.status === 'skipped').length;

      displayStats(stats);

      // Save progress periodically (every 10 batches)
      if (batchNumber % 10 === 0) {
        saveProgress(config.institutionId, config.offset + stats.processed, allResults);
      }

      // Add delay between batches (except for the last one)
      if (i + config.batchSize < employeesToProcess.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 FINAL SUMMARY\n');
    console.log('─'.repeat(80));

    const totalDuration = (Date.now() - stats.startTime) / 1000;
    console.log(`Institution: ${institution.name}`);
    console.log(`Total Employees Processed: ${stats.total}`);
    console.log(`  ✅ Successful: ${stats.successful}`);
    console.log(`  ⚠️  Partial: ${stats.partial}`);
    console.log(`  ❌ Failed: ${stats.failed}`);
    console.log(`  ⊘  Skipped: ${stats.skipped}`);
    console.log(`  ⏱️  Duration: ${formatTimeRemaining(totalDuration)}`);
    console.log(`  📈 Average Rate: ${(stats.total / totalDuration).toFixed(2)} employees/second`);

    const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0.0';
    console.log(`  📊 Success Rate: ${successRate}%\n`);

    // Save final progress
    saveProgress(config.institutionId, config.offset + stats.processed, allResults);

    // Display failed employees if any
    const failedResults = allResults.filter(r => r.status === 'failed');
    if (failedResults.length > 0 && failedResults.length <= 20) {
      console.log('❌ Failed Employees:');
      failedResults.forEach(r => {
        console.log(`   • ${r.employeeName}: ${r.error || 'Unknown error'}`);
      });
      console.log('');
    } else if (failedResults.length > 20) {
      console.log(`❌ ${failedResults.length} employees failed (too many to list)\n`);
    }

    console.log('═'.repeat(80));
    console.log('✅ Document fetch completed!\n');

    // Next steps
    if (stats.processed < allEmployees.length) {
      const nextOffset = config.offset + stats.processed;
      console.log('📝 To continue from where you left off, run:');
      console.log(`npx tsx scripts/fetch-institution-documents-parallel.ts --institution-id=${config.institutionId} --offset=${nextOffset} --batch-size=${config.batchSize}\n`);
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
