#!/usr/bin/env npx tsx

/**
 * Continue Sequential Document Fetch for WIZARA YA ELIMU
 *
 * This script continues the sequential document fetching that was working before.
 * It will automatically skip employees who already have documents in MinIO.
 */

import { db } from '../src/lib/db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const INSTITUTION_ID = 'cmd06nn7r0002e67w8df8thtn'; // WIZARA YA ELIMU NA MAFUNZO YA AMALI

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

async function fetchDocumentsSequentially() {
  console.log('🚀 Continuing Sequential Document Fetch for WIZARA YA ELIMU\n');
  console.log('─'.repeat(80));

  try {
    // Get institution details
    const institution = await db.institution.findUnique({
      where: { id: INSTITUTION_ID },
      select: { id: true, name: true, voteNumber: true, tinNumber: true },
    });

    if (!institution) {
      console.error('❌ Institution not found');
      process.exit(1);
    }

    console.log(`\n📋 Institution: ${institution.name}`);
    console.log(`   Vote: ${institution.voteNumber || 'N/A'} | TIN: ${institution.tinNumber || 'N/A'}\n`);

    const startTime = Date.now();

    // Call the API endpoint
    const response = await fetch(
      `${API_BASE_URL}/api/hrims/fetch-documents-by-institution`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: INSTITUTION_ID,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    // Handle streaming response
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
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
          `\n✅ Complete: ${summary.successful} successful, ${summary.partial} partial, ${summary.failed} failed`
        );
        console.log(`⏱️  Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`📊 Success Rate: ${((summary.successful / summary.total) * 100).toFixed(1)}%\n`);
      } else {
        throw new Error('Stream ended without final result');
      }
    } else {
      throw new Error('Expected streaming response');
    }

    console.log('✅ Document fetch completed!\n');

  } catch (error) {
    console.error('\n🚨 Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
fetchDocumentsSequentially().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
