/**
 * PM2 Ecosystem Configuration
 * Manages background worker process in production
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs redis-worker
 *   pm2 stop redis-worker
 *   pm2 restart redis-worker
 */

module.exports = {
  apps: [
    {
      name: 'redis-worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/home/latest',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
