#!/usr/bin/env node

/**
 * MinIO Integration Test Script
 * Tests the MinIO connection and basic operations
 */

const { Client } = require('minio');

// MinIO configuration
const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

const bucketName = 'csms-files';

async function testMinIO() {
  console.log('=================================');
  console.log('MinIO Integration Test');
  console.log('=================================\n');

  try {
    // Test 1: Check bucket existence
    console.log('Test 1: Checking bucket existence...');
    const exists = await minioClient.bucketExists(bucketName);
    console.log(`✓ Bucket '${bucketName}' ${exists ? 'exists' : 'does not exist'}\n`);

    // Test 2: Create bucket if it doesn't exist
    if (!exists) {
      console.log('Test 2: Creating bucket...');
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✓ Bucket '${bucketName}' created successfully\n`);
    } else {
      console.log('Test 2: Bucket already exists, skipping creation\n');
    }

    // Test 3: Upload a test file
    console.log('Test 3: Uploading test file...');
    const testContent = 'This is a test file for MinIO integration';
    const testFileName = `test/${Date.now()}_test.txt`;

    await minioClient.putObject(
      bucketName,
      testFileName,
      Buffer.from(testContent),
      testContent.length,
      {
        'Content-Type': 'text/plain'
      }
    );
    console.log(`✓ File uploaded: ${testFileName}\n`);

    // Test 4: Get file metadata
    console.log('Test 4: Getting file metadata...');
    const stat = await minioClient.statObject(bucketName, testFileName);
    console.log(`✓ File size: ${stat.size} bytes`);
    console.log(`✓ Content-Type: ${stat.metaData['content-type']}\n`);

    // Test 5: Generate presigned URL
    console.log('Test 5: Generating presigned URL...');
    const url = await minioClient.presignedGetObject(bucketName, testFileName, 3600);
    console.log(`✓ Presigned URL: ${url.substring(0, 80)}...\n`);

    // Test 6: Download file
    console.log('Test 6: Downloading file...');
    const dataStream = await minioClient.getObject(bucketName, testFileName);
    const chunks = [];

    await new Promise((resolve, reject) => {
      dataStream.on('data', (chunk) => chunks.push(chunk));
      dataStream.on('end', resolve);
      dataStream.on('error', reject);
    });

    const downloadedContent = Buffer.concat(chunks).toString();
    console.log(`✓ Downloaded content: ${downloadedContent}\n`);

    // Test 7: Delete test file
    console.log('Test 7: Deleting test file...');
    await minioClient.removeObject(bucketName, testFileName);
    console.log(`✓ File deleted: ${testFileName}\n`);

    console.log('=================================');
    console.log('✓ All tests passed!');
    console.log('=================================');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testMinIO();
