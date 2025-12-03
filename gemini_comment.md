# Gemini Code Companion Documentation: HR Management System

## Project Overview

This project is a comprehensive Human Resources (HR) Management System designed for the Civil Service Commission of Zanzibar. It has been developed as a modern, unified full-stack application using Next.js, replacing a previous distributed Spring Boot architecture.

The system provides a complete suite of tools for managing HR processes, including employee data, user roles, various HR requests, and a dashboard for analytics. It also integrates AI for specific tasks like standardizing employee complaints.

## Architecture

The system is built on a unified full-stack architecture, with both the frontend and backend managed within a single Next.js codebase. This approach simplifies development, deployment, and ensures type safety across the entire application.

### Technology Stack

*   **Framework:** Next.js 14+ (with App Router)
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** Session-based with client-side persistence (using Zustand and localStorage).
*   **API:** RESTful API implemented with Next.js API Routes.
*   **State Management:** Zustand with persistence middleware.
*   **UI:** Tailwind CSS with shadcn/ui components.
*   **AI Integration:** Google Genkit with the Gemini 2.0 Flash model for complaint processing.

## Key Features

The system includes a wide range of features to support HR operations:

*   **User Management:** Handles user registration, authentication, and role-based access control (RBAC) with 9 distinct roles.
*   **Employee Management:** Provides a comprehensive data model for employees, including their institutional assignments and document management.
*   **Request Processing:** A flexible system for managing 8 different types of HR requests, with status tracking and a multi-stage review process.
*   **Dashboard & Analytics:** A real-time dashboard that displays key statistics, recent activities, and provides quick access to common actions.
*   **Complaint Management:** An AI-powered feature that standardizes and helps manage employee complaints.

### Missing Features

The following critical features are planned but not yet implemented:

*   A robust file upload system for handling document uploads.
*   An email notification system for automated communication.
*   A comprehensive audit trail system for compliance.
*   Data export functionality for generating reports.

## Database

The application uses a PostgreSQL database, managed with the Prisma ORM. The database schema is well-structured and includes the following key models:

*   `User`: Manages user accounts and their roles.
*   `Employee`: Stores comprehensive information about each employee.
*   `Institution`: Represents the different institutions or departments.
*   `Request`: A general model for all types of HR requests.

The relationships between these models are well-defined, with clear foreign key constraints. For a detailed view of the schema, refer to the `prisma/schema.prisma` file.

## Getting Started

To set up and run the project locally, follow these steps:

### Prerequisites

*   Node.js (version recommended in `.nvmrc` if available)
*   npm or pnpm
*   A running PostgreSQL database instance.

### Installation and Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    pnpm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project and populate it with the necessary environment variables, including the database connection string. You can use `.env.example` as a template if it exists.

    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```

3.  **Run Database Migrations:**
    Apply the database schema to your local database using Prisma migrations.

    ```bash
    npx prisma migrate dev
    ```

4.  **Seed the Database (Optional):**
    If there are seed scripts available, you can populate the database with initial data.

    ```bash
    npx prisma db seed
    ```

### Running the Application

To start the development server, run the following command:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build of the application, run:

```bash
npm run build
```

This will generate an optimized build in the `.next` directory.

## Security Considerations

A security review has identified some areas for improvement. These are critical to address before deploying to a production environment:

*   **Authentication:** The current client-side session management should be replaced with a more secure server-side session mechanism or JWTs with refresh tokens.
*   **API Security:** Authentication middleware needs to be implemented on all protected API routes to prevent unauthorized access.
*   **Data Exposure:** API endpoints should be reviewed to ensure they do not expose sensitive user data.

For a more detailed breakdown of security issues and recommendations, please refer to the `HR_System_Review.md` document.
