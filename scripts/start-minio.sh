#!/bin/bash

# MinIO Start Script for CSMS Application
# This script starts the MinIO server with proper configuration

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration from environment or defaults
MINIO_ENDPOINT=${MINIO_ENDPOINT:-localhost}
MINIO_PORT=${MINIO_PORT:-9000}
MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT:-9001}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
MINIO_DATA_DIR=${MINIO_DATA_DIR:-./minio-data}

# Create data directory if it doesn't exist
mkdir -p "$MINIO_DATA_DIR"

echo "==================================="
echo "Starting MinIO Server"
echo "==================================="
echo ""
echo "Configuration:"
echo "  API Endpoint: http://$MINIO_ENDPOINT:$MINIO_PORT"
echo "  Console: http://$MINIO_ENDPOINT:$MINIO_CONSOLE_PORT"
echo "  Data Directory: $MINIO_DATA_DIR"
echo ""
echo "Access MinIO Console at: http://$MINIO_ENDPOINT:$MINIO_CONSOLE_PORT"
echo "Login with:"
echo "  Username: $MINIO_ACCESS_KEY"
echo "  Password: [configured in environment]"
echo ""
echo "==================================="
echo ""

# Export MinIO root credentials
export MINIO_ROOT_USER="$MINIO_ACCESS_KEY"
export MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY"

# Start MinIO server
if command -v minio &> /dev/null; then
  minio server "$MINIO_DATA_DIR" \
    --address ":$MINIO_PORT" \
    --console-address ":$MINIO_CONSOLE_PORT"
elif [ -f ./minio ]; then
  ./minio server "$MINIO_DATA_DIR" \
    --address ":$MINIO_PORT" \
    --console-address ":$MINIO_CONSOLE_PORT"
else
  echo "Error: MinIO binary not found!"
  echo "Please run: npm run minio:setup"
  exit 1
fi
