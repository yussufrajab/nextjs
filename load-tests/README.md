# Load Testing Documentation

This directory contains comprehensive load testing scenarios for the Civil Service Management System (CSMS) using [k6](https://k6.io/).

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Interpreting Results](#interpreting-results)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

## Overview

The load testing suite is designed to:

1. **Find breaking points** - Stress test to discover system limits
2. **Validate performance** - Ensure SLAs are met under load
3. **Prevent regressions** - Catch performance issues before production
4. **Optimize resources** - Identify bottlenecks and optimization opportunities

### Test Coverage

- **Authentication**: Login, logout, session management
- **HR Workflows**: Promotions, confirmations, employee management
- **File Operations**: Upload, download, metadata retrieval
- **Stress Testing**: Combined scenarios with progressive load

## Installation

### Prerequisites

- Node.js 20+ (for the application)
- k6 (for load testing)

### Install k6

#### macOS
```bash
brew install k6
```

#### Ubuntu/Debian
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows
```powershell
choco install k6
```

#### Docker
```bash
docker pull grafana/k6
```

For other platforms, see [k6 installation guide](https://k6.io/docs/get-started/installation/).

### Verify Installation

```bash
k6 version
```

## Quick Start

### 1. Start the Application

```bash
npm run dev
# Application runs on http://localhost:9002
```

### 2. Run a Quick Smoke Test

```bash
./load-tests/run-tests.sh smoke
```

### 3. Run Stress Test

```bash
./load-tests/run-tests.sh stress
```

## Test Scenarios

### 1. Authentication Tests (`scenarios/auth.test.js`)

Tests the authentication system under load.

**Scenarios:**
- User login
- Session validation
- Token refresh
- User logout

**Load Profile:**
- Ramp up to 20 users over 1 minute
- Maintain 20 users for 3 minutes
- Spike to 50 users for 2 minutes
- Ramp down

**Run:**
```bash
./load-tests/run-tests.sh auth
```

### 2. HR Workflows Tests (`scenarios/hr-workflows.test.js`)

Tests core HR operations under load.

**Scenarios:**
- List promotions/confirmations
- Create promotion requests
- Get request details
- Review/approve requests
- Employee management operations

**Load Profile:**
- Ramp up to 10 users over 2 minutes
- Maintain 10 users for 5 minutes
- Spike to 30 users for 3 minutes
- Ramp down

**Run:**
```bash
./load-tests/run-tests.sh hr-workflows
```

### 3. File Operations Tests (`scenarios/file-operations.test.js`)

Tests file upload/download functionality.

**Scenarios:**
- File upload (various file types and sizes)
- File download
- File metadata retrieval
- List files

**Load Profile:**
- Ramp up to 5 users (file ops are resource-intensive)
- Maintain 5 users for 3 minutes
- Spike to 15 users for 2 minutes
- Ramp down

**Run:**
```bash
./load-tests/run-tests.sh file-ops
```

### 4. Stress Test (`stress-test.js`)

Comprehensive test combining all scenarios to find the system's breaking point.

**Load Profile (Progressive Stress):**
1. Warm up: 10 users (2 minutes)
2. Ramp to 50 users (5 minutes)
3. Ramp to 100 users (5 minutes)
4. Ramp to 200 users (5 minutes)
5. Push to 300 users (5 minutes)
6. Ramp down (2 minutes)

**Scenario Distribution:**
- 30% Authentication workflows
- 50% HR workflows
- 20% File operations

**Run:**
```bash
./load-tests/run-tests.sh stress
```

## Running Tests

### Using the Helper Script

The `run-tests.sh` script provides an easy interface:

```bash
# Run specific test
./load-tests/run-tests.sh [TEST_TYPE]

# Test types:
# - stress (default)
# - auth
# - hr-workflows
# - file-ops
# - smoke
# - all
```

### Examples

```bash
# Stress test against local server
./load-tests/run-tests.sh stress

# Auth tests against staging
BASE_URL=https://staging.csms.gov.zz ./load-tests/run-tests.sh auth

# Run all tests
./load-tests/run-tests.sh all

# Custom URL
./load-tests/run-tests.sh stress --url https://my-test-env.com
```

### Using k6 Directly

```bash
# Basic run
k6 run load-tests/stress-test.js

# With custom base URL
BASE_URL=https://staging.csms.gov.zz k6 run load-tests/stress-test.js

# With custom VUs and duration
k6 run --vus 10 --duration 30s load-tests/stress-test.js

# With JSON output
k6 run --out json=results.json load-tests/stress-test.js

# With cloud output (requires k6 Cloud account)
k6 run --out cloud load-tests/stress-test.js
```

### Using Docker

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:9002 \
  -v $PWD/load-tests:/load-tests \
  grafana/k6 run /load-tests/stress-test.js
```

## CI/CD Integration

### GitHub Actions

Tests automatically run:

- **Weekly**: Every Sunday at 2 AM UTC (scheduled)
- **On Release**: When a new release is published
- **Manual**: Via workflow dispatch

#### Manual Trigger

1. Go to Actions tab in GitHub
2. Select "Load Testing" workflow
3. Click "Run workflow"
4. Select test type and target URL
5. Click "Run workflow"

#### Workflow Configuration

See `.github/workflows/load-test.yml` for details.

The workflow:
1. Installs dependencies and k6
2. Runs selected test(s)
3. Uploads test reports as artifacts
4. Comments on PRs with results
5. Fails if thresholds are not met

### Other CI Systems

For Jenkins, GitLab CI, CircleCI, etc., use the Docker approach:

```yaml
# Example GitLab CI
load-test:
  image: grafana/k6
  script:
    - k6 run --out json=results.json load-tests/stress-test.js
  artifacts:
    paths:
      - results.json
    expire_in: 30 days
```

## Interpreting Results

### Key Metrics

#### HTTP Request Duration
- **http_req_duration**: Total request time
- **Target**: p95 < 500ms for most operations
- **Stress**: p95 < 2000ms acceptable

#### Request Failure Rate
- **http_req_failed**: Percentage of failed requests
- **Target**: < 1% under normal load
- **Stress**: < 5% under stress acceptable

#### Checks Pass Rate
- **checks**: Percentage of successful checks
- **Target**: > 95% pass rate
- **Indicates**: Functional correctness under load

#### Custom Metrics
- **login_duration**: Time to complete login
- **promotion_create_duration**: Time to create promotion
- **file_upload_duration**: Time to upload file
- **system_health**: Overall system health rate

### Understanding Output

```
     ✓ login successful
     ✓ has token
     ✓ get user info successful

     checks.........................: 98.50% ✓ 1970  ✗ 30
     data_received..................: 4.2 MB 140 kB/s
     data_sent......................: 1.1 MB 37 kB/s
     http_req_duration..............: avg=245ms  p(95)=450ms  max=1.2s
     http_req_failed................: 0.50%  ✓ 10    ✗ 1990
     iterations.....................: 1000   33.33/s
     vus............................: 100    min=1   max=100
```

**Good indicators:**
- ✓ All checks passing
- Low http_req_failed rate (< 1%)
- http_req_duration p95 meeting thresholds
- Stable iteration rate

**Warning signs:**
- ✗ Failed checks
- High failure rate
- Increasing response times
- Dropped requests

### Analyzing Reports

Reports are saved in `load-tests/reports/`:

- **JSON files**: Machine-readable results for analysis
- **HTML files**: Visual reports with graphs (stress test only)
- **Summary files**: Quick overview of key metrics

## Configuration

### Test Configuration (`k6.config.js`)

```javascript
// Modify these values to adjust test behavior
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:9002';

export const stages = {
  stress: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    // ... customize load profile
  ],
};

export const testUsers = {
  admin: {
    email: 'admin@csms.gov.zz',
    password: 'Admin123!',
  },
  // ... add test users
};
```

### Thresholds

Adjust performance thresholds in `k6.config.js`:

```javascript
export const thresholds = {
  http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
  http_req_failed: ['rate<0.01'],      // Less than 1% failures
  checks: ['rate>0.95'],               // 95% checks pass
};
```

### Environment Variables

- `BASE_URL`: Target URL (default: http://localhost:9002)
- `K6_CLOUD_TOKEN`: k6 Cloud token for cloud execution
- `K6_OUT`: Output format (json, cloud, influxdb, etc.)

## Best Practices

### Before Running Tests

1. **Isolate test environment**: Don't test production!
2. **Ensure stable baseline**: No code changes during test
3. **Check resource limits**: Ensure test machine has adequate resources
4. **Warm up the system**: Run smoke test first
5. **Monitor server metrics**: CPU, memory, database connections

### During Tests

1. **Monitor system metrics**: Watch server resources
2. **Check logs**: Look for errors and warnings
3. **Observe response times**: Watch for degradation
4. **Note breaking points**: Record when system starts failing

### After Tests

1. **Review reports**: Analyze all metrics
2. **Compare baselines**: Track performance over time
3. **Identify bottlenecks**: CPU, memory, database, network
4. **Document findings**: Record observations and issues
5. **Optimize**: Address bottlenecks and re-test

### Test Data Management

1. **Use test accounts**: Never use real user credentials
2. **Clean up**: Remove test data after runs
3. **Realistic data**: Use production-like data volumes
4. **Vary inputs**: Test different scenarios and edge cases

### Gradual Load Increase

Always ramp up gradually:
- Start with smoke tests (1 VU)
- Progress to load tests (10-20 VUs)
- Then stress tests (50-300 VUs)
- Finally, spike tests if needed

Sudden load can crash systems before you gather useful data.

### Continuous Monitoring

- Run tests regularly (weekly/monthly)
- Track metrics over time
- Set up alerts for threshold violations
- Integrate with monitoring systems (Grafana, Datadog, etc.)

## Troubleshooting

### Test Fails Immediately

```bash
# Check if application is running
curl http://localhost:9002/api/health

# Check k6 installation
k6 version

# Check test user credentials
# Verify testUsers in k6.config.js match your test database
```

### High Failure Rate

1. Check server logs for errors
2. Verify database connections aren't exhausted
3. Check rate limiting configuration
4. Increase server resources
5. Reduce load (fewer VUs)

### Inconsistent Results

1. Ensure stable environment
2. Run multiple times and average
3. Check for background processes
4. Verify network stability
5. Use dedicated test environment

### Memory Issues

```bash
# Limit VUs or reduce test duration
k6 run --vus 10 --duration 1m load-tests/stress-test.js

# Use streaming output to avoid memory buildup
k6 run --out json=results.json load-tests/stress-test.js
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Glossary](https://k6.io/docs/test-types/introduction/)

## Support

For issues or questions:

1. Check this documentation
2. Review k6 documentation
3. Check application logs
4. Open an issue with:
   - Test type and command
   - Error messages
   - System metrics
   - Test environment details
