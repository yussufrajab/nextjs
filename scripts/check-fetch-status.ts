#!/usr/bin/env npx tsx

/**
 * Check Document Fetch Status for an Institution
 *
 * Usage: npx tsx scripts/check-fetch-status.ts [institution-name]
 *
 * Examples:
 *   npx tsx scripts/check-fetch-status.ts "WIZARA YA ELIMU"
 *   npx tsx scripts/check-fetch-status.ts  (shows all institutions)
 */

import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

interface InstitutionStats {
  name: string;
  id: string;
  totalEmployees: number;
  employeesWithIds: number;
  employeesWithDocuments: number;
  employeesWithArdhilHali: number;
  employeesWithJobContract: number;
  employeesWithBirthCert: number;
  employeesWithCertificates: number;
  completionRate: number;
}

async function getInstitutionStats(institutionId: string): Promise<InstitutionStats | null> {
  const institution = await db.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true },
  });

  if (!institution) return null;

  // Get total employees
  const totalEmployees = await db.employee.count({
    where: { institutionId },
  });

  // Get employees with IDs (payrollNumber or zanId)
  const allEmployeesData = await db.employee.findMany({
    where: { institutionId },
    select: { payrollNumber: true, zanId: true },
  });

  const employeesWithIds = allEmployeesData.filter(
    emp => emp.payrollNumber || emp.zanId
  ).length;

  // Get employees with at least one document
  const employeesWithDocuments = await db.employee.count({
    where: {
      institutionId,
      OR: [
        { ardhilHaliUrl: { startsWith: '/api/files/' } },
        { jobContractUrl: { startsWith: '/api/files/' } },
        { birthCertificateUrl: { startsWith: '/api/files/' } },
        { confirmationLetterUrl: { startsWith: '/api/files/' } },
      ],
    },
  });

  // Get counts for specific document types
  const employeesWithArdhilHali = await db.employee.count({
    where: {
      institutionId,
      ardhilHaliUrl: { startsWith: '/api/files/' },
    },
  });

  const employeesWithJobContract = await db.employee.count({
    where: {
      institutionId,
      jobContractUrl: { startsWith: '/api/files/' },
    },
  });

  const employeesWithBirthCert = await db.employee.count({
    where: {
      institutionId,
      birthCertificateUrl: { startsWith: '/api/files/' },
    },
  });

  // Get employees with educational certificates
  const employeesWithCertificates = await db.employee.count({
    where: {
      institutionId,
      EmployeeCertificate: { some: {} },
    },
  });

  const completionRate = employeesWithIds > 0
    ? (employeesWithDocuments / employeesWithIds) * 100
    : 0;

  return {
    name: institution.name,
    id: institution.id,
    totalEmployees,
    employeesWithIds,
    employeesWithDocuments,
    employeesWithArdhilHali,
    employeesWithJobContract,
    employeesWithBirthCert,
    employeesWithCertificates,
    completionRate,
  };
}

