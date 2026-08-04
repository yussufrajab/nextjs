import pino from 'pino';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

// Use pino.transport (worker threads) only in dev — it breaks in Next.js
// production builds because webpack bundles pino into chunks and the worker
// cannot resolve its own module path at runtime.
function createDestination() {
  if (isDev) {
    return pino.transport({ target: 'pino-pretty' });
  }
  // In production, write to a log file. Fall back to stdout when the file is not
  // writable (e.g. CI/build containers where /var/log/csms/app does not exist
  // or is not writable), so that `next build` page-data collection does not
  // crash with an out-of-range fd error. A swallowed 'error' handler also guards
  // against asynchronous open failures so logging never crashes the process.
  const logFile = process.env.LOG_FILE || '/var/log/csms/app/app.log';
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const dest = pino.destination(logFile);
    dest.on('error', () => {});
    return dest;
  } catch {
    const dest = pino.destination(1); // fd 1 = stdout
    dest.on('error', () => {});
    return dest;
  }
}

export const logger = pino(
  {
    level: isTest ? 'silent' : logLevel,
    base: {
      service: 'csms',
      env: process.env.NODE_ENV,
    },
  },
  createDestination()
);

// Child loggers for specific components
export const workerLogger = logger.child({ component: 'worker' });
export const cronLogger = logger.child({ component: 'cron' });
export const authLogger = logger.child({ component: 'auth' });
export const dbLogger = logger.child({ component: 'db' });
export const emailLogger = logger.child({ component: 'email' });
export const fileLogger = logger.child({ component: 'file' });
export const hrimsLogger = logger.child({ component: 'hrims' });
export const sessionLogger = logger.child({ component: 'session' });
export const rateLimitLogger = logger.child({ component: 'rate-limit' });
export const csrfLogger = logger.child({ component: 'csrf' });
export const ipBanLogger = logger.child({ component: 'ip-ban' });