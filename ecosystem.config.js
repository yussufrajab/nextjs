/**
 * PM2 Ecosystem Configuration for CSMS
 *
 * Manages all application services:
 * - Next.js application (production)
 * - Redis server (redis)
 * - Redis worker (worker)
 * - Genkit AI service (genkit)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    // 1. Redis Server
    {
      name: 'redis',
      script: 'redis-server',
      args: '--port 6379 --daemonize no --save 60 1 --loglevel notice',
      interpreter: 'none', // Don't use Node.js interpreter
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/redis-error.log',
      out_file: './logs/redis-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // 2. Redis Worker (HRIMS Sync Worker)
    {
      name: 'worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/www/wwwroot/nextjspro',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '9002',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Wait for Redis to be ready
      wait_ready: true,
      listen_timeout: 10000,
    },

    // 3. Genkit AI Service
    {
      name: 'genkit',
      script: 'npm',
      args: 'run genkit:watch',
      cwd: '/www/wwwroot/nextjspro',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '9002',
      },
      error_file: './logs/genkit-error.log',
      out_file: './logs/genkit-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // 4. Next.js Production Application
    {
      name: 'production',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/nextjspro',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '9002',
      },
      error_file: './logs/production-error.log',
      out_file: './logs/production-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
