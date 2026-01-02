# Unit Test Implementation Plan

## Civil Service Management System (CSMS)

**Project Code:** CSMS-2025
**Document Version:** 1.0
**Date:** January 2, 2026
**Document Status:** Draft
**Classification:** Official

---

## Document Control

| Version | Date            | Author           | Changes                               |
| ------- | --------------- | ---------------- | ------------------------------------- |
| 1.0     | January 2, 2026 | Development Team | Initial Unit Test Implementation Plan |

---

## Executive Summary

This Unit Test Implementation Plan defines the comprehensive approach, framework selection, implementation strategy, and timeline for adding automated unit testing to the Civil Service Management System (CSMS). Currently, the system has **zero automated tests** across **202 TypeScript files** and **73 API routes**.

**Current State:**

- **Total Files:** 202 TypeScript files
- **API Routes:** 73 files
- **Utility Libraries:** 26 files
- **Existing Tests:** 0
- **Test Coverage:** 0%
- **Testing Approach:** Manual UAT only (244 scenarios)

**Target State:**

- **Test Framework:** Vitest (modern, fast, TypeScript-native)
- **Target Coverage:** 80%+ for critical paths, 60%+ overall
- **Total Test Files:** ~150-200 test files
- **Estimated Tests:** 800-1,200 individual test cases
- **Timeline:** 8 weeks (phased implementation)

**Key Objectives:**

