/**
 * HRIMS Sync Job Queue
 *
 * Background job queue for processing HRIMS data synchronization
 * Uses BullMQ for reliable job processing with Redis
 */

import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../redis';
import { workerLogger } from '@/lib/logger';

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

    workerLogger.info('HRIMS Sync Queue created');
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

    workerLogger.info('Queue Events listener created');
  }

  return queueEvents;
}

/**
 * Add a new HRIMS sync job to the queue
 */
export async function addHRIMSSyncJob(data: HRIMSSyncJobData): Promise<string> {
  const queue = getHRIMSSyncQueue();

  // SECURITY (Req 16.4): deterministic jobId so a second enqueue of the same
  // sync (e.g. a double-click) dedupes against the in-flight/queued job
  // instead of spawning a duplicate. The id is scoped to the institution +
  // identifier type + identifier value, so a votecode sync and a tin sync for
  // the same institution can still coexist as separate jobs. (Previously this
  // used Date.now(), producing a fresh id on every click → duplicate jobs.)
  //
  // NOTE: BullMQ rejects custom job IDs that contain a colon ("Custom Id cannot
  // contain :"), so the segments are joined with hyphens, not colons.
  const jobId = `hrims-sync-${data.institutionId}-${data.identifierType}-${data.identifier}`;

  // If a job with this ID already exists but has already finished (completed
  // or failed), remove it so the new enqueue actually gets processed. Without
  // this, BullMQ silently drops the duplicate and the worker never runs — the
  // caller sees the stale result from the previous (possibly old-code) job.
  // Active/waiting/delayed jobs are left alone so double-click dedup still
  // works.
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') {
      await existing.remove();
      workerLogger.info(
        { jobId, prevState: state },
        'Removed previous finished job to allow re-fetch'
      );
    }
  }

  const job = await queue.add('hrims-sync', data, { jobId });

  workerLogger.info(
    { jobId: job.id, institutionId: data.institutionId, institutionName: data.institutionName },
    'HRIMS sync job added to queue'
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
 * SECURITY (Req 16.2): owner-bound access check for a HRIMS sync job.
 *
 * Admins may inspect any job. Any other caller may only read a job they
 * initiated (job.data.userId === auth.userId) or that targets their own
 * institution (job.data.institutionId === auth.institutionId). Without this
 * check, any Admin/HHRMD could read any user's job status/progress/data,
 * leaking which institutions other users are syncing and when.
 */
export function canAccessJob(
  jobData: HRIMSSyncJobData | undefined,
  auth: { userId: string; role: string; institutionId: string | null }
): boolean {
  if (auth.role.toUpperCase() === 'ADMIN') return true;
  if (!jobData) return false;
  if (jobData.userId && jobData.userId === auth.userId) return true;
  if (auth.institutionId && jobData.institutionId === auth.institutionId) return true;
  return false;
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