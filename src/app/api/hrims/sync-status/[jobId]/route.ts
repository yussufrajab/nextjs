/**
 * HRIMS Sync Status Endpoint
 *
 * Server-Sent Events (SSE) endpoint for real-time job progress tracking
 * Streams progress updates from background HRIMS sync jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getJobStatus,
  getQueueEvents,
  HRIMS_SYNC_QUEUE_NAME,
} from '@/lib/jobs/hrims-sync-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

/**
 * GET /api/hrims/sync-status/[jobId]
 *
 * Stream real-time progress updates for a HRIMS sync job
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

  // Check if job exists
  const jobStatus = await getJobStatus(jobId);
  if (!jobStatus) {
    return NextResponse.json(
      { success: false, message: 'Job not found' },
      { status: 404 }
    );
  }

  // Create SSE response stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send SSE message
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial job status
        sendEvent('status', {
          jobId,
          state: jobStatus.state,
          progress: jobStatus.progress,
          data: jobStatus.data,
        });

        // If job is already completed or failed, send final status and close
        if (jobStatus.state === 'completed' || jobStatus.state === 'failed') {
          sendEvent(jobStatus.state === 'completed' ? 'complete' : 'error', {
            jobId,
            state: jobStatus.state,
            result: jobStatus.result,
            failedReason: jobStatus.failedReason,
            finishedOn: jobStatus.finishedOn,
          });
          controller.close();
          return;
        }

        // Create queue events listener for real-time updates
        const queueEvents = getQueueEvents();

        // Listen for progress updates
        const handleProgress = async ({
          jobId: eventJobId,
          data,
        }: {
          jobId: string;
          data: any;
        }) => {
          if (eventJobId === jobId) {
            sendEvent('progress', {
              jobId,
              progress: data,
            });
          }
        };

        // Listen for job completion
        const handleCompleted = async ({
          jobId: eventJobId,
          returnvalue,
        }: {
          jobId: string;
          returnvalue: any;
        }) => {
          if (eventJobId === jobId) {
            sendEvent('complete', {
              jobId,
              state: 'completed',
              result: returnvalue,
            });
            cleanup();
            controller.close();
          }
        };

        // Listen for job failure
        const handleFailed = async ({
          jobId: eventJobId,
          failedReason,
        }: {
          jobId: string;
          failedReason: string;
        }) => {
          if (eventJobId === jobId) {
            sendEvent('error', {
              jobId,
              state: 'failed',
              error: failedReason,
            });
            cleanup();
            controller.close();
          }
        };

        // Register event listeners
        queueEvents.on('progress', handleProgress);
        queueEvents.on('completed', handleCompleted);
        queueEvents.on('failed', handleFailed);

        // Cleanup function to remove event listeners
        const cleanup = () => {
          queueEvents.off('progress', handleProgress);
          queueEvents.off('completed', handleCompleted);
          queueEvents.off('failed', handleFailed);
        };

        // Send heartbeat every 15 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            sendEvent('heartbeat', { timestamp: Date.now() });
          } catch (error) {
            clearInterval(heartbeatInterval);
            cleanup();
          }
        }, 15000);

        // Clean up on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          cleanup();
          controller.close();
        });
      } catch (error) {
        console.error('SSE stream error:', error);
        sendEvent('error', {
          jobId,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
        controller.close();
      }
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
