#!/bin/bash

# MinIO Setup Script for CSMS Application
# This script downloads, installs, and configures MinIO server

set -e

echo "==================================="
echo "MinIO Setup Script"
echo "==================================="

# Configuration from environment or defaults
MINIO_ENDPOINT=${MINIO_ENDPOINT:-localhost}
MINIO_PORT=${MINIO_PORT:-9000}
MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT:-9001}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
MINIO_DATA_DIR=${MINIO_DATA_DIR:-./minio-data}

# Create data directory if it doesn't exist
if [ ! -d "$MINIO_DATA_DIR" ]; then
  echo "Creating MinIO data directory: $MINIO_DATA_DIR"
  mkdir -p "$MINIO_DATA_DIR"
fi

# Check if MinIO is already installed
if command -v minio &> /dev/null; then
  echo "MinIO is already installed at: $(which minio)"
  MINIO_VERSION=$(minio --version | head -1)
  echo "Version: $MINIO_VERSION"
else
  echo "MinIO not found. Installing..."

  # Detect OS and architecture
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  case "$ARCH" in
    x86_64)
      ARCH="amd64"
      ;;
    aarch64|arm64)
      ARCH="arm64"
      ;;
    *)
      echo "Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac

  echo "Detected OS: $OS, Architecture: $ARCH"

  # Download MinIO binary
  MINIO_URL="https://dl.min.io/server/minio/release/${OS}-${ARCH}/minio"
  echo "Downloading MinIO from: $MINIO_URL"

  curl -o ./minio "$MINIO_URL"
  chmod +x ./minio

  # Move to /usr/local/bin if we have permissions, otherwise use local directory
  if [ -w /usr/local/bin ]; then
    sudo mv ./minio /usr/local/bin/
    echo "MinIO installed to /usr/local/bin/minio"
  else
    echo "MinIO installed to $(pwd)/minio"
    echo "Note: You may need to add this directory to your PATH"
  fi
fi

echo ""
echo "==================================="
echo "MinIO Setup Complete!"
echo "==================================="
echo ""
echo "Configuration:"
echo "  Endpoint: $MINIO_ENDPOINT:$MINIO_PORT"
echo "  Console: http://$MINIO_ENDPOINT:$MINIO_CONSOLE_PORT"
echo "  Access Key: $MINIO_ACCESS_KEY"
echo "  Secret Key: [hidden]"
echo "  Data Directory: $MINIO_DATA_DIR"
echo ""
echo "To start MinIO server, run:"
echo "  npm run minio:start"
echo ""
echo "Or manually:"
echo "  MINIO_ROOT_USER=$MINIO_ACCESS_KEY MINIO_ROOT_PASSWORD=$MINIO_SECRET_KEY minio server $MINIO_DATA_DIR --address :$MINIO_PORT --console-address :$MINIO_CONSOLE_PORT"
echo ""
