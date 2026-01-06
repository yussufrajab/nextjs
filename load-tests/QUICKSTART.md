# Load Testing Quick Start Guide

Get started with load testing in 5 minutes!

## Prerequisites

1. **Install k6** - Follow instructions for your platform:
   - macOS: `brew install k6`
   - Ubuntu/Debian: See [installation guide](https://k6.io/docs/get-started/installation/)
   - Windows: `choco install k6`
   - Docker: `docker pull grafana/k6`

2. **Start the application**:
   ```bash
   npm run dev
   # App runs on http://localhost:9002
   ```

## Run Your First Load Test

### Option 1: Using npm scripts (Recommended)

```bash
# Quick smoke test (30 seconds, 1 user)
npm run loadtest:smoke

# Stress test (find breaking point)
npm run loadtest

# Specific scenarios
npm run loadtest:auth     # Test authentication
npm run loadtest:hr       # Test HR workflows
npm run loadtest:files    # Test file operations
npm run loadtest:all      # Run all scenarios
```

### Option 2: Using the script directly

```bash
# Smoke test
./load-tests/run-tests.sh smoke

# Stress test
./load-tests/run-tests.sh stress

# Specific test
./load-tests/run-tests.sh auth

# Against different environment
BASE_URL=https://staging.example.com ./load-tests/run-tests.sh stress
```

### Option 3: Using k6 directly

```bash
# Basic run
k6 run load-tests/stress-test.js

# Custom configuration
k6 run --vus 10 --duration 30s load-tests/scenarios/auth.test.js

# With custom base URL
BASE_URL=https://staging.example.com k6 run load-tests/stress-test.js
```

## Understanding the Output

When the test runs, you'll see:

```
     ✓ login successful
     ✓ has token
     ✓ get user info successful

     checks.........................: 98.50% ✓ 1970  ✗ 30
     http_req_duration..............: avg=245ms  p(95)=450ms
     http_req_failed................: 0.50%
     vus............................: 100
```

**What to look for:**
- ✓ Green checks = good
- Low failure rate (< 1%)
- p95 response time meeting your SLA
- Stable performance under load

## Test Scenarios

### 1. Smoke Test
**Purpose**: Quick validation that scripts work
**Duration**: 30 seconds
**Load**: 1 user
**When**: Before any other test

### 2. Authentication Test
**Purpose**: Test login/logout under load
**Duration**: ~8 minutes
**Load**: 20-50 users
**Coverage**: Login, session validation, logout

### 3. HR Workflows Test
**Purpose**: Test core business workflows
**Duration**: ~14 minutes
**Load**: 10-30 users
**Coverage**: Promotions, confirmations, employees

### 4. File Operations Test
**Purpose**: Test file handling
**Duration**: ~9 minutes
**Load**: 5-15 users
**Coverage**: Upload, download, metadata

### 5. Stress Test
**Purpose**: Find system breaking point
**Duration**: ~24 minutes
**Load**: 10 → 300 users (progressive)
**Coverage**: All scenarios combined

## Common Commands

```bash
# Quick validation
npm run loadtest:smoke

# Daily testing during development
npm run loadtest:auth
npm run loadtest:hr

# Before release
npm run loadtest

# Complete validation
npm run loadtest:all

# Custom target
BASE_URL=https://my-server.com npm run loadtest
```

## Next Steps

1. **Read the full documentation**: `load-tests/README.md`
2. **Customize test data**: Edit `load-tests/k6.config.js`
3. **Adjust thresholds**: Modify performance targets
4. **Set up monitoring**: Track metrics over time
5. **Integrate with CI/CD**: Tests run automatically via GitHub Actions

## Troubleshooting

### k6 not found
```bash
# Install k6 first
brew install k6  # macOS
# or see https://k6.io/docs/get-started/installation/
```

### Application not running
```bash
# Start the app
npm run dev

# Verify it's running
curl http://localhost:9002/api/health
```

### Tests failing immediately
```bash
# Check test user credentials in k6.config.js
# Verify database is seeded with test users
# Check application logs for errors
```

### High failure rate
- Reduce number of virtual users
- Increase server resources
- Check for errors in application logs
- Verify database can handle load

## Getting Help

- Full documentation: `load-tests/README.md`
- k6 docs: https://k6.io/docs/
- Project issues: Open a GitHub issue with test results

## Pro Tips

1. **Always start with smoke test** - Validates scripts work
2. **Monitor server resources** - Watch CPU, memory, database
3. **Test incrementally** - Don't jump to stress test immediately
4. **Use realistic data** - Match production-like scenarios
5. **Track over time** - Compare results across versions
6. **Clean up test data** - Don't pollute your database

---

Happy load testing! 🚀
