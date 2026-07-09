# Civil Service Management System (CSMS)

> A government Human Resource management platform for the **Revolutionary Government of Zanzibar** (SMZ), digitising the full employee lifecycle for the public civil service.

CSMS centralises employee records and the HR request workflows that govern them — promotions, confirmations, cadre changes, leave without pay (LWOP), service extensions, retirements, resignations, dismissals, and terminations — behind a role-based web application with document handling, audit trails, notifications, and an AI-assisted complaint channel.

The application is fully self-contained: a Next.js 14 frontend served from the same process as the REST API, backed by PostgreSQL via Prisma, with Redis + BullMQ workers for background jobs, MinIO/S3-compatible object storage for files, and Genkit + Google Gemini for AI features.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Domain Model](#domain-model)
- [Request Workflows](#request-workflows)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Load Testing](#load-testing)
- [AI Features (Genkit)](#ai-features-genkit)
- [Background Workers](#background-workers)
- [Deployment](#deployment)
- [Security & Compliance](#security--compliance)
- [Project Documentation](#project-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

CSMS is a government HR management system for Zanzibar's civil service that handles employee lifecycle management, including hiring, promotions, transfers, and separations. It replaces paper-driven HR request handling with a digital workflow that enforces multi-stage review, document capture, and full audit history.

The system is designed for three primary user groups:

- **Employees** — view their own records, raise complaints, and track the status of requests that affect them.
- **HR Officers / Reviewers** — submit, review, and approve the catalog of HR requests on behalf of employees and institutions.
- **Administrators** — manage users, institutions, request templates, notifications, and platform configuration.

---

## Key Features

### HR Request Management
Structured workflows for every category of civil-service request:

| Request Type       | Description                                          |
|--------------------|------------------------------------------------------|
| Promotions         | Submit, review, and approve promotion cases          |
| Confirmations      | Track probation-to-confirmation decisions            |
| Cadre Changes      | Move an employee between cadres/career families     |
| LWOP               | Leave Without Pay processing and tracking            |
| Service Extensions | Extend an employee beyond retirement age             |
| Retirements        | Standard and early retirement workflows              |
| Resignations       | Voluntary separation handling                        |
| Dismissals         | Disciplinary dismissal workflow                      |
| Terminations       | End-of-service termination workflow                  |

Each request follows a multi-stage review pipeline (`submitted → review → decision → commission → approved/rejected`) with full document attachments and reviewer notes.

### Employee Management
- Employee registration and profile management
- Institution (MDA) assignment and tracking
- Search, filter, pagination across the directory
- Recent activity feed per employee

### Document Handling
- Upload/download of supporting documents and photos
- MinIO / S3-compatible object storage backend
- In-browser preview for common file types
- Secure, presigned access for downloads

### Authentication & Access Control
- Email/password sign-in for HR officers
- Dedicated employee self-service login
- Multi-factor authentication (MFA) for staff accounts
- Role-based access control (RBAC) for routes and API endpoints
- Session management backed by Redis

### Notifications & Audit
- In-app notification centre for reviewers and employees
- Tamper-resistant audit log for all sensitive actions
- Activity history with pagination

### Dashboards & Reporting
- Role-tailored dashboard with KPIs and queues
- Status tracking for every request type
- Exportable reports (PDF via jsPDF, Excel via `xlsx`)

### AI Assistant
- AI-assisted complaint rewriting (rewrites a complainant's draft into a clearer, more formal version) via Google Gemini, integrated through Genkit.

---

## Tech Stack

### Frontend
- **Next.js 16** (App Router, React Server Components)
- **React 19**, TypeScript
- **Tailwind CSS 3** + Radix UI primitives (`shadcn/ui` pattern)
- **Zustand** for auth/session state
- **react-hook-form** + **zod** for forms and validation
- **lucide-react** icon set, **react-day-picker** for date input

### Backend
- **Next.js API Routes** (REST, served from the same process)
- **Prisma 6** ORM over PostgreSQL
- **bcryptjs** for password hashing, **zxcvbn** for strength feedback
- **Zod** for request validation
- **DOMPurify** for HTML sanitisation
- **Pino** structured logging, **OpenTelemetry** → Jaeger for tracing

### Storage & Background
- **PostgreSQL** — primary database (`nody`)
- **MinIO** (S3-compatible) — document & photo object storage
- **Redis** — session store, cache, BullMQ broker
- **BullMQ** + **node-cron** — background workers (HRIMS sync, scheduled jobs)
- **Nodemailer** — outbound email

### AI
- **Google Genkit** + `@genkit-ai/google-genai`
- Optional `genkitx-ollama` for local model experimentation

### Quality & Tooling
- **ESLint** + **Prettier** + **lint-staged** + **Husky** (pre-commit hooks)
- **Vitest** + Testing Library for unit/integration tests
- **Playwright** for end-to-end tests
- **k6** for load testing
- **TypeScript 5** end-to-end

---

## Repository Structure

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             #   Auth pages: login, MFA, employee login
│   │   ├── dashboard/          #   Authenticated HR dashboard
│   │   ├── api/                #   REST API routes
│   │   └── mfa/                #   MFA enrolment/management
│   ├── components/             # Shared React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Server-side helpers (db, auth, storage, …)
│   ├── store/                  # Zustand stores
│   └── ai/                     # Genkit flows and dev entrypoint
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Versioned migrations
│   └── seed.ts                 # Seed script
├── load-tests/                 # k6 scenarios and configuration
├── scripts/                    # Operational utilities (PM2, sync, fetchers)
├── e2e/                        # Playwright specs
├── test/                       # Vitest specs and helpers
├── docs/                       # Design docs, manuals, SOPs
├── public/                     # Static assets
├── certs/                      # TLS material
├── nginx-*.conf                # Reverse-proxy configurations
├── ecosystem.config.js         # PM2 process manifest
├── apphosting.yaml             # Firebase/Cloud Run hosting spec
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── playwright.config.ts        # Playwright configuration
├── vitest.config.ts            # Vitest configuration
└── package.json
```

---

## Architecture

CSMS is a single Node.js process that serves both the React UI and the REST API, with sidecar services for storage, cache, and background work.

```
                  ┌──────────────────────────────────────────┐
                  │              Nginx (TLS, proxy)          │
                  └──────────────────────┬───────────────────┘
                                         │
                ┌────────────────────────┴────────────────────────┐
                │              Next.js (port 9002)                │
                │  ┌──────────────┐    ┌────────────────────────┐  │
                │  │  App Router  │    │     REST API routes    │  │
                │  │  (RSC, UI)   │    │   /api/* (handlers)    │  │
                │  └──────┬───────┘    └──────────┬─────────────┘  │
                │         │                       │                │
                │         └───────────┬───────────┘                │
                │                     │                            │
                │              ┌──────┴──────┐                     │
                │              │  Prisma ORM │                     │
                │              └──────┬──────┘                     │
                └─────────────────────┼────────────────────────────┘
                                      │
              ┌────────────┬──────────┼─────────────┬─────────────┐
              ▼            ▼          ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Redis   │ │  MinIO   │ │  BullMQ  │ │ Genkit   │
        │  (nody)  │ │sessions/ │ │ documents│ │ workers  │ │ Gemini   │
        │          │ │ cache    │ │ /photos  │ │ (HRIMS   │ │ flows    │
        │          │ │ broker   │ │          │ │  sync)   │ │          │
        └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Process layout (production)
PM2 (`ecosystem.config.js`) supervises the application processes:

| Process  | Purpose                                          |
|----------|--------------------------------------------------|
| `next`   | The Next.js server (UI + API)                    |
| `redis`  | Local Redis server                               |
| `worker` | BullMQ workers (HRIMS sync, scheduled jobs)      |
| `genkit` | Genkit AI dev/runtime service                    |

Use `./scripts/start-all.sh`, `./scripts/stop-all.sh`, `./scripts/restart-all.sh`, and `./scripts/status.sh` for coarse-grained control, or `pm2 logs` / `pm2 monit` for inspection.

### Layering
- **UI** (`src/app/**`, `src/components/**`) — React components, forms, dashboards.
- **Hooks** (`src/hooks/**`) — Client-side data fetching, state.
- **API** (`src/app/api/**`) — Request validation (`zod`), RBAC checks, delegation to services.
- **Lib** (`src/lib/**`) — Reusable server utilities: `db.ts` (Prisma client), `auth.ts`, `storage.ts` (MinIO), `audit.ts`, `email.ts`, `rate-limit.ts`, `cache.ts`, etc.
- **Workers** (`scripts/start-worker.ts`, `src/lib/queue/**`) — BullMQ job processors.
- **AI** (`src/ai/**`) — Genkit flows, primarily `complaint-rewriter.ts`.

---

## Domain Model

`prisma/schema.prisma` defines the core entities:

- **User** — staff accounts (HR officers, reviewers, admins) with role, MFA flags, and login tracking.
- **Employee** — civil-service employee records, including personal details, employment history, and current institution.
- **Institution** — MDAs (Ministries, Departments, Agencies).
- **Request types** — `PromotionRequest`, `ConfirmationRequest`, `CadreChangeRequest`, `LwopRequest`, `ServiceExtensionRequest`, `RetirementRequest`, `ResignationRequest`, `DismissalRequest`, `TerminationRequest`. Each carries its own status, review stage, attachments, and decision history.
- **Complaint** — formal complaints raised by employees or the public.
- **Notification** — in-app notifications.
- **AuditLog** — immutable audit trail of sensitive actions.

Indexes are designed for the high-traffic query paths: status, review stage, employee, and `createdAt DESC`.

---

## Request Workflows

Every HR request moves through a small, predictable set of states:

```
submitted ──► review ──► hrrp_review ──► commission ──► decision ──► approved | rejected
```

State transitions are enforced server-side; reviewers can attach a `rejectionReason` and the request becomes visible in the relevant queue for the next stage. API endpoints live under `src/app/api/<request-type>-requests/` and `src/app/api/<request-type>/`.

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm** (or `pnpm` if you prefer; the lockfiles are present)
- **PostgreSQL 14+** with a database called `nody`
- **Redis 6+**
- **MinIO** (or any S3-compatible object store) — optional in dev if you stub the storage layer
- **k6** — only required for load testing ([install](https://k6.io/docs/get-started/installation/))

### 1. Clone & install

```bash
git clone https://github.com/yussufrajab/nextjs.git
cd nextjs
npm install
```

### 2. Configure environment

Copy `.env.example` (or the example below) to `.env` and fill in the values. See [Environment Variables](#environment-variables) for the full list.

```bash
cp .env.example .env
```

### 3. Prepare the database

```bash
npx prisma migrate deploy      # apply migrations
npx prisma db seed             # optional: seed reference data
```

### 4. Start supporting services

If you have local Redis and MinIO, start them. Otherwise the dev server will start in degraded mode (the relevant lib helpers will surface configuration errors).

```bash
# Redis (macOS)
brew services start redis

# MinIO (any platform)
minio server ./minio-data
```

### 5. Run the app

```bash
npm run dev          # http://localhost:9002
```

In a second terminal, start the Genkit dev server for AI features:

```bash
npm run genkit:dev   # or npm run genkit:watch
```

---

## Environment Variables

| Variable                       | Purpose                                                       |
|--------------------------------|---------------------------------------------------------------|
| `DATABASE_URL`                 | PostgreSQL connection string for the `nody` database          |
| `REDIS_URL`                    | Redis connection string (sessions, cache, BullMQ)             |
| `MINIO_ENDPOINT`               | MinIO/S3 endpoint (e.g. `http://localhost:9000`)              |
| `MINIO_ACCESS_KEY`             | MinIO/S3 access key                                           |
| `MINIO_SECRET_KEY`             | MinIO/S3 secret key                                           |
| `MINIO_BUCKET`                 | Object-storage bucket name                                    |
| `NEXTAUTH_SECRET` / `SESSION_SECRET` | Session signing key                                     |
| `MFA_ISSUER`                   | Issuer string for TOTP MFA enrolment                          |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Outbound email (Nodemailer) |
| `GOOGLE_GENAI_API_KEY`         | Google Gemini API key for Genkit flows                        |
| `HRIMS_API_BASE_URL`           | External HRIMS endpoint used by the sync worker               |
| `HRIMS_API_KEY`                | Credential for the HRIMS sync                                 |
| `LOG_LEVEL`                    | Pino log level (`info`, `debug`, …)                           |
| `OTEL_EXPORTER_JAEGER_ENDPOINT`| Optional Jaeger endpoint for distributed tracing              |
| `NEXT_PUBLIC_APP_URL`          | Public base URL of the app                                    |

> The application refuses to start in production if any required secret is missing. In development, missing optional services (e.g. MinIO, SMTP) are tolerated with explicit warnings.

---

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (optional)
npx prisma studio

# Seed reference data
npx prisma db seed
```

For schema iteration during development:

```bash
npx prisma migrate dev --name <change>
```

Partitioning: the audit log is partitioned by month. The `scripts/ensure-partitions.sh` script (and the audit worker) maintain rolling partitions. See `docs/database-audit-log-partitioning.md` for details.

---

## Available Scripts

### Development
- `npm run dev` — Next.js dev server on **port 9002**
- `npm run genkit:dev` — Genkit dev server
- `npm run genkit:watch` — Genkit with file watching

### Build & Run
- `npm run build` — Production build (uses the Webpack toolchain)
- `npm start` — Start the production server on **port 9002**
- `npm run worker` — Start the BullMQ worker process

### Quality
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with `--fix`
- `npm run typecheck` — `tsc --noEmit`
- `npm run format` / `npm run format:check` — Prettier
- `npm run prepare` — Husky install (runs automatically on `npm install`)

### Process management (PM2)
- `npm run start:all` / `stop:all` / `restart:all` — Coarse-grained control
- `npm run status` — PM2 status overview
- `npm run pm2:logs` / `npm run pm2:monit` — PM2 inspection

### Testing
- `npm test` — Vitest (watch mode)
- `npm run test:run` — Vitest single run
- `npm run test:ui` — Vitest UI
- `npm run test:coverage` — Coverage report
- `npm run test:e2e` — Playwright E2E tests
- `npm run test:e2e:ui` / `:headed` / `:debug` / `:report` — Playwright variants

### Load testing (k6)
- `npm run loadtest` — Stress test (find breaking point)
- `npm run loadtest:smoke` — Quick smoke test
- `npm run loadtest:auth` — Authentication scenarios
- `npm run loadtest:hr` — HR workflow scenarios
- `npm run loadtest:files` — File-operation scenarios
- `npm run loadtest:all` — All scenarios

---

## Testing

### Unit & integration (Vitest)
```
npm run test:run          # CI-style run
npm run test:coverage     # generate coverage report
```

Tests live under `test/`. Mocks for `next/navigation`, `next/cache`, and browser APIs are preconfigured in `vitest.config.ts`.

### End-to-end (Playwright)
```
npm run test:e2e
```

Specs live in `e2e/`. Browsers are configured in `playwright.config.ts`. Use `npm run test:e2e:ui` for the Playwright inspector.

### Pre-commit hooks
Husky + lint-staged run ESLint and Prettier on staged files before every commit.

---

## Load Testing

The `load-tests/` directory contains k6 scenarios that cover:

- **Authentication** — login, logout, session lifecycle, MFA paths
- **HR Workflows** — promotion, confirmation, employee CRUD
- **File Operations** — upload, download, metadata
- **Stress** — progressive load to find the system's breaking point

```bash
# Quick smoke test (≈30s, 1 user)
npm run loadtest:smoke

# Stress test
npm run loadtest

# A specific scenario
npm run loadtest:hr
```

Reports land in `load-tests/reports/`. See `load-tests/README.md` and `load-tests/QUICKSTART.md` for full configuration options.

### CI

`.github/workflows/load-test.yml` runs the suite:
- weekly (Sundays 02:00 UTC)
- on releases
- on manual dispatch from the Actions UI

`e2e-tests.yml` runs the Playwright suite on push, pull request, and manual trigger.

---

## AI Features (Genkit)

CSMS uses [Google Genkit](https://firebase.google.com/docs/genkit) to expose AI flows, currently:

- **Complaint rewriter** (`src/ai/flows/complaint-rewriter.ts`) — Takes a complainant's draft text and returns a clearer, more formal version while preserving the original meaning.

### Local development

```bash
npm run genkit:dev
```

This starts the Genkit dev UI on its default port. Configure your `GOOGLE_GENAI_API_KEY` in `.env`. The `genkitx-ollama` plugin is also installed for local-model experimentation.

### Adding a new flow
1. Create the flow under `src/ai/flows/`.
2. Register it in `src/ai/dev.ts`.
3. Call it from an API route or server action with proper auth and validation.

---

## Background Workers

Long-running and external-integration tasks are offloaded to BullMQ workers (`scripts/start-worker.ts`, started by PM2 as the `worker` process):

- **HRIMS sync** — Pulls employee updates from the external HRIMS endpoint and reconciles them locally on a schedule.
- **Scheduled jobs** — `node-cron` jobs in `src/lib/cron/`.
- **File processing** — Any post-upload processing that should not block the request.

Inspect workers with `npm run pm2:logs` (filter to `worker`) and `npm run check-worker.sh`.

---

## Deployment

### Production server
1. Provision Node.js 20+, PostgreSQL, Redis, MinIO.
2. Build the app: `npm run build`.
3. Start with PM2: `pm2 start ecosystem.config.js` then `pm2 save`.
4. Front it with Nginx using one of `nginx-*.conf` (TLS termination included).
5. Schedule log rotation (`scripts/deploy-logrotate.sh` is provided as a template).

### Hosted platforms
- `apphosting.yaml` describes a Firebase App Hosting / Cloud Run target.
- TLS is provided by `certbot` / Let's Encrypt; see `SSL_INSTALLATION_GUIDE.md` and `SSL_QUICK_CHECKLIST.md`.

### Configuration notes
- TypeScript errors and ESLint warnings do not block the production build (see `next.config.ts`). Run `npm run typecheck` and `npm run lint` in CI separately.
- The Webpack build is explicitly selected for stability with the existing bundle (`npm run build -- --webpack`).
- Image domains for external placeholders are whitelisted in `next.config.ts`.

### Backups & recovery
See `docs/Backup_and_Recovery_Plan.md`. The `scripts/archive-audit.sh` script archives audit partitions to cold storage.

---

## Security & Compliance

- **Auth** — bcrypt password hashing; MFA (TOTP) for staff; separate employee self-service login.
- **Sessions** — server-side session records in Redis with rotation on privilege change.
- **Authorisation** — role-based access control enforced in API routes (`src/lib/auth.ts`).
- **CSRF** — double-submit token pattern (`docs/CSRF_PROTECTION.md`).
- **Headers** — strict CSP, HSTS, X-Content-Type-Options, Referrer-Policy (see `test-security-headers.sh`).
- **Input safety** — `zod` validation on every request; `DOMPurify` for any rendered HTML.
- **Rate limiting** — Redis-backed rate limiter on sensitive routes.
- **Password strength** — `zxcvbn` scoring on registration/change.
- **Audit log** — append-only audit trail with monthly partitioning (`docs/AUDIT_LOGGING.md`).

Security review notes and remediation status are tracked in `docs/Code_Review_Report*.md` and `SECURITY-REMEDIATION-CONTINUATION-PROMPT.md`.

---

## Project Documentation

The `docs/` directory is the canonical home for design and operational documentation. Highlights:

- `Concept_Note.md`, `Business_Requirements_Document.md`, `Business_Process_Document.md`, `Business_Mapping_Document.md`
- `Database_Design_Document.md`, `Database_Index_Optimization.md`
- `Administrator_Manual.md`, `CSMS_Training_Manual.md`, `CSMS_User_Roles_and_Access_Guide.md`
- `Background_Jobs_Implementation.md`, `API_Caching_Implementation.md`, `CSRF_PROTECTION.md`, `AUDIT_LOGGING.md`, `AUDIT_SEVERITY_GUIDE.md`
- `Backup_and_Recovery_Plan.md`, `PM2_MANAGEMENT_GUIDE.md`, `REDIS_QUICK_START.md`, `MANUAL_ENTRY_*.md`
- `Bundle_Optimization_Phase1.md`, `Activity_History_Pagination_Implementation.md`, `Audit_Trail_Pagination_Enhancement.md`

Module-specific READMEs:
- `load-tests/README.md`, `load-tests/QUICKSTART.md`
- `scripts/AUTO_FETCH_README.md`, `scripts/BULK_*_README.md`

---

## Contributing

1. Branch from `main`: `git checkout -b feat/<short-description>`
2. Make your change. Follow the existing code style (`npm run format`, `npm run lint:fix`).
3. Add or update tests under `test/` and/or `e2e/`.
4. Run `npm run typecheck`, `npm test`, and `npm run test:e2e` locally.
5. Commit (Husky will run pre-commit hooks). Use [Conventional Commits](https://www.conventionalcommits.org/) where possible.
6. Open a pull request with a clear summary, screenshots for UI changes, and a test plan.

Code review notes and findings live in `docs/Code_Review_Report*.md`.

---

## License

This repository is a government project for the Revolutionary Government of Zanzibar (SMZ). See `LICENSE` if present, or contact the project owners for licensing terms.

---

## Acknowledgements

Prepared by the ICT officer for managing the required modules of the CSMS implementation. Built with Next.js, Prisma, BullMQ, Genkit, and the open-source community.