1. Reduce regression defects by 70%+
2. Enable confident refactoring and code changes
3. Catch bugs early in development cycle
4. Improve code quality and maintainability
5. Support continuous integration/deployment

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Current State Analysis](#2-current-state-analysis)
3. [Test Framework Selection](#3-test-framework-selection)
4. [Testing Strategy](#4-testing-strategy)
5. [Implementation Phases](#5-implementation-phases)
6. [Test Coverage Goals](#6-test-coverage-goals)
7. [Testing Priorities](#7-testing-priorities)
8. [Framework Setup](#8-framework-setup)
9. [Testing Patterns & Best Practices](#9-testing-patterns--best-practices)
10. [Team Training & Onboarding](#10-team-training--onboarding)
11. [CI/CD Integration](#11-cicd-integration)
12. [Success Metrics](#12-success-metrics)
13. [Timeline & Milestones](#13-timeline--milestones)
14. [Risk Management](#14-risk-management)
15. [Appendices](#15-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document outlines the strategy and implementation plan for introducing automated unit testing to the CSMS project. The plan addresses the current gap identified in the Quality Assurance Plan (Section 5.1) where unit testing is listed as "NOT IMPLEMENTED (future enhancement)."

### 1.2 Scope

**In Scope:**

- Unit testing for utility functions and libraries (`/src/lib/`)
- Unit testing for API route handlers (`/src/app/api/`)
- Component testing for critical React components
- Testing for custom React hooks
- Testing for state management (Zustand stores)
- Integration testing for database operations (Prisma)
- API integration testing

**Out of Scope (separate initiatives):**

- End-to-end (E2E) testing (Playwright, Cypress)
- Visual regression testing
- Load/performance testing
- Manual UAT (already covered in QA Plan)

### 1.3 Benefits

**Development Benefits:**

- Catch bugs before they reach QA
- Enable safe refactoring
- Faster debugging (isolated test failures)
- Living documentation of code behavior
- Improved code design (testable code is better code)

**Business Benefits:**

- Reduced defect density (target: <2 defects/KLOC)
- Faster development velocity (confident changes)
- Lower QA costs (fewer defects to manually test)
- Improved system reliability
- Reduced production incidents

**Quality Benefits:**

- Automated regression testing
- Consistent test execution
- Measurable code coverage
- Early defect detection
- Improved code maintainability

---

## 2. Current State Analysis

### 2.1 Codebase Statistics

| Category              | Count   | Files Requiring Tests     | Priority |
| --------------------- | ------- | ------------------------- | -------- |
| **API Routes**        | 73      | 73                        | Critical |
| **Utility Libraries** | 26      | 26                        | Critical |
| **React Components**  | ~80     | ~40 (critical components) | High     |
| **Custom Hooks**      | ~8      | 8                         | High     |
| **Store (Zustand)**   | ~2      | 2                         | High     |
| **Total**             | **202** | **~150**                  | -        |

### 2.2 Critical Areas Analysis

**High-Risk Areas (Must Test First):**

1. **Security & Authentication** (9 files)
   - `src/lib/password-utils.ts` - Password hashing, validation
   - `src/lib/account-lockout-utils.ts` - Account lockout logic
   - `src/lib/session-manager.ts` - Session management
   - `src/lib/suspicious-login-detector.ts` - Login anomaly detection
   - `src/lib/password-expiration-utils.ts` - Password expiration
   - `src/lib/csrf-utils.ts` - CSRF protection
   - `src/lib/role-utils.ts` - Role-based access control
   - `src/lib/route-permissions.ts` - Route authorization
   - `src/store/auth-store.ts` - Auth state management

2. **Audit & Compliance** (2 files)
   - `src/lib/audit-logger.ts` - Audit trail logging
   - `src/lib/notifications.ts` - Notification system

3. **Data Validation & Processing** (5 files)
   - `src/lib/employee-status-validation.ts` - Business rules
   - `src/lib/export-utils.ts` - Data export (Excel, PDF)
   - `src/lib/utils.ts` - Common utilities
   - `src/lib/db.ts` - Database helpers
   - `src/lib/minio.ts` - File storage operations

4. **Background Jobs** (2 files)
   - `src/lib/jobs/hrims-sync-queue.ts` - Job queue management
   - `src/lib/jobs/hrims-sync-worker.ts` - HRIMS sync logic

5. **API Endpoints** (73 files)
   - Authentication endpoints (login, logout, password change)
   - HR request workflows (8 types)
   - User management
   - Employee management
   - Complaint management
   - Reporting endpoints

### 2.3 Technical Stack

**Current Technologies:**

- **Language:** TypeScript 5
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19
- **Database:** PostgreSQL + Prisma ORM 6.19
- **Storage:** MinIO
- **Background Jobs:** BullMQ + Redis
- **Validation:** Zod
- **State:** Zustand

**Testing Requirements:**

- Must support TypeScript
- Must work with Next.js App Router
- Must support async/await
- Must support Prisma mocking
- Must support React component testing
- Must be fast (developer experience)

---

## 3. Test Framework Selection

### 3.1 Framework Comparison

| Feature                | **Vitest**                | Jest                    | Testing Library       |
| ---------------------- | ------------------------- | ----------------------- | --------------------- |
| **TypeScript Support** | ✅ Native                 | ⚠️ Requires config      | ✅ Native             |
| **Speed**              | ✅ Very Fast (Vite)       | ⚠️ Moderate             | N/A (not test runner) |
| **Next.js Support**    | ✅ Excellent              | ✅ Good                 | ✅ Excellent          |
| **API Mocking**        | ✅ Built-in               | ✅ Manual setup         | ❌ Not applicable     |
| **Prisma Mocking**     | ✅ Easy                   | ✅ Easy                 | N/A                   |
| **React Testing**      | ✅ Via @testing-library   | ✅ Via @testing-library | ✅ Purpose-built      |
| **Watch Mode**         | ✅ Instant                | ⚠️ Slow                 | N/A                   |
| **Coverage Reports**   | ✅ Built-in (c8)          | ✅ Built-in (istanbul)  | N/A                   |
| **Learning Curve**     | ✅ Easy (Jest-compatible) | ⚠️ Moderate             | ✅ Easy               |
| **Community**          | ✅ Growing fast           | ✅ Mature               | ✅ Mature             |
| **Maintenance**        | ✅ Active                 | ✅ Active               | ✅ Active             |

### 3.2 Recommended Stack

**Selected Framework: Vitest**

**Rationale:**

1. **Speed:** 10-20x faster than Jest (critical for developer experience)
2. **Native TypeScript:** Zero configuration needed
3. **Modern:** Built for modern JS/TS projects
4. **Jest-Compatible API:** Easy migration path, familiar syntax
5. **Vite Integration:** Leverages Vite's speed and features
6. **Active Development:** Backed by Vite team
7. **Excellent Next.js Support:** Works seamlessly with Next.js 16

**Complete Testing Stack:**

```json
{
  "Core Framework": "Vitest",
  "Component Testing": "@testing-library/react",
  "DOM Testing": "@testing-library/jest-dom",
  "User Interactions": "@testing-library/user-event",
  "API Mocking": "MSW (Mock Service Worker)",
  "Prisma Mocking": "vitest-mock-extended",
  "Coverage": "c8 (built into Vitest)",
  "Assertions": "Vitest (Jest-compatible)"
}
```

### 3.3 Why Not Jest?

While Jest is mature and widely used, Vitest offers significant advantages:

| Aspect                   | Jest              | Vitest          | Winner |
| ------------------------ | ----------------- | --------------- | ------ |
| **Initial Setup**        | Complex config    | Minimal config  | Vitest |
| **Speed**                | 30-60s test suite | 3-5s test suite | Vitest |
| **TypeScript**           | Requires ts-jest  | Native support  | Vitest |
| **Watch Mode**           | Slow (5-10s)      | Instant (<1s)   | Vitest |
| **ESM Support**          | Problematic       | Perfect         | Vitest |
| **Developer Experience** | Good              | Excellent       | Vitest |

**Decision:** Vitest is the superior choice for modern TypeScript/Next.js projects.

---

## 4. Testing Strategy

### 4.1 Testing Pyramid

```
         ┌──────────────────┐
         │   E2E Tests      │  ← 5% (Out of scope - future)
         │   (Playwright)   │
         ├──────────────────┤
         │ Integration Tests│  ← 15% (API + DB)
         │  (Vitest + MSW)  │
         ├──────────────────┤
         │  Unit Tests      │  ← 80% (Functions, Utils, Components)
         │    (Vitest)      │
         └──────────────────┘
```

**Focus:** 80% unit tests, 15% integration tests, 5% E2E (future)

### 4.2 Test Types

#### 4.2.1 Unit Tests (80%)

**What to Test:**

- Pure functions (utilities, helpers)
- Business logic (validation, calculations)
- Data transformations
- Error handling
- Edge cases

**Example Files:**

- `password-utils.ts` - hash, compare, validate strength
- `role-utils.ts` - permission checks
- `export-utils.ts` - data formatting
- `utils.ts` - common helpers (cn, formatDate, etc.)

**Test Characteristics:**

- Isolated (no external dependencies)
- Fast (<1ms per test)
- Deterministic (same input = same output)
- No database, no network, no file system

---

#### 4.2.2 Integration Tests (15%)

**What to Test:**

- API endpoints (request → response)
- Database operations (Prisma queries)
- Background jobs (BullMQ)
- External service integration (MinIO, Redis)

**Example Scenarios:**

- POST /api/auth/login → validates credentials → returns JWT
- POST /api/promotion-requests → validates data → saves to DB → returns 201
- HRIMS sync job → fetches data → transforms → saves to DB

**Test Characteristics:**

- Multiple components working together
- Mocked external dependencies (DB, MinIO, Redis)
- Slower than unit tests (10-100ms per test)
- Test real data flows

---

#### 4.2.3 Component Tests (Included in Unit Tests)

**What to Test:**

- Component rendering
- User interactions (clicks, typing)
- Conditional rendering
- Props validation
- State changes

**Example Components:**

- `LoginForm` - validates input, calls API, handles errors
- `PasswordStrengthMeter` - displays strength based on score
- `EmployeeSearch` - filters employees, displays results

**Test Characteristics:**

- Render in test environment (jsdom)
- Simulate user interactions
- Assert DOM output
- Mock API calls

---

### 4.3 What NOT to Test

**Avoid Testing:**

1. **Third-party libraries** (trust React, Prisma, etc.)
2. **Simple getters/setters** (no logic)
3. **Configuration files** (constants, types)
4. **UI styling** (CSS, Tailwind classes)
5. **Private implementation details** (test behavior, not internals)

**Focus on:**

- Business logic
- Security features
- Data validation
- Error handling
- Critical user flows

---

## 5. Implementation Phases

### 5.1 Phase Overview

| Phase                       | Duration    | Focus                          | Tests Added    | Coverage |
| --------------------------- | ----------- | ------------------------------ | -------------- | -------- |
| **Phase 0: Setup**          | 1 week      | Framework installation, config | 0              | 0%       |
| **Phase 1: Critical Utils** | 2 weeks     | Security, audit, validation    | ~150           | 15%      |
| **Phase 2: API Routes**     | 3 weeks     | Authentication, HR workflows   | ~400           | 45%      |
| **Phase 3: Components**     | 1.5 weeks   | Critical React components      | ~200           | 60%      |
| **Phase 4: Remaining**      | 0.5 weeks   | Hooks, stores, misc            | ~100           | 70%      |
| **Phase 5: Polish**         | 0.5 weeks   | Coverage gaps, refactoring     | +50            | 80%      |
| **Total**                   | **8 weeks** | -                              | **~900 tests** | **80%**  |

---

### 5.2 Phase 0: Framework Setup (Week 1)

**Objective:** Install and configure testing framework

**Tasks:**

1. Install Vitest and dependencies
2. Configure `vitest.config.ts`
3. Update `tsconfig.json` for tests
4. Setup test utilities and helpers
5. Configure coverage reporting
6. Setup CI/CD integration (GitHub Actions)
7. Write first sample test (smoke test)
8. Document testing guidelines

**Deliverables:**

- ✅ Working test environment
- ✅ Sample test passing
- ✅ Coverage reporting functional
- ✅ Team training session completed
- ✅ Testing guidelines document

**Dependencies Installed:**

```json
{
  "vitest": "^2.1.0",
  "@vitejs/plugin-react": "^4.3.0",
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/user-event": "^14.5.2",
  "msw": "^2.6.0",
  "vitest-mock-extended": "^2.0.3",
  "@vitest/coverage-v8": "^2.1.0",
  "jsdom": "^25.0.0"
}
```

**Exit Criteria:**

- [ ] All dependencies installed
- [ ] `npm test` runs successfully
- [ ] Sample test passes
- [ ] Coverage report generates
- [ ] Team trained on basics

---

### 5.3 Phase 1: Critical Utilities (Weeks 2-3)

**Objective:** Test high-risk security and business logic

**Priority Files (26 files → ~150 tests):**

#### Week 2: Security & Auth (60 tests)

1. `password-utils.ts` (15 tests)
   - ✅ Hash password correctly
   - ✅ Compare passwords (valid/invalid)
   - ✅ Validate password strength
   - ✅ Reject weak passwords
   - ✅ Handle edge cases (empty, null, special chars)

2. `account-lockout-utils.ts` (15 tests)
   - ✅ Track failed login attempts
   - ✅ Lock account after 5 failures
   - ✅ Unlock after 30 minutes
   - ✅ Reset counter on success
   - ✅ Handle edge cases (expired locks, etc.)

3. `session-manager.ts` (15 tests)
   - ✅ Create session
   - ✅ Validate session
   - ✅ Terminate session
   - ✅ Enforce max 3 concurrent sessions
   - ✅ Handle session expiration (24 hours)

4. `suspicious-login-detector.ts` (15 tests)
   - ✅ Detect unusual location
   - ✅ Detect multiple devices
   - ✅ Detect rapid failed attempts
   - ✅ Generate alerts
   - ✅ Edge cases (VPN, mobile, etc.)

#### Week 3: Validation & Business Logic (90 tests)

5. `role-utils.ts` (10 tests)
   - ✅ Check user permissions
   - ✅ Validate role hierarchy
   - ✅ Handle invalid roles

6. `employee-status-validation.ts` (15 tests)
   - ✅ Validate promotion eligibility
   - ✅ Validate confirmation eligibility
   - ✅ Check employment status
   - ✅ Business rule enforcement

7. `audit-logger.ts` (10 tests)
   - ✅ Log user actions
   - ✅ Format log entries correctly
   - ✅ Handle async logging
   - ✅ Error handling

8. `export-utils.ts` (20 tests)
   - ✅ Export to Excel (XLSX)
   - ✅ Export to PDF
   - ✅ Format data correctly
   - ✅ Handle large datasets
   - ✅ Edge cases (empty, null values)

9. `utils.ts` (15 tests)
   - ✅ cn() - class name merging
   - ✅ Date formatting
   - ✅ String utilities
   - ✅ Common helpers

10. Remaining lib files (20 tests)
    - `minio.ts`, `db.ts`, `redis.ts`, etc.

**Exit Criteria:**

- [ ] 150+ tests passing
- [ ] ~15% code coverage achieved
- [ ] All critical security functions tested
- [ ] Zero failed tests
- [ ] Documentation updated

---

### 5.4 Phase 2: API Routes (Weeks 4-6)

**Objective:** Test all API endpoints (73 files → ~400 tests)

**Testing Approach:**

- Use MSW (Mock Service Worker) for HTTP mocking
- Mock Prisma database calls
- Test request validation
- Test response formatting
- Test error handling
- Test authorization checks

#### Week 4: Authentication APIs (80 tests)

1. `/api/auth/login` (20 tests)
   - ✅ Valid credentials → success
   - ✅ Invalid credentials → 401
   - ✅ Account locked → 403
   - ✅ Password expired → redirect
   - ✅ Track login attempts
   - ✅ Create session
   - ✅ Return JWT token

2. `/api/auth/logout` (10 tests)
3. `/api/auth/change-password` (15 tests)
4. `/api/auth/session` (10 tests)
5. `/api/users` CRUD (25 tests)

#### Week 5: HR Request Workflows (200 tests)

6. `/api/promotion-requests` (25 tests)
7. `/api/confirmation-requests` (25 tests)
8. `/api/lwop-requests` (25 tests)
9. `/api/cadre-change-requests` (25 tests)
10. `/api/retirement-requests` (25 tests)
11. `/api/resignation-requests` (25 tests)
12. `/api/service-extension-requests` (25 tests)
13. `/api/termination-requests` (25 tests)

#### Week 6: Supporting APIs (120 tests)

14. `/api/employees` (30 tests)
15. `/api/institutions` (20 tests)
16. `/api/complaints` (20 tests)
17. `/api/notifications` (15 tests)
18. `/api/audit-logs` (15 tests)
19. `/api/reports` (20 tests)

**API Test Template:**

```typescript
describe('POST /api/promotion-requests', () => {
  it('should create promotion request with valid data', async () => {
    // Arrange
    const validRequest = {
      employeeId: '123',
      promotionType: 'VERTICAL',
      newCadre: 'Senior Officer',
      // ...
    };

    // Act
    const response = await POST(validRequest);

    // Assert
    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      id: expect.any(String),
      status: 'PENDING',
    });
  });

  it('should reject invalid promotion type', async () => {
    const invalidRequest = { promotionType: 'INVALID' };
    const response = await POST(invalidRequest);
    expect(response.status).toBe(400);
    expect(response.error).toBe('Invalid promotion type');
  });

  it('should require authentication', async () => {
    const response = await POST({}, { noAuth: true });
    expect(response.status).toBe(401);
  });

  it('should check authorization (HRO role required)', async () => {
    const response = await POST({}, { role: 'EMPLOYEE' });
    expect(response.status).toBe(403);
  });
});
```

**Exit Criteria:**

- [ ] 400+ API tests passing
- [ ] ~45% code coverage achieved
- [ ] All critical endpoints tested
- [ ] Authorization tested on all routes
- [ ] Error handling validated

---

### 5.5 Phase 3: React Components (Weeks 6.5-8)

**Objective:** Test critical UI components (~40 components → ~200 tests)

**Priority Components:**

#### Week 6.5: Auth Components (60 tests)

1. `LoginForm` (20 tests)
   - ✅ Renders correctly
   - ✅ Validates input (required fields)
   - ✅ Submits form on valid data
   - ✅ Displays errors
   - ✅ Handles loading state
   - ✅ Handles success/failure

2. `PasswordStrengthMeter` (15 tests)
3. `ChangePasswordModal` (15 tests)
4. `PasswordExpirationBanner` (10 tests)

#### Week 7: HR Workflow Components (80 tests)

5. `PromotionRequestForm` (20 tests)
6. `ConfirmationRequestForm` (20 tests)
7. `EmployeeSearch` (15 tests)
8. `DocumentUpload` (15 tests)
9. `FilePreviewModal` (10 tests)

#### Week 7.5: Admin & Shared Components (60 tests)

10. `UserManagementTable` (15 tests)
11. `AuditLogTable` (15 tests)
12. `Pagination` (10 tests)
13. `PageHeader` (10 tests)
14. `NotificationBell` (10 tests)

**Component Test Template:**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('should submit form with valid credentials', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    render(<LoginForm onLogin={mockLogin} />);

    await userEvent.type(screen.getByLabelText(/username/i), 'testuser');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });
});
```

**Exit Criteria:**

- [ ] 200+ component tests passing
- [ ] ~60% code coverage achieved
- [ ] All critical components tested
- [ ] User interactions validated
- [ ] Accessibility checked (basic)

---

### 5.6 Phase 4: Hooks & Stores (Week 8)

**Objective:** Test custom hooks and state management (~10 files → ~100 tests)

**Files to Test:**

1. **Custom Hooks** (60 tests)
   - `use-route-guard.ts` (15 tests)
   - `use-inactivity-timeout.ts` (15 tests)
   - `use-file-exists.ts` (10 tests)
   - `use-api-init.ts` (10 tests)
   - `use-toast.ts` (10 tests)

2. **Zustand Stores** (40 tests)
   - `auth-store.ts` (30 tests)
     - ✅ Login action
     - ✅ Logout action
     - ✅ Update user
     - ✅ Session management
     - ✅ State persistence

**Hook Test Template:**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useInactivityTimeout } from './use-inactivity-timeout';

describe('useInactivityTimeout', () => {
  it('should trigger timeout after 7 minutes of inactivity', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout({ onTimeout, timeout: 7 * 60 * 1000 })
    );

    // Fast-forward 7 minutes
    act(() => {
      vi.advanceTimersByTime(7 * 60 * 1000);
    });

    expect(onTimeout).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should reset timer on user activity', () => {
    // Test activity detection
  });
});
```

**Exit Criteria:**

- [ ] 100+ hook/store tests passing
- [ ] ~70% code coverage achieved
- [ ] All custom hooks tested
- [ ] State management validated

---

### 5.7 Phase 5: Coverage & Polish (Week 8)

**Objective:** Fill coverage gaps, refactor, optimize

**Tasks:**

1. **Coverage Analysis**
   - Run coverage report
   - Identify untested code paths
   - Write tests for gaps

2. **Refactoring**
   - Improve test readability
   - Extract common test utilities
   - Reduce test duplication

3. **Documentation**
   - Update testing guidelines
   - Document test patterns
   - Create testing cookbook

4. **Performance Optimization**
   - Identify slow tests
   - Optimize test setup/teardown
   - Parallelize test execution

**Exit Criteria:**

- [ ] 80%+ code coverage achieved
- [ ] <5% untested critical code
- [ ] All tests pass reliably
- [ ] Test suite runs in <30 seconds
- [ ] Documentation complete

---

## 6. Test Coverage Goals

### 6.1 Overall Coverage Targets

| Category              | Target Coverage | Rationale                                          |
| --------------------- | --------------- | -------------------------------------------------- |
| **Security & Auth**   | 95%+            | Critical - must be thoroughly tested               |
| **Business Logic**    | 90%+            | High risk - core functionality                     |
| **API Routes**        | 85%+            | Important - user-facing                            |
| **Utility Functions** | 90%+            | Highly reusable - must be reliable                 |
| **React Components**  | 70%+            | UI changes frequently - balance coverage vs effort |
| **Hooks & Stores**    | 85%+            | State management - critical                        |
| **Overall Project**   | 80%+            | Industry best practice                             |

### 6.2 Coverage Metrics

**Tracked Metrics:**

1. **Line Coverage:** % of lines executed
2. **Branch Coverage:** % of if/else branches tested
3. **Function Coverage:** % of functions called
4. **Statement Coverage:** % of statements executed

**Quality Gates:**

- ❌ Block PR if coverage drops below 75%
- ⚠️ Warn if coverage drops below 80%
- ✅ Pass if coverage maintains 80%+

### 6.3 Coverage Reporting

**Tools:**

- **Vitest Coverage:** Built-in c8 coverage
- **Coverage Reports:** HTML, JSON, LCOV formats
- **CI Integration:** Upload to Codecov/Coveralls (optional)

**Commands:**

```bash
npm test                    # Run tests
npm test -- --coverage     # Run with coverage
npm test -- --ui           # Interactive UI mode
npm test -- --watch        # Watch mode
```

---

## 7. Testing Priorities

### 7.1 Priority Matrix

| Priority              | Category        | Files | Tests | Weeks | Coverage Target |
| --------------------- | --------------- | ----- | ----- | ----- | --------------- |
| **P0 - Critical**     | Security & Auth | 9     | 100   | 1     | 95%+            |
| **P1 - High**         | Business Logic  | 10    | 120   | 1     | 90%+            |
| **P2 - Important**    | API Routes      | 73    | 400   | 3     | 85%+            |
| **P3 - Medium**       | Components      | 40    | 200   | 1.5   | 70%+            |
| **P4 - Nice-to-have** | Hooks & Stores  | 10    | 100   | 0.5   | 85%+            |

### 7.2 Risk-Based Prioritization

**High Risk (Test First):**

1. Authentication & authorization
2. Password management
3. Session management
4. Audit logging
5. Data validation
6. File upload/download
7. HRIMS integration
8. Background jobs

**Medium Risk (Test Second):**

1. HR request workflows
2. User management
3. Employee management
4. Reporting
5. Notifications

**Low Risk (Test Last):**

1. UI components (non-critical)
2. Styling utilities
3. Static pages
4. Configuration

---

## 8. Framework Setup

### 8.1 Installation

**Step 1: Install Dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8 jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw vitest-mock-extended
```

**Step 2: Create Configuration**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/dist',
        '.next/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Create Test Setup**

Create `test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:9002';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup MSW (Mock Service Worker)
// Will be configured in Phase 2
```

**Step 4: Update package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

**Step 5: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### 8.2 Test Structure

**Recommended Directory Structure:**

```
/home/latest/
├── src/
│   ├── lib/
│   │   ├── password-utils.ts
│   │   └── password-utils.test.ts          # Co-located tests
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           └── login/
│   │               ├── route.ts
│   │               └── route.test.ts       # Co-located tests
│   └── components/
│       └── auth/
│           ├── login-form.tsx
│           └── login-form.test.tsx         # Co-located tests
├── test/
│   ├── setup.ts                            # Global test setup
│   ├── helpers/                            # Test utilities
│   │   ├── mock-prisma.ts
│   │   ├── mock-session.ts
│   │   └── test-utils.tsx                  # Custom render, etc.
│   └── fixtures/                           # Test data
│       ├── users.ts
│       └── employees.ts
└── vitest.config.ts
```

**Naming Conventions:**

- Test files: `*.test.ts` or `*.spec.ts`
- Co-located with source files
- Use descriptive test names

---

## 9. Testing Patterns & Best Practices

### 9.1 Unit Test Pattern (AAA Pattern)

**Arrange-Act-Assert:**

```typescript
describe('hashPassword', () => {
  it('should hash password with bcrypt', async () => {
    // Arrange - Setup test data
    const plainPassword = 'MySecurePassword123!';

    // Act - Execute function
    const hashedPassword = await hashPassword(plainPassword);

    // Assert - Verify outcome
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
  });
});
```

### 9.2 API Test Pattern

```typescript
import { POST } from './route';
import { mockPrisma } from '@/test/helpers/mock-prisma';
import { mockSession } from '@/test/helpers/mock-session';

describe('POST /api/promotion-requests', () => {
  beforeEach(() => {
    mockPrisma.reset();
  });

  it('should create promotion request', async () => {
    // Arrange
    const mockUser = { id: '1', role: 'HRO', institutionId: '10' };
    mockSession(mockUser);

    const requestData = {
      employeeId: 'EMP-001',
      promotionType: 'VERTICAL',
      newCadre: 'Senior Officer',
    };

    mockPrisma.promotionRequest.create.mockResolvedValue({
      id: '123',
      ...requestData,
      status: 'PENDING',
    });

    // Act
    const request = new Request('http://localhost/api/promotion-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data.id).toBe('123');
    expect(data.status).toBe('PENDING');
    expect(mockPrisma.promotionRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining(requestData),
    });
  });
});
```

### 9.3 Component Test Pattern

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('should handle successful login', async () => {
    // Arrange
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<LoginForm onLogin={mockLogin} />);

    // Act
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Assert
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'Password123!',
      });
    });
  });
});
```

### 9.4 Best Practices

**DO:**
✅ Write clear, descriptive test names
✅ Test one thing per test
✅ Use AAA pattern (Arrange-Act-Assert)
✅ Mock external dependencies
✅ Test edge cases and error handling
✅ Keep tests independent (no shared state)
✅ Use factories for test data
✅ Test behavior, not implementation

**DON'T:**
❌ Test third-party libraries
❌ Test implementation details
❌ Share state between tests
❌ Hardcode test data
❌ Skip error cases
❌ Write flaky tests (random failures)
❌ Make tests too complex

### 9.5 Test Data Management

**Use Test Fixtures:**

```typescript
// test/fixtures/users.ts
export const mockUsers = {
  hro: {
    id: '1',
    username: 'test_hro',
    role: 'HRO',
    institutionId: '10',
  },
  admin: {
    id: '2',
    username: 'test_admin',
    role: 'ADMIN',
  },
  employee: {
    id: '3',
    username: 'test_employee',
    role: 'EMPLOYEE',
    institutionId: '10',
  },
};
```

**Use Test Factories:**

```typescript
// test/helpers/factories.ts
export const createMockEmployee = (overrides = {}) => ({
  id: 'EMP-001',
  firstName: 'John',
  lastName: 'Doe',
  fileNumber: 'ZAN-12345',
  institutionId: '10',
  status: 'ACTIVE',
  ...overrides,
});
```

---

## 10. Team Training & Onboarding

### 10.1 Training Plan

**Week 1: Framework Introduction (4 hours)**

**Session 1: Vitest Basics (2 hours)**

- Why unit testing?
- Vitest vs Jest
- Writing your first test
- Running tests (CLI, watch mode)
- Reading test output

**Session 2: Testing Patterns (2 hours)**

- AAA pattern
- Mocking basics
- Test fixtures and factories
- Best practices
- Code review checklist

**Hands-on Exercise:**

- Write tests for a simple utility function
- Write tests for a React component
- Fix failing tests

### 10.2 Documentation

**Create Testing Cookbook:**

1. **Getting Started**
   - Installation
   - Running tests
   - Writing first test

2. **Common Patterns**
   - Testing utilities
   - Testing API routes
   - Testing components
   - Testing hooks

3. **Mocking Guide**
   - Mocking Prisma
   - Mocking Next.js
   - Mocking external APIs
   - Mocking file system

4. **Troubleshooting**
   - Common errors
   - Debugging tests
   - Performance issues

### 10.3 Code Review Guidelines

**Testing Checklist for PRs:**

- [ ] All new code has tests
- [ ] Tests follow naming conventions
- [ ] Tests use AAA pattern
- [ ] Edge cases are tested
- [ ] Error handling is tested
- [ ] Mocks are properly configured
- [ ] Tests are independent
- [ ] Coverage doesn't decrease

---

## 11. CI/CD Integration

### 11.1 GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: npm test -- --coverage --thresholds.lines=80
```

### 11.2 Pre-commit Hooks

Install Husky for pre-commit hooks:

```bash
npm install -D husky lint-staged
npx husky init
```

Configure `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for staged files
npm test -- --run --changed
```

### 11.3 Quality Gates

**Block Merges If:**

- ❌ Tests fail
- ❌ Coverage drops below 75%
- ❌ New code has <80% coverage
- ❌ Critical files have <90% coverage

**Warn If:**

- ⚠️ Coverage drops below 80%
- ⚠️ Slow tests (>5s)
- ⚠️ Flaky tests detected

---

## 12. Success Metrics

### 12.1 Quantitative Metrics

| Metric                    | Baseline        | Target          | Timeline |
| ------------------------- | --------------- | --------------- | -------- |
| **Test Coverage**         | 0%              | 80%+            | 8 weeks  |
| **Total Tests**           | 0               | 900+            | 8 weeks  |
| **Test Execution Time**   | N/A             | <30s            | 8 weeks  |
| **Defect Detection Rate** | 60% in UAT      | 85% in dev      | 12 weeks |
| **Defect Density**        | ~5 defects/KLOC | <2 defects/KLOC | 16 weeks |
| **Regression Defects**    | High            | -70%            | 12 weeks |
| **Build Success Rate**    | 70%             | 95%+            | 8 weeks  |

### 12.2 Qualitative Metrics

**Developer Experience:**

- ✅ Faster debugging (isolated failures)
- ✅ Confident refactoring
- ✅ Living documentation
- ✅ Improved code quality

**Business Impact:**

- ✅ Reduced QA time (fewer defects)
- ✅ Faster feature delivery
- ✅ Higher system reliability
- ✅ Lower maintenance costs

### 12.3 Monitoring & Reporting

**Weekly Reports:**

- Tests written this week
- Coverage change
- Test execution time
- Failed tests
- Issues identified

**Monthly Reports:**

- Coverage trends
- Defect density trends
- Test suite performance
- Team adoption

---

## 13. Timeline & Milestones

### 13.1 Detailed Timeline

| Week         | Phase                       | Deliverables                     | Tests      | Coverage |
| ------------ | --------------------------- | -------------------------------- | ---------- | -------- |
| **Week 1**   | Phase 0: Setup              | Framework installed, config done | 5 (sample) | 1%       |
| **Week 2**   | Phase 1.1: Security         | Security utils tested            | 60         | 8%       |
| **Week 3**   | Phase 1.2: Business Logic   | Validation utils tested          | 150        | 15%      |
| **Week 4**   | Phase 2.1: Auth APIs        | Auth endpoints tested            | 230        | 25%      |
| **Week 5**   | Phase 2.2: HR Workflows     | HR endpoints tested              | 430        | 38%      |
| **Week 6**   | Phase 2.3: Supporting APIs  | All APIs tested                  | 550        | 45%      |
| **Week 6.5** | Phase 3.1: Auth Components  | Auth components tested           | 610        | 52%      |
| **Week 7**   | Phase 3.2: HR Components    | HR components tested             | 690        | 58%      |
| **Week 7.5** | Phase 3.3: Admin Components | Admin components tested          | 750        | 62%      |
| **Week 8**   | Phase 4: Hooks & Stores     | Hooks/stores tested              | 850        | 70%      |
| **Week 8**   | Phase 5: Polish             | Coverage gaps filled             | 900        | 80%      |

### 13.2 Milestones

| Milestone                        | Date         | Criteria                              | Owner    |
| -------------------------------- | ------------ | ------------------------------------- | -------- |
| **M1: Framework Setup Complete** | End Week 1   | Vitest installed, sample test passing | Dev Team |
| **M2: Critical Utils Tested**    | End Week 3   | 150 tests, 15% coverage               | Dev Team |
| **M3: All APIs Tested**          | End Week 6   | 550 tests, 45% coverage               | Dev Team |
| **M4: Components Tested**        | End Week 7.5 | 750 tests, 62% coverage               | Dev Team |
| **M5: 80% Coverage Achieved**    | End Week 8   | 900 tests, 80% coverage               | Dev Team |
| **M6: CI/CD Integrated**         | End Week 8   | Tests run on every PR                 | DevOps   |
| **M7: Team Trained**             | End Week 8   | All developers can write tests        | QA Lead  |

---

## 14. Risk Management

### 14.1 Implementation Risks

| Risk                              | Probability | Impact | Mitigation                                           |
| --------------------------------- | ----------- | ------ | ---------------------------------------------------- |
| **Team resistance to testing**    | Medium      | High   | Training, showcase benefits, code review enforcement |
| **Timeline slippage**             | Medium      | Medium | Phased approach, prioritize critical tests           |
| **Flaky tests**                   | Medium      | High   | Strict test independence, proper mocking             |
| **Slow test execution**           | Low         | Medium | Optimize setup, parallelize tests                    |
| **Low coverage in complex areas** | Medium      | High   | Extra focus on critical paths, pair programming      |
| **Learning curve**                | Medium      | Medium | Training sessions, documentation, mentorship         |
| **Breaking changes in tests**     | Low         | Low    | Semantic versioning, gradual migration               |

### 14.2 Mitigation Strategies

**Strategy 1: Incremental Adoption**

- Start with critical code (security, auth)
- Build confidence with early wins
- Expand gradually

**Strategy 2: Pair Programming**

- Experienced developers mentor juniors
- Knowledge transfer
- Quality assurance

**Strategy 3: Test Quality Reviews**

- Dedicated test reviews in PRs
- Test quality checklist
- Refactor poor tests

**Strategy 4: Continuous Monitoring**

- Track coverage trends
- Monitor test execution time
- Alert on flaky tests

---

## 15. Appendices

### 15.1 Appendix A: Useful Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run tests in UI mode
npm test -- --ui

# Run specific test file
npm test -- password-utils.test.ts

# Run tests matching pattern
npm test -- --grep "login"

# Update snapshots
npm test -- -u

# Run tests for changed files only
npm test -- --changed

# Run tests with verbose output
npm test -- --reporter=verbose
```

### 15.2 Appendix B: Testing Resources

**Official Documentation:**

- Vitest: https://vitest.dev/
- Testing Library: https://testing-library.com/
- MSW: https://mswjs.io/

**Learning Resources:**

- Kent C. Dodds - Testing JavaScript
- Vitest Documentation & Examples
- Testing Library Playground

**Community:**

- Vitest Discord
- Testing Library Discord
- Stack Overflow

### 15.3 Appendix C: Test File Examples

**Example 1: Utility Function Test**

```typescript
// src/lib/password-utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from './password-utils';

describe('password-utils', () => {
  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'CorrectPassword123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const hashed = await hashPassword('CorrectPassword123!');
      const isMatch = await comparePassword('WrongPassword123!', hashed);

      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('MyStr0ng!Password');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too weak');
    });

    it('should reject password without special characters', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      expect(result.valid).toBe(false);
    });
  });
});
```

**Example 2: API Route Test**

```typescript
// src/app/api/auth/login/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { mockPrisma } from '@/test/helpers/mock-prisma';
import * as passwordUtils from '@/lib/password-utils';

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    mockPrisma.reset();
    vi.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    // Arrange
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: await passwordUtils.hashPassword('Password123!'),
      role: 'HRO',
      isLocked: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    vi.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Password123!',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.user.username).toBe('testuser');
    expect(data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'invaliduser',
        password: 'WrongPassword',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should reject locked account', async () => {
    // Arrange
    const mockUser = {
      id: '1',
      username: 'lockeduser',
      isLocked: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'lockeduser',
        password: 'Password123!',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data.error).toContain('locked');
  });
});
```

**Example 3: Component Test**

```typescript
// src/components/auth/login-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'Password123!',
      });
    });
  });

  it('should display error on failed login', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();

    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const mockOnSubmit = vi.fn(() => new Promise(() => {})); // Never resolves
    const user = userEvent.setup();

    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });
});
```

---

## Approval & Sign-Off

### Document Review

| Reviewer | Title               | Date             | Signature        |
| -------- | ------------------- | ---------------- | ---------------- |
| [Name]   | Technical Lead      | \***\*\_\_\*\*** | \***\*\_\_\*\*** |
| [Name]   | QA Lead             | \***\*\_\_\*\*** | \***\*\_\_\*\*** |
| [Name]   | Development Manager | \***\*\_\_\*\*** | \***\*\_\_\*\*** |

### Document Approval

**Approved By:**
Name: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***
Title: Project Manager
Date: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***
Signature: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***

---

**Document Classification:** Official - Government of Zanzibar
**Distribution:** Development Team, QA Team, Project Stakeholders
**Next Review:** After Phase 2 completion (Week 6)

---

_This Unit Test Implementation Plan has been prepared to introduce comprehensive automated testing to the Civil Service Management System (CSMS), improving code quality, reducing defects, and enabling confident development._

**END OF UNIT TEST IMPLEMENTATION PLAN**
