module.exports = {
  apps: [
    {
      name: 'csms-app',
      script: 'npm',
      args: 'start',
      cwd: '/home/production/nextjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 9002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9002
      },
      log_file: '/var/log/pm2/csms-app.log',
      out_file: '/var/log/pm2/csms-app-out.log',
      error_file: '/var/log/pm2/csms-app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};