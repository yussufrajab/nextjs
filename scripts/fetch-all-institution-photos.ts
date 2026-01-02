#!/usr/bin/env npx tsx

/**
 * Script to fetch employee photos from HRIMS for all institutions
 *
 * Usage: npx tsx scripts/fetch-all-institution-photos.ts
 *
 * This script:
 * 1. Fetches all institutions from the database
 * 2. For each institution, calls the photo fetch API endpoint
 * 3. Adds a 2-second delay between institutions to avoid overwhelming the HRIMS API
 * 4. Saves all photos to MinIO for later display on employee profiles
 */

import { db } from '../src/lib/db';

// Get base URL and remove trailing /api if present (since we'll add it in the fetch call)
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const API_BASE_URL = rawBaseUrl.replace(/\/api$/, '');
const DELAY_BETWEEN_INSTITUTIONS = 2000; // 2 seconds

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
    success: number;
    failed: number;
    skipped: number;
  };
}

interface FetchResult {
  institutionId: string;
  institutionName: string;
  status: 'success' | 'failed' | 'skipped';
  summary?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  error?: string;
  duration?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPhotosForInstitution(
  institution: Institution
): Promise<FetchResult> {
  const startTime = Date.now();

  console.log(`\n📸 Processing: ${institution.name}`);
  console.log(
    `   Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}`
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/hrims/fetch-photos-by-institution`,
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
              process.stdout.write(
                `\r   Progress: ${data.current}/${data.total} - ${data.employee || 'Processing...'}`
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
        const summary = finalResult.data.summary;
        console.log(
          `   ✅ Complete: ${summary.success} success, ${summary.failed} failed, ${summary.skipped} skipped`
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
      // Handle regular JSON response (backward compatibility)
      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        const summary = result.data.summary;
        console.log(
          `   ✅ Complete: ${summary.success} success, ${summary.failed} failed, ${summary.skipped} skipped`
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
        throw new Error(result.message || 'Failed to fetch photos');
      }
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
  console.log('🚀 Starting bulk photo fetch for all institutions...\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Delay between institutions: ${DELAY_BETWEEN_INSTITUTIONS}ms\n`);
  console.log('─'.repeat(80));

  try {
    // Fetch all institutions from database
    console.log('\n📋 Fetching institutions from database...');
    const institutions = await db.institution.findMany({
      select: {
        id: true,
        name: true,
        voteNumber: true,
        tinNumber: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`✅ Found ${institutions.length} institutions\n`);

    if (institutions.length === 0) {
      console.log('⚠️  No institutions found in database');
      return;
    }

    const results: FetchResult[] = [];
    const startTime = Date.now();

    // Process each institution
    for (let i = 0; i < institutions.length; i++) {
      const institution = institutions[i];

      console.log(
        `\n[${i + 1}/${institutions.length}] Institution: ${institution.name}`
      );

      const result = await fetchPhotosForInstitution(institution);
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
    const skippedCount = results.filter((r) => r.status === 'skipped').length;

    console.log(`Total Institutions: ${institutions.length}`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  ⊘  Skipped: ${skippedCount}`);
    console.log(
      `  ⏱️  Total Duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes\n`
    );

    // Employee-level summary
    const totalEmployees = results.reduce(
      (sum, r) => sum + (r.summary?.total || 0),
      0
    );
    const totalSuccess = results.reduce(
      (sum, r) => sum + (r.summary?.success || 0),
      0
    );
    const totalFailed = results.reduce(
      (sum, r) => sum + (r.summary?.failed || 0),
      0
    );
    const totalSkipped = results.reduce(
      (sum, r) => sum + (r.summary?.skipped || 0),
      0
    );

    console.log('Employee Photo Results:');
    console.log(`  Total Employees Processed: ${totalEmployees}`);
    console.log(`  ✅ Photos Saved: ${totalSuccess}`);
    console.log(`  ❌ Failed: ${totalFailed}`);
    console.log(`  ⊘  Skipped: ${totalSkipped}\n`);

    // Failed institutions detail
    if (failedCount > 0) {
      console.log('❌ Failed Institutions:');
      results
        .filter((r) => r.status === 'failed')
        .forEach((r) => {
          console.log(`   • ${r.institutionName}: ${r.error}`);
        });
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('\n✅ Bulk photo fetch completed!\n');
  } catch (error) {
    console.error('\n🚨 Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
