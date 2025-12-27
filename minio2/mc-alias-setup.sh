#!/bin/bash
# MinIO Client (mc) Alias Configuration
# Run this script on the new server to configure the MinIO client

# Configure the local MinIO alias
mc alias set local http://localhost:9000 csmsadmin Mamlaka2020MinIO

echo "MinIO client alias configured successfully!"
echo "Test with: mc ls local"
