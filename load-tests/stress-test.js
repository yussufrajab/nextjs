/**
 * Comprehensive Stress Test
 *
 * This test combines all scenarios to find the breaking point of the system.
 * It progressively increases load until the system shows signs of stress.
 */

import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { BASE_URL, stages, testUsers, endpoints, testEmployeeIds } from './k6.config.js';
import {
  login,
  authenticatedRequest,
  checkResponse,
  randomPromotionRequest,
  thinkTime,
  randomItem,
} from './utils/helpers.js';

// Custom metrics
const scenarioCounter = new Counter('scenarios_executed');
const authScenarios = new Counter('auth_scenarios');
const hrScenarios = new Counter('hr_scenarios');
const fileScenarios = new Counter('file_scenarios');
const errorsByType = new Counter('errors_by_type');
const responseTime = new Trend('response_time');
const systemHealthRate = new Rate('system_health');

export const options = {
  // Use stress test stages to find breaking point
  stages: stages.stress,

  thresholds: {
    // Relaxed thresholds for stress testing
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'], // Allow 5% failure under stress
    'checks': ['rate>0.90'], // 90% checks should pass
    'system_health': ['rate>0.85'], // 85% overall system health

    // Per-scenario thresholds
    'http_req_duration{scenario:auth}': ['p(95)<1000'],
    'http_req_duration{scenario:hr}': ['p(95)<2000'],
    'http_req_duration{scenario:files}': ['p(95)<3000'],
  },

  // Extended timeout for stress conditions
  httpDebug: 'full',
  insecureSkipTLSVerify: true,
};

// Scenario distribution - what each VU will do
const scenarios = [
  { name: 'auth', weight: 30, fn: authScenario },
  { name: 'hr-workflow', weight: 50, fn: hrWorkflowScenario },
  { name: 'file-ops', weight: 20, fn: fileOpsScenario },
];

export default function () {
  // Select scenario based on weighted distribution
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedScenario = scenarios[0];

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      selectedScenario = scenario;
      break;
    }
  }

  // Execute selected scenario
  try {
    selectedScenario.fn();
    scenarioCounter.add(1);
    systemHealthRate.add(1);
  } catch (error) {
    console.error(`Scenario ${selectedScenario.name} failed: ${error}`);
    errorsByType.add(1, { type: selectedScenario.name });
    systemHealthRate.add(0);
  }

  sleep(1);
}

// Authentication Scenario
function authScenario() {
  group('Auth Scenario', function () {
    authScenarios.add(1);

    const user = randomItem([testUsers.admin, testUsers.cscs, testUsers.hrmo, testUsers.hhrmd]);
    const authTokens = login(BASE_URL, user);

    if (!authTokens) {
      errorsByType.add(1, { type: 'login_failure' });
      return;
    }

    const { sessionToken, csrfToken, user: userData } = authTokens;
    thinkTime(1, 2);

    // Check session
    const start = Date.now();
    const sessionResponse = authenticatedRequest('GET', `${BASE_URL}/api/auth/session`, sessionToken, csrfToken);
    responseTime.add(Date.now() - start);

    checkResponse(sessionResponse, {
      'auth: check session': (r) => r.status === 200,
    });

    thinkTime(1, 2);

    // Logout with required body
    const logoutBody = {
      userId: userData.id,
      sessionToken: sessionToken,
      logoutAll: false,
    };
    const logoutResponse = authenticatedRequest('POST', `${BASE_URL}/api/auth/logout`, sessionToken, csrfToken, logoutBody);
    checkResponse(logoutResponse, {
      'auth: logout': (r) => r.status === 200 || r.status === 204,
    });
  });
}

// HR Workflow Scenario
function hrWorkflowScenario() {
  group('HR Workflow Scenario', function () {
    hrScenarios.add(1);

    const user = randomItem([testUsers.hrmo, testUsers.admin, testUsers.hhrmd]);
    const authTokens = login(BASE_URL, user);

    if (!authTokens) {
      errorsByType.add(1, { type: 'login_failure' });
      return;
    }

    const { sessionToken, csrfToken, user: userData } = authTokens;

    // List promotions
    const start1 = Date.now();
    const listResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}${endpoints.promotions.list}`,
      sessionToken,
      csrfToken
    );
    responseTime.add(Date.now() - start1);

    checkResponse(listResponse, {
      'hr: list promotions': (r) => r.status === 200,
    });

    thinkTime(1, 3);

    // Create promotion using real employee ID
    const employeeId = randomItem(testEmployeeIds);
    const promotionData = randomPromotionRequest(employeeId, userData.id);

    const start2 = Date.now();
    const createResponse = authenticatedRequest(
      'POST',
      `${BASE_URL}${endpoints.promotions.create}`,
      sessionToken,
      csrfToken,
      promotionData
    );
    responseTime.add(Date.now() - start2);

    const createSuccess = checkResponse(createResponse, {
      'hr: create promotion': (r) => r.status === 200 || r.status === 201,
      'has promotion id': (r) => r.json('data.id') !== undefined,
    });

    if (createSuccess) {
      thinkTime(1, 2);
      // Promotion created successfully, details endpoint not available (405)
    }

    thinkTime(1, 2);

    // List employees
    const start4 = Date.now();
    const employeesResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}${endpoints.employees.list}`,
      sessionToken,
      csrfToken
    );
    responseTime.add(Date.now() - start4);

    checkResponse(employeesResponse, {
      'hr: list employees': (r) => r.status === 200,
    });
  });
}

// File Operations Scenario (simplified for stress test)
function fileOpsScenario() {
  group('File Operations Scenario', function () {
    fileScenarios.add(1);

    const user = randomItem([testUsers.hrmo, testUsers.admin, testUsers.hhrmd]);
    const authTokens = login(BASE_URL, user);

    if (!authTokens) {
      errorsByType.add(1, { type: 'login_failure' });
      return;
    }

    const { sessionToken, csrfToken, user: userData } = authTokens;

    // Check if a file exists (using a known pattern)
    const testObjectKey = 'documents/test-document.pdf';
    const start = Date.now();
    const existsResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}/api/files/exists/${testObjectKey}`,
      sessionToken,
      csrfToken
    );
    responseTime.add(Date.now() - start);

    check(existsResponse, {
      'files: check exists': (r) => r.status === 200 || r.status === 404, // Both are valid
    });
  });
}

// Custom summary with HTML report
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    [`load-tests/reports/stress-test-${timestamp}.html`]: htmlReport(data),
    [`load-tests/reports/stress-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Setup function - runs once before test
export function setup() {
  console.log('Starting stress test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Stages:', JSON.stringify(options.stages, null, 2));

  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL}/api/health`, { timeout: '10s' });
  if (healthCheck.status !== 200) {
    console.warn('Warning: Health check failed or endpoint does not exist');
  }

  return { startTime: Date.now() };
}

// Teardown function - runs once after test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`\nStress test completed in ${duration.toFixed(2)} minutes`);
}
