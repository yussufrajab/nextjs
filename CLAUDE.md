# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `npm run dev` - Start development server on port 9002
- `npm run build` - Build the application for production
- `npm start` - Start production server on port 9002
- `npm run lint` - Run Next.js linting
- `npm run typecheck` - Run TypeScript type checking

### AI/Genkit Commands

- `npm run genkit:dev` - Start Genkit development server
- `npm run genkit:watch` - Start Genkit with file watching

### Testing Commands

- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Run unit tests with Vitest UI
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run loadtest` - Run stress load tests (requires k6)
- `npm run loadtest:smoke` - Run quick smoke test
- `npm run loadtest:auth` - Run authentication load tests
- `npm run loadtest:hr` - Run HR workflows load tests
- `npm run loadtest:files` - Run file operations load tests
- `npm run loadtest:all` - Run all load test scenarios

## Architecture Overview

This is a Next.js 14 full-stack application for a Civil Service Management System (CSMS):

### Full-Stack Setup

- **Frontend**: Next.js application running on port 9002
- **Backend**: Next.js API routes (same application)
- **Database**: PostgreSQL "nody" database with Prisma ORM

The application is now completely self-contained with all API endpoints implemented as Next.js API routes, eliminating the need for a separate backend service.

### Key Architecture Components

#### Database Layer (Prisma)

- PostgreSQL database with comprehensive schema covering HR operations
- Main entities: User, Employee, Institution with various request types
- Request types: Promotions, Confirmations, LWOP, Cadre Changes, Retirements, etc.
- Each request follows a workflow with status tracking and review stages

#### API Structure

- All API routes implemented in `src/app/api/` directory
- Complete REST API for all HR operations
- Comprehensive endpoints for all request types and workflows

#### Frontend Structure

- Dashboard-based UI with role-based access
- Comprehensive form handling for all HR request types
- File upload/download functionality with preview capabilities
- Notification system and audit trail

#### State Management

- Zustand for auth state management
- Custom hooks for API interactions and auth handling

#### UI Framework

- Tailwind CSS with custom design system
- Radix UI components with shadcn/ui
- Responsive design with mobile support

#### AI Integration

- Google Genkit integration for AI-powered features
- Complaint rewriting functionality

#### Testing & Quality Assurance

- Unit tests with Vitest
- End-to-end tests with Playwright
- Load testing with k6 (see `load-tests/` directory)
- ESLint and Prettier for code quality
- TypeScript for type safety
- Husky and lint-staged for pre-commit hooks

## Configuration Notes

- TypeScript errors and ESLint warnings are ignored during builds
- Path alias: `@/*` maps to `./src/*`
- Uses PostgreSQL with specific binary targets for deployment
- Image domains configured for external placeholders

## Load Testing

The project includes comprehensive load testing scenarios using k6:

- **Location**: `load-tests/` directory
- **Documentation**: See `load-tests/README.md` for detailed instructions
- **Prerequisites**: Install k6 from https://k6.io/docs/get-started/installation/

### Quick Start

```bash
# Install k6 (macOS)
brew install k6

# Run smoke test
npm run loadtest:smoke

# Run stress test to find breaking point
npm run loadtest

# Run specific scenarios
npm run loadtest:auth        # Authentication tests
npm run loadtest:hr          # HR workflow tests
npm run loadtest:files       # File operations tests
npm run loadtest:all         # All scenarios
```

### Test Scenarios

1. **Authentication**: Login, logout, session management
2. **HR Workflows**: Promotions, confirmations, employee management
3. **File Operations**: Upload, download, metadata
4. **Stress Test**: Combined scenarios with progressive load to find breaking point

### CI/CD Integration

Load tests run automatically via GitHub Actions:
- Weekly on Sundays at 2 AM UTC
- On releases
- Manual trigger via GitHub Actions UI

See `.github/workflows/load-test.yml` for configuration.

## Project Context

This is a government HR management system for Zanzibar's civil service, handling employee lifecycle management including hiring, promotions, transfers, and separations.
