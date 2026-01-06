/**
 * k6 Load Testing Configuration
 *
 * This file contains base configuration for k6 load tests
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:9002';

// Test thresholds - performance SLOs
export const thresholds = {
  // HTTP request duration should be below 500ms for 95% of requests
  http_req_duration: ['p(95)<500'],

  // HTTP request failure rate should be below 1%
  http_req_failed: ['rate<0.01'],

  // Checks should pass 95% of the time
  checks: ['rate>0.95'],
};

// Load test stages for different scenarios
export const stages = {
  // Smoke test - verify script works with minimal load
  smoke: [
    { duration: '1m', target: 1 },
  ],

  // Load test - normal load
  load: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 0 },  // Ramp down
  ],

  // Stress test - find breaking point
  stress: [
    { duration: '2m', target: 10 },   // Warm up
    { duration: '5m', target: 50 },   // Ramp to 50 users
    { duration: '5m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 300 },  // Push to 300 users
    { duration: '2m', target: 0 },    // Ramp down
  ],

  // Spike test - sudden traffic spike
  spike: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 100 }, // Sudden spike
    { duration: '3m', target: 100 },  // Stay at spike
    { duration: '1m', target: 10 },   // Back to normal
    { duration: '1m', target: 0 },    // Ramp down
  ],

  // Soak test - extended duration at moderate load
  soak: [
    { duration: '5m', target: 20 },   // Ramp up
    { duration: '1h', target: 20 },   // Stay at load for 1 hour
    { duration: '5m', target: 0 },    // Ramp down
  ],
};

// Test data - using actual seeded users from the database
export const testUsers = {
  admin: {
    username: 'akassim', // Amina Kassim - Admin role
    password: 'password123',
    role: 'Admin',
  },
  cscs: {
    username: 'zhaji', // Zaituni Haji - CSCS (Commission Secretary)
    password: 'password123',
    role: 'CSCS',
  },
  hrmo: {
    username: 'fiddi', // Fauzia Iddi - HRMO (HR Management Officer)
    password: 'password123',
    role: 'HRMO',
  },
  hhrmd: {
    username: 'skhamis', // Safia Khamis - HHRMD (Head of HR)
    password: 'password123',
    role: 'HHRMD',
  },
};

// Real employee IDs from the test database for load testing
export const testEmployeeIds = [
  '00049e7e-9905-4d8a-b2d2-4e8f7be547a3', // Saleh Abdalla Adam
  '0004eac4-eb8e-4b10-b1b2-7e580f501d43', // Khamis Issa Moh'd
  '000f242a-5643-409a-9b57-f86b08a0164f', // Farouk Omar Khamis
  '00148a8c-14d9-47a5-ac94-717695bc7906', // Amina Alawi Yussuf
  '0016b289-d738-46fa-9345-4d5704ffc1ae', // Stella Gera Kilian
  '0020918b-d561-4295-b56d-3eacb98f05d7', // Salma Suleiman Yussuf
  '002abae5-27a1-4482-bca6-28ebd8dbf530', // Maryam Ali Kinana
  '002c8359-9cf8-4d8f-95b4-f711e5384520', // Mwanajuma Marnush Mwinyi
  '00320b24-056a-4703-9a43-81e35188bc9d', // Zakia Mohamed Mzee
  '0033b34f-762d-4169-93bf-5f5f73da7d36', // Mwanamrisho Juma Ame
  '00361439-8f39-445d-9da4-4302fac02a0f', // Juma Saleh Juma
  '003acbc1-9585-4d7b-969d-11a9f264ed8b', // Subira Abdalla Moh'd
];

// API endpoints
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  promotions: {
    list: '/api/promotions',
    create: '/api/promotions',
    details: (id) => `/api/promotions/${id}`,
    review: (id) => `/api/promotions/${id}/review`,
  },
  confirmations: {
    list: '/api/confirmations',
    create: '/api/confirmations',
    details: (id) => `/api/confirmations/${id}`,
  },
  employees: {
    list: '/api/employees',
    details: (id) => `/api/employees/${id}`,
  },
  files: {
    upload: '/api/files/upload',
    download: (id) => `/api/files/${id}`,
  },
};

export default {
  BASE_URL,
  thresholds,
  stages,
  testUsers,
  endpoints,
};
