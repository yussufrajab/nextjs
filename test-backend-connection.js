#!/usr/bin/env node

/**
 * Test script to verify backend connectivity
 * Run with: node test-backend-connection.js
 */

const https = require('http');

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

console.log('🔍 Testing Backend Connection...');
console.log('Backend URL:', BACKEND_URL);
console.log('API URL:', API_URL);
console.log('');

// Test backend health endpoint
function testEndpoint(url, description) {
  return new Promise((resolve) => {
    console.log(`Testing ${description}: ${url}`);
    
    const request = https.get(url, (response) => {
      console.log(`✅ ${description} - Status: ${response.statusCode}`);
      response.on('data', () => {}); // Consume response
      response.on('end', () => resolve(true));
    });

    request.on('error', (error) => {
      console.log(`❌ ${description} - Error: ${error.message}`);
      resolve(false);
    });

    request.setTimeout(5000, () => {
      console.log(`⏰ ${description} - Timeout`);
      request.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('Testing backend connectivity...\n');

  const tests = [
    { url: `${BACKEND_URL}/actuator/health`, desc: 'Backend Health Check' },
    { url: `${API_URL}/actuator/health`, desc: 'API Health Check' },
    { url: `${API_URL}/institutions`, desc: 'Institutions Endpoint (requires auth)' },
  ];

  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test.url, test.desc);
    results.push(result);
  }

  console.log('\n📊 Test Results:');
  console.log('================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === 0) {
    console.log('\n❌ Backend appears to be offline');
    console.log('Please start the Spring Boot backend:');
    console.log('  cd backend');
    console.log('  ./mvnw spring-boot:run');
  } else if (passed < total) {
    console.log('\n⚠️  Backend is partially accessible');
    console.log('Some endpoints may require authentication or may not be implemented yet.');
  } else {
    console.log('\n✅ Backend is fully accessible');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Ensure Spring Boot backend is running on port 8080');
  console.log('2. Check CORS configuration in Spring Boot');
  console.log('3. Verify database connection in backend');
  console.log('4. Test login endpoint with valid credentials');
}

runTests().catch(console.error);