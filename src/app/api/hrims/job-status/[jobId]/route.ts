/**
 * HRIMS Job Status Endpoint (JSON)
 *
 * Simple JSON endpoint for polling job status
 * Used by CLI scripts for non-SSE polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/jobs/hrims-sync-queue';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hrims/job-status/[jobId]
 *
 * Get current job status as JSON (for polling)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { success: false, message: 'Job ID is required' },
      { status: 400 }
    );
  }

  try {
    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: jobStatus.id,
      state: jobStatus.state,
      progress: jobStatus.progress,
      result: jobStatus.result,
      failedReason: jobStatus.failedReason,
      attemptsMade: jobStatus.attemptsMade,
      timestamp: jobStatus.timestamp,
      processedOn: jobStatus.processedOn,
      finishedOn: jobStatus.finishedOn,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to get job status',
      },
      { status: 500 }
    );
  }
}
