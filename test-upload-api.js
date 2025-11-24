#!/usr/bin/env node

/**
 * Test the upload API to see actual error
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUploadAPI() {
  try {
    console.log('Testing upload API...\n');

    // Create a test PDF file
    const testContent = Buffer.from('%PDF-1.4\nTest PDF content');
    const testFilePath = '/tmp/test-upload.pdf';
    fs.writeFileSync(testFilePath, testContent);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-document.pdf',
      contentType: 'application/pdf'
    });
    form.append('folder', 'documents');

    // Make request
    console.log('Sending request to http://localhost:9002/api/files/upload');
    const response = await fetch('http://localhost:9002/api/files/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    const responseText = await response.text();
    console.log('\nResponse body:', responseText);

    // Clean up
    fs.unlinkSync(testFilePath);

    if (!response.ok) {
      console.log('\n❌ Upload failed');
      process.exit(1);
    } else {
      console.log('\n✅ Upload successful');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testUploadAPI();
