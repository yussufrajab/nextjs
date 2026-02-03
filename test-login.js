// Test the login API directly
const http = require('http');

const postData = JSON.stringify({
  username: 'akassim',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('RESPONSE BODY:', data);
    try {
      const json = JSON.parse(data);
      console.log('PARSED:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Failed to parse JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
