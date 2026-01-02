#!/bin/bash

# Wrapper script for photo fetching
# Makes it easier to run from cron or command line

# Change to the script directory
cd "$(dirname "$0")/.."

# Run the TypeScript script
npx tsx scripts/fetch-all-photos.ts "$@"
