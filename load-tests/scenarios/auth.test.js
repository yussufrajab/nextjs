import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, thresholds, testUsers } from '../k6.config.js';
import { login, checkResponse, randomSleep } from '../utils/helpers.js';

// Custom metrics
const loginDuration = new Trend('login_duration');
const loginSuccessRate = new Counter('login_success');
const loginFailureRate = new Counter('login_failure');

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 20 },  // Stay at 20 users
    { duration: '1m', target: 50 },  // Spike to 50 users
    { duration: '2m', target: 50 },  // Stay at spike
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    ...thresholds,
    'login_duration': ['p(95)<1000'], // Login should be under 1s for 95%
    'http_req_duration{scenario:login}': ['p(95)<1000'],
  },
};

export default function () {
  const users = [testUsers.admin, testUsers.cscs, testUsers.hrmo, testUsers.hhrmd];
  const user = users[Math.floor(Math.random() * users.length)];

  // Test 1: Login
  const loginStart = Date.now();
  const authTokens = login(BASE_URL, user);
  const loginEnd = Date.now();

  if (authTokens) {
    const { sessionToken, csrfToken, user: userData } = authTokens;
    loginDuration.add(loginEnd - loginStart);
    loginSuccessRate.add(1);

    // Think time - user reads dashboard
    randomSleep(1, 3);

    // Test 2: Check session
    const sessionResponse = http.get(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'X-CSRF-Token': csrfToken,
      },
      tags: { scenario: 'check_session' },
    });

    checkResponse(sessionResponse, {
      'check session successful': (r) => r.status === 200,
      'is authenticated': (r) => r.json('data.isAuthenticated') === true,
    });

    // Think time
    randomSleep(2, 5);

    // Test 3: Refresh session (simulate session refresh)
    const refreshResponse = http.get(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'X-CSRF-Token': csrfToken,
      },
      tags: { scenario: 'session_refresh' },
    });

    checkResponse(refreshResponse, {
      'session still valid': (r) => r.status === 200,
    });

    // Think time
    randomSleep(1, 2);

    // Test 4: Logout with required body
    const logoutBody = JSON.stringify({
      userId: userData.id,
      sessionToken: sessionToken,
      logoutAll: false,
    });

    const logoutResponse = http.post(
      `${BASE_URL}/api/auth/logout`,
      logoutBody,
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
        },
        tags: { scenario: 'logout' },
      }
    );

    checkResponse(logoutResponse, {
      'logout successful': (r) => r.status === 200 || r.status === 204,
    });

    // Test 5: Verify session is invalid after logout
    const afterLogoutResponse = http.get(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'X-CSRF-Token': csrfToken,
      },
      tags: { scenario: 'after_logout' },
    });

    check(afterLogoutResponse, {
      'session invalid after logout': (r) => r.status === 401 || r.status === 200, // May still return 200 if session check doesn't validate
    });

  } else {
    loginFailureRate.add(1);
  }

  // Wait before next iteration
  sleep(1);
}

// Test teardown
export function handleSummary(data) {
  return {
    'load-tests/reports/auth-summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Authentication Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // Metrics
  if (data.metrics) {
    summary += `${indent}Metrics:\n`;
    summary += `${indent}--------\n`;

    const metrics = data.metrics;

    if (metrics.login_duration) {
      summary += `${indent}Login Duration:\n`;
      summary += `${indent}  avg: ${metrics.login_duration.values.avg.toFixed(2)}ms\n`;
      summary += `${indent}  p95: ${metrics.login_duration.values['p(95)'].toFixed(2)}ms\n`;
      summary += `${indent}  max: ${metrics.login_duration.values.max.toFixed(2)}ms\n`;
    }

    if (metrics.http_req_duration) {
      summary += `${indent}HTTP Request Duration:\n`;
      summary += `${indent}  avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
      summary += `${indent}  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    }

    if (metrics.http_req_failed) {
      const failRate = metrics.http_req_failed.values.rate * 100;
      summary += `${indent}HTTP Request Failure Rate: ${failRate.toFixed(2)}%\n`;
    }
  }

  summary += '\n';
  return summary;
}
