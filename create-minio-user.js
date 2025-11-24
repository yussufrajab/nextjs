#!/usr/bin/env node

/**
 * Create MinIO user with admin access
 * This uses the MinIO Admin API
 */

const https = require('http');

// MinIO Admin API doesn't have a simple REST interface
// We need to use mc (MinIO Client) or restart with the correct credentials

console.log('Creating MinIO user requires mc client or restarting MinIO');
console.log('\nOption 1: Install mc client');
console.log('  curl -o mc https://dl.min.io/client/mc/release/linux-amd64/mc');
console.log('  chmod +x mc');
console.log('  ./mc alias set local http://localhost:9000 minioadmin minioadmin');
console.log('  ./mc admin user add local csmsapp csmsapp123');
console.log('  ./mc admin policy attach local readwrite --user csmsapp');
console.log('\nOption 2: Update .env.local to match MinIO credentials');
console.log('\nOption 3: Restart MinIO with csmsapp/csmsapp123 credentials');

process.exit(0);
