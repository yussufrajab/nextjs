import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';
import { BASE_URL, thresholds, testUsers } from '../k6.config.js';
import { login, checkResponse, thinkTime, randomItem } from '../utils/helpers.js';

// Custom metrics
const uploadDuration = new Trend('file_upload_duration');
const downloadDuration = new Trend('file_download_duration');
const uploadSuccessRate = new Counter('upload_success');
const uploadFailureRate = new Counter('upload_failure');

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Ramp up slowly (file ops are heavy)
    { duration: '3m', target: 5 },    // Steady state
    { duration: '1m', target: 15 },   // Spike
    { duration: '2m', target: 15 },   // Maintain spike
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...thresholds,
    'http_req_duration{scenario:upload}': ['p(95)<3000'], // Uploads can be slower
    'http_req_duration{scenario:download}': ['p(95)<2000'],
    'file_upload_duration': ['p(95)<3000'],
    'file_download_duration': ['p(95)<2000'],
  },
};

// Generate sample file content
function generateFileContent(sizeKB = 100) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = sizeKB * 1024;
  let content = '';

  for (let i = 0; i < bytes; i++) {
    content += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return content;
}

// Generate different PDF file types (API only accepts PDFs)
function generateTestFile() {
  const types = [
    { name: 'employment-contract.pdf', type: 'application/pdf', size: 50 },
    { name: 'birth-certificate.pdf', type: 'application/pdf', size: 75 },
    { name: 'academic-certificate.pdf', type: 'application/pdf', size: 100 },
    { name: 'recommendation-letter.pdf', type: 'application/pdf', size: 60 },
    { name: 'id-document.pdf', type: 'application/pdf', size: 80 },
  ];

  const file = randomItem(types);
  return {
    name: file.name,
    type: file.type,
    content: generateFileContent(file.size),
  };
}

export default function () {
  const user = randomItem([testUsers.hrmo, testUsers.admin, testUsers.hhrmd]);
  const authTokens = login(BASE_URL, user);

  if (!authTokens) {
    uploadFailureRate.add(1);
    sleep(1);
    return;
  }

  const { sessionToken, csrfToken, user: userData } = authTokens;

  // Scenario 1: File Upload
  group('File Upload', function () {
    const file = generateTestFile();
    const folder = randomItem(['documents', 'certificates', 'contracts']);

    // Create form data (API expects 'file' and optional 'folder')
    const formData = new FormData();
    formData.append('file', http.file(file.content, file.name, file.type));
    formData.append('folder', folder);

    const uploadStart = Date.now();
    const uploadResponse = http.post(
      `${BASE_URL}/api/files/upload`,
      formData.body(),
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-CSRF-Token': csrfToken,
          'Content-Type': `multipart/form-data; boundary=${formData.boundary}`,
        },
        tags: { scenario: 'upload' },
      }
    );
    const uploadEnd = Date.now();

    const uploadSuccess = checkResponse(uploadResponse, {
      'file upload successful': (r) => r.status === 200 || r.status === 201,
      'returns object key': (r) => {
        try {
          const body = r.json();
          return body.success === true && body.data?.objectKey !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (uploadSuccess) {
      uploadDuration.add(uploadEnd - uploadStart);
      uploadSuccessRate.add(1);

      // Extract object key for download test
      try {
        const responseBody = uploadResponse.json();
        const objectKey = responseBody.data?.objectKey;

        if (objectKey) {
          thinkTime(1, 2);

          // Scenario 2: File Download
          group('File Download', function () {
            const downloadStart = Date.now();
            const downloadResponse = http.get(
              `${BASE_URL}/api/files/download/${objectKey}`,
              {
                headers: {
                  'Authorization': `Bearer ${sessionToken}`,
                  'X-CSRF-Token': csrfToken,
                },
                tags: { scenario: 'download' },
              }
            );
            const downloadEnd = Date.now();

            const downloadSuccess = checkResponse(downloadResponse, {
              'file download successful': (r) => r.status === 200,
              'has content': (r) => r.body && r.body.length > 0,
            });

            if (downloadSuccess) {
              downloadDuration.add(downloadEnd - downloadStart);
            }
          });

          thinkTime(1, 2);

          // Scenario 3: Check if file exists
          group('File Exists Check', function () {
            const existsResponse = http.get(
              `${BASE_URL}/api/files/exists/${objectKey}`,
              {
                headers: {
                  'Authorization': `Bearer ${sessionToken}`,
                  'X-CSRF-Token': csrfToken,
                },
                tags: { scenario: 'exists' },
              }
            );

            checkResponse(existsResponse, {
              'file exists check': (r) => r.status === 200 || r.status === 404, // Both are valid responses
            });
          });
        }
      } catch (e) {
        console.error(`Error parsing upload response: ${e}`);
      }
    } else {
      uploadFailureRate.add(1);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  let summary = '\n';
  summary += 'File Operations Load Test Summary\n';
  summary += '='.repeat(50) + '\n\n';

  if (data.metrics) {
    const metrics = data.metrics;

    if (metrics.file_upload_duration) {
      summary += 'Upload Duration:\n';
      summary += `  avg: ${metrics.file_upload_duration.values.avg.toFixed(2)}ms\n`;
      summary += `  p95: ${metrics.file_upload_duration.values['p(95)'].toFixed(2)}ms\n`;
      summary += `  max: ${metrics.file_upload_duration.values.max.toFixed(2)}ms\n\n`;
    }

    if (metrics.file_download_duration) {
      summary += 'Download Duration:\n';
      summary += `  avg: ${metrics.file_download_duration.values.avg.toFixed(2)}ms\n`;
      summary += `  p95: ${metrics.file_download_duration.values['p(95)'].toFixed(2)}ms\n`;
      summary += `  max: ${metrics.file_download_duration.values.max.toFixed(2)}ms\n\n`;
    }

    if (metrics.upload_success && metrics.upload_failure) {
      const total = metrics.upload_success.values.count + metrics.upload_failure.values.count;
      const successRate = (metrics.upload_success.values.count / total) * 100;
      summary += `Upload Success Rate: ${successRate.toFixed(2)}%\n\n`;
    }
  }

  return {
    'load-tests/reports/file-operations-summary.json': JSON.stringify(data, null, 2),
    'stdout': summary,
  };
}
