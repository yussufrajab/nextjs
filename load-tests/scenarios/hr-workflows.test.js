import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, thresholds, testUsers, endpoints, testEmployeeIds } from '../k6.config.js';
import {
  login,
  authenticatedRequest,
  checkResponse,
  randomPromotionRequest,
  thinkTime,
  randomItem,
} from '../utils/helpers.js';

// Custom metrics
const promotionCreateDuration = new Trend('promotion_create_duration');
const confirmationCreateDuration = new Trend('confirmation_create_duration');
const workflowSuccessRate = new Counter('workflow_success');
const workflowFailureRate = new Counter('workflow_failure');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 10 },   // Steady state
    { duration: '2m', target: 30 },   // Spike
    { duration: '3m', target: 30 },   // Maintain spike
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...thresholds,
    'http_req_duration{scenario:list}': ['p(95)<500'],
    'http_req_duration{scenario:create}': ['p(95)<1500'],
    'http_req_duration{scenario:details}': ['p(95)<300'],
  },
};

export default function () {
  // Use HR or Admin user for creating requests
  const user = Math.random() > 0.5 ? testUsers.hrmo : testUsers.admin;
  const authTokens = login(BASE_URL, user);

  if (!authTokens) {
    workflowFailureRate.add(1);
    sleep(1);
    return;
  }

  const { sessionToken, csrfToken, user: userData } = authTokens;

  // Scenario 1: Promotion Workflow
  group('Promotion Workflow', function () {
    // Step 1: List existing promotions
    const listResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}${endpoints.promotions.list}`,
      sessionToken,
      csrfToken,
      null,
      { tags: { scenario: 'list' } }
    );

    const listSuccess = checkResponse(listResponse, {
      'list promotions successful': (r) => r.status === 200,
      'returns array': (r) => Array.isArray(r.json('data')),
    });

    thinkTime(1, 3);

    // Step 2: Create new promotion request using real employee ID
    const employeeId = randomItem(testEmployeeIds);
    const promotionData = randomPromotionRequest(employeeId, userData.id);

    const createStart = Date.now();
    const createResponse = authenticatedRequest(
      'POST',
      `${BASE_URL}${endpoints.promotions.create}`,
      sessionToken,
      csrfToken,
      promotionData,
      { tags: { scenario: 'create' } }
    );
    const createEnd = Date.now();

    const createSuccess = checkResponse(createResponse, {
      'create promotion successful': (r) => r.status === 200 || r.status === 201,
      'returns promotion id': (r) => r.json('data.id') !== undefined,
    });

    if (createSuccess) {
      promotionCreateDuration.add(createEnd - createStart);
      const promotionId = createResponse.json('data.id');

      thinkTime(2, 4);

      // Step 4: Review/approve promotion (if admin)
      if (user.role === 'ADMIN') {
        const reviewData = {
          status: randomItem(['APPROVED', 'REJECTED', 'PENDING']),
          comments: 'Load test review comment',
        };

        const reviewResponse = authenticatedRequest(
          'POST',
          `${BASE_URL}${endpoints.promotions.review(promotionId)}`,
          sessionToken,
          csrfToken,
          reviewData,
          { tags: { scenario: 'review' } }
        );

        checkResponse(reviewResponse, {
          'review promotion successful': (r) => r.status === 200 || r.status === 404, // 404 if endpoint doesn't exist
        });
      }

      workflowSuccessRate.add(1);
    } else {
      workflowFailureRate.add(1);
    }
  });

  thinkTime(2, 5);

  // Scenario 2: Confirmation Workflow
  group('Confirmation Workflow', function () {
    // Step 1: List confirmations
    const listResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}${endpoints.confirmations.list}`,
      sessionToken,
      csrfToken,
      null,
      { tags: { scenario: 'list' } }
    );

    checkResponse(listResponse, {
      'list confirmations successful': (r) => r.status === 200,
    });

    thinkTime(1, 2);

    // Step 2: Create confirmation request using real employee ID
    const confirmationEmployeeId = randomItem(testEmployeeIds);
    const confirmationData = {
      employeeId: confirmationEmployeeId,
      probationStartDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      probationEndDate: new Date().toISOString(),
      performanceRating: randomItem(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
      recommendation: 'Load test: Confirmed based on performance',
    };

    const createStart = Date.now();
    const createResponse = authenticatedRequest(
      'POST',
      `${BASE_URL}${endpoints.confirmations.create}`,
      sessionToken,
      csrfToken,
      confirmationData,
      { tags: { scenario: 'create' } }
    );
    const createEnd = Date.now();

    const createSuccess = checkResponse(createResponse, {
      'create confirmation successful': (r) => r.status === 200 || r.status === 201,
    });

    if (createSuccess) {
      confirmationCreateDuration.add(createEnd - createStart);
      workflowSuccessRate.add(1);
    } else {
      workflowFailureRate.add(1);
    }
  });

  thinkTime(1, 3);

  // Scenario 3: Employee Management
  group('Employee Management', function () {
    // List employees
    const listResponse = authenticatedRequest(
      'GET',
      `${BASE_URL}${endpoints.employees.list}?page=1&limit=20`,
      sessionToken,
      csrfToken,
      null,
      { tags: { scenario: 'list' } }
    );

    const listSuccess = checkResponse(listResponse, {
      'list employees successful': (r) => r.status === 200,
    });

    if (listSuccess) {
      const employees = listResponse.json('employees') || listResponse.json('data') || [];

      if (employees.length > 0) {
        thinkTime(1, 2);

        // Get random employee details
        const employee = randomItem(employees);
        const employeeId = employee.id;

        const detailsResponse = authenticatedRequest(
          'GET',
          `${BASE_URL}${endpoints.employees.details(employeeId)}`,
          sessionToken,
          csrfToken,
          null,
          { tags: { scenario: 'details' } }
        );

        checkResponse(detailsResponse, {
          'get employee details successful': (r) => r.status === 200,
        });
      }
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-tests/reports/hr-workflows-summary.json': JSON.stringify(data, null, 2),
  };
}
