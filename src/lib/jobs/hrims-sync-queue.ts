/**
 * HRIMS Sync Job Queue
 *
 * Background job queue for processing HRIMS data synchronization
 * Uses BullMQ for reliable job processing with Redis
 */

import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../redis';

// Job data interface
export interface HRIMSSyncJobData {
  institutionId: string;
  institutionName: string;
  identifierType: 'votecode' | 'tin';
  voteNumber?: string;
  tinNumber?: string;
  identifier: string;
  identifierLabel: string;
  requestId: string;
  pageSize: number;
  userId?: string; // User who initiated the sync
}

// Job progress interface
export interface HRIMSSyncProgress {
  type: 'progress' | 'complete' | 'error';
  phase?: 'fetching' | 'saving';
  message: string;
  currentPage?: number;
  totalFetched?: number;
  estimatedTotal?: number;
  estimatedPages?: number;
  progressPercent?: number;
  saved?: number;
  skipped?: number;
  total?: number;
  data?: any;
}

// Queue name
export const HRIMS_SYNC_QUEUE_NAME = 'hrims-sync';

// Create queue instance (singleton)
let hrimsSyncQueue: Queue<HRIMSSyncJobData> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Get or create HRIMS sync queue
 */
export function getHRIMSSyncQueue(): Queue<HRIMSSyncJobData> {
  if (!hrimsSyncQueue) {
    hrimsSyncQueue = new Queue<HRIMSSyncJobData>(HRIMS_SYNC_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    console.log('✅ HRIMS Sync Queue created');
  }

  return hrimsSyncQueue;
}

/**
 * Get or create queue events listener
 */
export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    queueEvents = new QueueEvents(HRIMS_SYNC_QUEUE_NAME, {
      connection: createRedisConnection(),
    });

    console.log('✅ Queue Events listener created');
  }

  return queueEvents;
}

/**
 * Add a new HRIMS sync job to the queue
 */
export async function addHRIMSSyncJob(data: HRIMSSyncJobData): Promise<string> {
  const queue = getHRIMSSyncQueue();

  const job = await queue.add('hrims-sync', data, {
    jobId: `hrims-sync-${data.institutionId}-${Date.now()}`, // Unique job ID
  });

  console.log(
    `✅ HRIMS sync job added: ${job.id} for institution ${data.institutionName}`
  );

  return job.id!;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const queue = getHRIMSSyncQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress as HRIMSSyncProgress | undefined;
  const result = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    result,
    failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Close queue and events (for cleanup)
 */
export async function closeQueue(): Promise<void> {
  if (hrimsSyncQueue) {
    await hrimsSyncQueue.close();
    hrimsSyncQueue = null;
  }

  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
}
