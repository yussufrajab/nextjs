#!/usr/bin/env tsx
/**
 * HRIMS Sync Worker Startup Script
 *
 * Starts the background worker process that handles HRIMS sync jobs
 * Run this script separately from the Next.js application
 *
 * Usage:
 *   npm run worker
 *   OR
 *   npx tsx scripts/start-worker.ts
 */

import { createHRIMSSyncWorker } from '../src/lib/jobs/hrims-sync-worker';

// Force stdout to not buffer
if (process.stdout.isTTY === false) {
  process.stdout._handle.setBlocking(true);
}

console.log('🚀 Starting HRIMS Sync Worker...');
console.log('   Time:', new Date().toISOString());
console.log('   Node:', process.version);
console.log('');

// Create and start the worker
const worker = createHRIMSSyncWorker();

// Handle graceful shutdown
const shutdown = async () => {
  console.log('\n⏹️  Shutting down worker...');
  await worker.close();
  console.log('✅ Worker shut down gracefully');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ Worker is running and ready to process jobs');
console.log('   Press Ctrl+C to stop.\n');
