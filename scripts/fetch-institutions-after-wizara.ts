#!/usr/bin/env npx tsx

/**
 * Fetch documents for institutions AFTER WIZARA YA ELIMU (alphabetically)
 *
 * This script continues from where WIZARA YA ELIMU would be,
 * processing only institutions that come after it in alphabetical order.
 */

import { db } from '../src/lib/db';

// Get base URL and remove trailing /api if present
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const API_BASE_URL = rawBaseUrl.replace(/\/api$/, '');
const DELAY_BETWEEN_INSTITUTIONS = 3000; // 3 seconds

interface Institution {
  id: string;
  name: string;
  voteNumber: string | null;
  tinNumber: string | null;
}

interface ProcessProgress {
  current: number;
  total: number;
  employee?: string;
  status?: string;
  summary?: {
    successful: number;
    partial: number;
    failed: number;
  };
}

interface FetchResult {
  institutionId: string;
  institutionName: string;
  status: 'success' | 'failed' | 'skipped';
  summary?: {
    total: number;
    successful: number;
    partial: number;
    failed: number;
  };
  error?: string;
  duration?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDocumentsForInstitution(
  institution: Institution
): Promise<FetchResult> {
  const startTime = Date.now();

  console.log(`\n📄 Processing: ${institution.name}`);
  console.log(
    `   Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}`
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/hrims/fetch-documents-by-institution`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: institution.id,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    // Check if response is streaming
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let latestProgress: ProcessProgress | null = null;
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              latestProgress = data;
              // Show inline progress
              const summary = data.summary || {
                successful: 0,
                partial: 0,
                failed: 0,
              };
              process.stdout.write(
                `\r   Progress: ${data.current}/${data.total} - ${data.employee || 'Processing...'} ` +
                  `[✓${summary.successful} ⚠${summary.partial} ✗${summary.failed}]`
              );
            } else if (data.type === 'complete') {
              finalResult = data;
              console.log(''); // New line after progress
            }
          }
        }
      }

      const duration = Date.now() - startTime;

      if (finalResult && finalResult.success) {
        const summary = finalResult.summary;
        console.log(
          `   ✅ Complete: ${summary.successful} successful, ${summary.partial} partial, ${summary.failed} failed`
        );
        console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);

        return {
          institutionId: institution.id,
          institutionName: institution.name,
          status: 'success',
          summary: summary,
          duration,
        };
      } else {
        throw new Error('Stream ended without final result');
      }
    } else {
      throw new Error('Expected streaming response');
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.log(`   ❌ Failed: ${errorMessage}`);
    console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      institutionId: institution.id,
      institutionName: institution.name,
      status: 'failed',
      error: errorMessage,
      duration,
    };
  }
}

async function main() {
  console.log('🚀 Fetching documents for institutions AFTER WIZARA YA ELIMU...\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Delay between institutions: ${DELAY_BETWEEN_INSTITUTIONS}ms`);
  console.log('─'.repeat(80));

  try {
    // Fetch all institutions from database
    console.log('\n📋 Fetching institutions from database...');
    const allInstitutions = await db.institution.findMany({
      select: {
        id: true,
        name: true,
        voteNumber: true,
        tinNumber: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`✅ Found ${allInstitutions.length} institutions in database`);

    // Find WIZARA YA ELIMU index
    const wizaraIndex = allInstitutions.findIndex(
      (inst) => inst.name.includes('WIZARA YA ELIMU NA MAFUNZO YA AMALI')
    );

    if (wizaraIndex === -1) {
      console.error('❌ Could not find WIZARA YA ELIMU in database');
      process.exit(1);
    }

    // Get institutions AFTER WIZARA YA ELIMU
    const institutions = allInstitutions.slice(wizaraIndex + 1);

    console.log(`\n⏭️  Skipping first ${wizaraIndex + 1} institutions (up to and including WIZARA YA ELIMU)`);
    console.log(`📋 Processing ${institutions.length} institutions AFTER WIZARA YA ELIMU\n`);

    if (institutions.length === 0) {
      console.log('⚠️  No institutions found after WIZARA YA ELIMU');
      return;
    }

    console.log('Institutions to process:');
    institutions.forEach((inst, i) => {
      console.log(`  ${i + 1}. ${inst.name}`);
    });
    console.log('');

    const results: FetchResult[] = [];
    const startTime = Date.now();

    // Process each institution
    for (let i = 0; i < institutions.length; i++) {
      const institution = institutions[i];

      console.log(
        `\n[${i + 1}/${institutions.length}] Institution: ${institution.name}`
      );

      const result = await fetchDocumentsForInstitution(institution);
      results.push(result);

      // Add delay before next institution (except for the last one)
      if (i < institutions.length - 1) {
        console.log(
          `   ⏳ Waiting ${DELAY_BETWEEN_INSTITUTIONS / 1000}s before next institution...`
        );
        await sleep(DELAY_BETWEEN_INSTITUTIONS);
      }
    }

    // Print final summary
    const totalDuration = Date.now() - startTime;
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 FINAL SUMMARY\n');
    console.log('─'.repeat(80));

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    console.log(`Total Institutions: ${institutions.length}`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(
      `  ⏱️  Total Duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes\n`
    );

    // Employee-level summary
    const totalEmployees = results.reduce(
      (sum, r) => sum + (r.summary?.total || 0),
      0
    );
    const totalSuccessful = results.reduce(
      (sum, r) => sum + (r.summary?.successful || 0),
      0
    );
    const totalPartial = results.reduce(
      (sum, r) => sum + (r.summary?.partial || 0),
      0
    );
    const totalFailed = results.reduce(
      (sum, r) => sum + (r.summary?.failed || 0),
      0
    );

    console.log('Employee Document Results:');
    console.log(`  Total Employees Processed: ${totalEmployees}`);
    console.log(`  ✅ Successful: ${totalSuccessful}`);
    console.log(`  ⚠️  Partial: ${totalPartial}`);
    console.log(`  ❌ Failed: ${totalFailed}\n`);

    const successRate =
      totalEmployees > 0
        ? ((totalSuccessful / totalEmployees) * 100).toFixed(1)
        : '0.0';
    console.log(`Success Rate: ${successRate}%\n`);

    console.log('═'.repeat(80));
    console.log('\n✅ Document fetch completed!\n');

  } catch (error) {
    console.error('\n🚨 Fatal error:', error);
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
