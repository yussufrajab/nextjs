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

## Configuration Notes

- TypeScript errors and ESLint warnings are ignored during builds
- Path alias: `@/*` maps to `./src/*`
- Uses PostgreSQL with specific binary targets for deployment
- Image domains configured for external placeholders

## Project Context

This is a government HR management system for Zanzibar's civil service, handling employee lifecycle management including hiring, promotions, transfers, and separations.