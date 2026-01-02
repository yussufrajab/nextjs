import { startPasswordExpirationCron } from './cron-service';

// Auto-initialize cron jobs when this module is imported
if (typeof window === 'undefined') {
  // Only run on server-side
  console.log('[CRON] Initializing cron jobs...');
  startPasswordExpirationCron();
}

export {};
