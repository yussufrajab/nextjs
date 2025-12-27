#!/bin/bash
# MinIO Server Startup Script
# This script starts the MinIO server with the correct configuration

# Set MinIO root credentials
export MINIO_ROOT_USER=csmsadmin
export MINIO_ROOT_PASSWORD=Mamlaka2020MinIO

# Data directory (change this to match your server setup)
DATA_DIR="/minio/data"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Start MinIO server
/usr/local/bin/minio server \
  --console-address :9001 \
  --address :9000 \
  "$DATA_DIR"
