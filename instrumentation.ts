export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize cron jobs on server startup
    await import('./src/lib/cron-init');
  }
}
