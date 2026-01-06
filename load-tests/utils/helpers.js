import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import http from 'k6/http';

// Custom metrics
export const errorRate = new Rate('errors');

/**
 * Make an authenticated request with session token and CSRF token
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - Request URL
 * @param {string} sessionToken - Session token from login
 * @param {string} csrfToken - CSRF token from login
 * @param {object} body - Request body (optional)
 * @param {object} params - Additional request parameters (optional)
 */
export function authenticatedRequest(method, url, sessionToken, csrfToken, body = null, params = {}) {
  const headers = {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const options = {
    headers,
    ...params,
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, options);
  } else if (method === 'POST') {
    response = http.post(url, body ? JSON.stringify(body) : null, options);
  } else if (method === 'PUT') {
    response = http.put(url, body ? JSON.stringify(body) : null, options);
  } else if (method === 'DELETE') {
    response = http.del(url, body ? JSON.stringify(body) : null, options);
  }

  return response;
}

/**
 * Login and return session token, CSRF token, and user data
 * @param {string} baseUrl - Base URL of the application
 * @param {object} credentials - User credentials {username, password}
 * @returns {object|null} - Returns {sessionToken, csrfToken, user} or null on failure
 */
export function login(baseUrl, credentials) {
  const loginUrl = `${baseUrl}/api/auth/login`;
  const payload = JSON.stringify({
    username: credentials.username,
    password: credentials.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(loginUrl, payload, params);

  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'has session token': (r) => r.json('sessionToken') !== undefined,
    'has csrf token': (r) => r.json('csrfToken') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Login failed: ${response.status} - ${response.body}`);
    return null;
  }

  errorRate.add(0);

  const userData = response.json('data.user');

  return {
    sessionToken: response.json('sessionToken'),
    csrfToken: response.json('csrfToken'),
    user: {
      id: userData.id,
      username: userData.username,
      role: userData.role,
      institutionId: userData.institutionId,
    },
  };
}

/**
 * Random sleep between min and max seconds
 */
export function randomSleep(min = 1, max = 3) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

/**
 * Generate random test data
 */
export function randomEmployee() {
  const id = Math.floor(Math.random() * 10000);
  return {
    firstName: `Test${id}`,
    lastName: `Employee${id}`,
    email: `test${id}@example.com`,
    phoneNumber: `+255${Math.floor(Math.random() * 1000000000)}`,
  };
}

/**
 * Generate random promotion request using real employee data
 * @param {string} employeeId - Employee UUID
 * @param {string} submittedById - User UUID who is submitting the request
 */
export function randomPromotionRequest(employeeId, submittedById) {
  const promotionTypes = ['Experience', 'Education'];
  const proposedCadres = [
    'Afisa Daraja la I',
    'Afisa Daraja la II',
    'Mhudumu Daraja la I',
    'Mhudumu Daraja la II',
    'Taarishi Daraja la I',
    'Muuguzi Daraja la I',
    'Mhasibu Daraja la I',
  ];

  const promotionType = promotionTypes[Math.floor(Math.random() * promotionTypes.length)];

  return {
    employeeId,
    submittedById,
    promotionType,
    proposedCadre: proposedCadres[Math.floor(Math.random() * proposedCadres.length)],
    studiedOutsideCountry: Math.random() > 0.7, // 30% studied outside
    documents: [],
  };
}

/**
 * Check response and track errors
 */
export function checkResponse(response, checks, errorMetric = errorRate) {
  const success = check(response, checks);

  if (!success) {
    errorMetric.add(1);
    console.error(`Check failed for ${response.url}: ${response.status}`);
  } else {
    errorMetric.add(0);
  }

  return success;
}

/**
 * Create a file upload payload
 */
export function createFileUpload(filename, content, mimeType = 'application/pdf') {
  return {
    file: http.file(content, filename, mimeType),
  };
}

/**
 * Get random item from array
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Think time - simulate user reading/thinking
 */
export function thinkTime(min = 2, max = 5) {
  randomSleep(min, max);
}

export default {
  authenticatedRequest,
  login,
  randomSleep,
  randomEmployee,
  randomPromotionRequest,
  checkResponse,
  createFileUpload,
  randomItem,
  thinkTime,
  errorRate,
};
