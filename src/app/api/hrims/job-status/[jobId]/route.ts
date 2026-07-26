/**
 * HRIMS Job Status Endpoint (JSON)
 *
 * Simple JSON endpoint for polling job status
 * Used by CLI scripts for non-SSE polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus, canAccessJob } from '@/lib/jobs/hrims-sync-queue';
import { hrimsLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hrims/job-status/[jobId]
 *
 * Get current job status as JSON (for polling)
 */
export const GET = wrapHandler(withAuth(async (request, { auth }) => {
  const url = new URL(request.url);
  const jobId = url.pathname.split('/').filter(Boolean).pop()!;

  if (!jobId) {
    return NextResponse.json(
      { success: false, message: 'Job ID is required' },
      { status: 400 }
    );
  }

  const jobStatus = await getJobStatus(jobId);

  if (!jobStatus) {
    return NextResponse.json(
      { success: false, message: 'Job not found' },
      { status: 404 }
    );
  }

  // SECURITY (Req 16.2): owner-bound access — only the job's initiator (or a
  // user in the synced institution) may read it; Admins may read any job.
  if (!canAccessJob(jobStatus.data, auth)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden: you do not have access to this job' },
      { status: 403 }
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
}, { allowedRoles: ['Admin', 'HHRMD'] }));