function displayStats(stats: InstitutionStats, showProgressState: boolean = false): void {
  console.log('\n' + '═'.repeat(80));
  console.log(`📋 ${stats.name}`);
  console.log('═'.repeat(80));

  console.log('\n📊 Employee Statistics:');
  console.log(`   Total Employees: ${stats.totalEmployees.toLocaleString()}`);
  console.log(`   With IDs (payroll/zan): ${stats.employeesWithIds.toLocaleString()}`);
  console.log(`   Without IDs: ${(stats.totalEmployees - stats.employeesWithIds).toLocaleString()}`);

  console.log('\n📄 Document Coverage:');
  console.log(`   Employees with Documents: ${stats.employeesWithDocuments.toLocaleString()} / ${stats.employeesWithIds.toLocaleString()}`);
  console.log(`   Completion Rate: ${stats.completionRate.toFixed(1)}%`);

  const progressBar = generateProgressBar(stats.completionRate, 40);
  console.log(`   ${progressBar}`);

  console.log('\n📑 Document Types:');
  console.log(`   Ardhil Hali (CV): ${stats.employeesWithArdhilHali.toLocaleString()}`);
  console.log(`   Job Contract: ${stats.employeesWithJobContract.toLocaleString()}`);
  console.log(`   Birth Certificate: ${stats.employeesWithBirthCert.toLocaleString()}`);
  console.log(`   Educational Certificates: ${stats.employeesWithCertificates.toLocaleString()}`);

  console.log('\n📈 Remaining Work:');
  const remaining = stats.employeesWithIds - stats.employeesWithDocuments;
  console.log(`   Employees to Process: ${remaining.toLocaleString()}`);

  if (remaining > 0) {
    const estimatedTime = estimateRemainingTime(remaining, 4); // Assume batch size 4
    console.log(`   Estimated Time (batch=4): ${estimatedTime}`);
  }

  // Show progress state if available
  if (showProgressState) {
    const stateFile = path.join(process.cwd(), 'scripts/state', `documents-progress-${stats.id}.json`);
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      console.log('\n💾 Last Progress State:');
      console.log(`   Last Offset: ${state.lastOffset}`);
      console.log(`   Total Processed: ${state.totalProcessed}`);
      console.log(`   Timestamp: ${new Date(state.timestamp).toLocaleString()}`);
      console.log(`   Summary: ✓${state.summary.successful} ⚠${state.summary.partial} ✗${state.summary.failed} ⊘${state.summary.skipped}`);
    }
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

function generateProgressBar(percentage: number, width: number = 40): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(1)}%`;
}

function estimateRemainingTime(employees: number, batchSize: number): string {
  // Assume 3 seconds per employee with parallel processing
  const secondsPerEmployee = 3;
  const totalSeconds = employees * secondsPerEmployee;

  if (totalSeconds < 3600) {
    return `${Math.round(totalSeconds / 60)} minutes`;
  } else {
    return `${(totalSeconds / 3600).toFixed(1)} hours`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const searchTerm = args[0];

  console.log('🔍 Checking Document Fetch Status...\n');

  try {
    if (searchTerm) {
      // Search for specific institution
      const institutions = await db.institution.findMany({
        where: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      if (institutions.length === 0) {
        console.log(`❌ No institutions found matching: "${searchTerm}"`);
        console.log('\nTry searching for:');
        console.log('  - "WIZARA YA ELIMU"');
        console.log('  - "AFYA"');
        console.log('  - "HALMASHAURI"');
        return;
      }

      console.log(`Found ${institutions.length} matching institution(s):\n`);

      for (const inst of institutions) {
        const stats = await getInstitutionStats(inst.id);
        if (stats) {
          displayStats(stats, true);

          // Show command to resume if needed
          if (stats.employeesWithIds - stats.employeesWithDocuments > 0) {
            console.log('💡 To fetch documents for this institution:');
            console.log(`   npx tsx scripts/fetch-institution-documents-parallel.ts --institution-id="${inst.id}" --batch-size=4\n`);
          }
        }
      }
    } else {
      // Show summary of all institutions with large employee counts
      const institutions = await db.institution.findMany({
        select: { id: true, name: true, _count: { select: { employees: true } } },
        orderBy: { employees: { _count: 'desc' } },
        take: 20, // Top 20 largest institutions
      });

      console.log('Top 20 Institutions by Employee Count:\n');
      console.log('─'.repeat(80));
      console.log(
        'Institution Name'.padEnd(45) +
        'Employees'.padEnd(12) +
        'With Docs'.padEnd(12) +
        'Progress'
      );
      console.log('─'.repeat(80));

      for (const inst of institutions) {
        const stats = await getInstitutionStats(inst.id);
        if (stats && stats.totalEmployees > 0) {
          const progressBar = generateProgressBar(stats.completionRate, 15);
          console.log(
            stats.name.substring(0, 44).padEnd(45) +
            stats.totalEmployees.toLocaleString().padEnd(12) +
            stats.employeesWithDocuments.toLocaleString().padEnd(12) +
            progressBar
          );
        }
      }

      console.log('─'.repeat(80));
      console.log('\n💡 To see details for a specific institution:');
      console.log('   npx tsx scripts/check-fetch-status.ts "INSTITUTION_NAME"\n');
    }
  } catch (error) {
    console.error('\n🚨 Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
