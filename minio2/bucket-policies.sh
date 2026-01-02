#!/bin/bash
# MinIO Bucket Policies Configuration
# Run this script on the new server after creating buckets

# Create all required buckets
mc mb local/attachments
mc mb local/certificates
mc mb local/csms-files
mc mb local/documents
mc mb local/photos

# Set bucket policies
echo "Setting bucket policies..."

# Attachments bucket - download (public read)
mc anonymous set download local/attachments
echo "✓ attachments: download policy set"

# Certificates bucket - download (public read)
mc anonymous set download local/certificates
echo "✓ certificates: download policy set"

# csms-files bucket - private (no public access)
mc anonymous set private local/csms-files
echo "✓ csms-files: private policy set"

# Documents bucket - download (public read)
mc anonymous set download local/documents
echo "✓ documents: download policy set"

# Photos bucket - download (public read)
mc anonymous set download local/photos
echo "✓ photos: download policy set"

echo ""
echo "All bucket policies configured successfully!"
echo "Verify with: mc anonymous get local/<bucket-name>"
