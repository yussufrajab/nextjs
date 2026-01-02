# Database Design Document

## Civil Service Management System (CSMS)

**Version:** 1.0
**Last Updated:** December 25, 2025
**Database Name:** nody
**Database Type:** PostgreSQL
**ORM:** Prisma

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Core Entities](#core-entities)
5. [Request Management Entities](#request-management-entities)
6. [Supporting Entities](#supporting-entities)
7. [Relationships and Constraints](#relationships-and-constraints)
8. [Indexes and Performance](#indexes-and-performance)
9. [Data Types and Conventions](#data-types-and-conventions)
10. [Security Considerations](#security-considerations)
11. [Migration History](#migration-history)

---

## 1. Overview

The CSMS database is designed to manage the complete lifecycle of civil service employees in Zanzibar, including:

- Employee records and institutional affiliations
- User authentication and role-based access control
- HR workflow requests (promotions, confirmations, leave, retirement, etc.)
- Complaint management system
- Notification and audit trails

The database follows a relational model with clear separation between:

- **Identity Management** (User, Employee, Institution)
- **Request Workflows** (Various request types with standardized patterns)
- **Supporting Systems** (Notifications, Certificates, Complaints)

---

## 2. Database Architecture

### Technology Stack

- **Database Engine:** PostgreSQL
- **ORM:** Prisma
- **Schema Version Control:** Prisma Migrations
- **Binary Targets:** Native, Debian OpenSSL 3.0.x

### Design Principles

1. **Normalized Structure:** Follows 3NF (Third Normal Form) to minimize data redundancy
2. **Audit Trail:** All request entities include `createdAt` and `updatedAt` timestamps
3. **Soft Relationships:** Uses TEXT-based IDs for flexibility
4. **Document Storage:** Array fields for storing multiple document URLs
5. **Workflow Tracking:** Consistent `status` and `reviewStage` patterns across request types

---

## 3. Entity Relationship Diagram

### High-Level Entity Groups

```
┌─────────────────────────────────────────────────────────────┐
│                    IDENTITY & ORGANIZATION                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Institution │◄───┤     User     │◄───┤   Employee   │  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   REQUEST    │    │   SUPPORT    │    │ COMMUNICATION│
│   ENTITIES   │    │   ENTITIES   │    │   ENTITIES   │
│              │    │              │    │              │
│ • Promotion  │    │ • Employee   │    │ • Complaint  │
│ • Confirm.   │    │   Certificate│    │ • Notification│
│ • LWOP       │    │              │    │              │
│ • Cadre Chg  │    │              │    │              │
│ • Retirement │    │              │    │              │
│ • Resignation│    │              │    │              │
│ • Separation │    │              │    │              │
│ • Service Ext│    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 4. Core Entities

### 4.1 Institution

**Purpose:** Represents government institutions/ministries/departments that employ civil servants.

| Column      | Type | Constraints      | Description                   |
| ----------- | ---- | ---------------- | ----------------------------- |
| id          | TEXT | PRIMARY KEY      | Unique institution identifier |
| name        | TEXT | UNIQUE, NOT NULL | Institution name              |
| email       | TEXT | NULLABLE         | Contact email                 |
| phoneNumber | TEXT | NULLABLE         | Contact phone number          |
| voteNumber  | TEXT | NULLABLE         | Budget vote number            |
| tinNumber   | TEXT | UNIQUE, NULLABLE | Tax Identification Number     |

**Relationships:**

- One-to-Many with `Employee` (institutionId)
- One-to-Many with `User` (institutionId)

**Business Rules:**

- Institution names must be unique
- TIN numbers must be unique when provided
- Cannot be deleted if employees or users are associated

---

### 4.2 User

**Purpose:** Represents system users with authentication and authorization capabilities.

| Column        | Type      | Constraints      | Description                             |
| ------------- | --------- | ---------------- | --------------------------------------- |
| id            | TEXT      | PRIMARY KEY      | Unique user identifier                  |
| name          | TEXT      | NOT NULL         | Full name                               |
| username      | TEXT      | UNIQUE, NOT NULL | Login username                          |
| password      | TEXT      | NOT NULL         | Hashed password                         |
| role          | TEXT      | NOT NULL         | User role (e.g., admin, hr_officer)     |
| active        | BOOLEAN   | DEFAULT true     | Account status                          |
| employeeId    | TEXT      | UNIQUE, NULLABLE | Link to employee record (if applicable) |
| institutionId | TEXT      | NOT NULL         | Associated institution                  |
| phoneNumber   | TEXT      | NULLABLE         | Contact phone                           |
| email         | TEXT      | NULLABLE         | Email address                           |
| createdAt     | TIMESTAMP | DEFAULT now()    | Account creation timestamp              |
| updatedAt     | TIMESTAMP | NOT NULL         | Last update timestamp                   |

**Relationships:**

- Many-to-One with `Institution` (institutionId)
- One-to-One with `Employee` (employeeId) - optional
- One-to-Many with all Request entities (submittedById, reviewedById)
- One-to-Many with `Notification` (userId)
- One-to-Many with `Complaint` (complainantId, reviewedById)

**Business Rules:**

- Username must be unique across the system
- One user can be linked to at most one employee record
- Users can submit and review requests
- Active status controls login access

---

### 4.3 Employee

**Purpose:** Comprehensive employee master record containing personal, employment, and administrative information.

| Column                 | Type      | Constraints      | Description                  |
| ---------------------- | --------- | ---------------- | ---------------------------- |
| id                     | TEXT      | PRIMARY KEY      | Unique employee identifier   |
| employeeEntityId       | TEXT      | NULLABLE         | External entity ID reference |
| name                   | TEXT      | NOT NULL         | Full name                    |
| gender                 | TEXT      | NOT NULL         | Gender                       |
| profileImageUrl        | TEXT      | NULLABLE         | Profile photo URL            |
| dateOfBirth            | TIMESTAMP | NULLABLE         | Date of birth                |
| placeOfBirth           | TEXT      | NULLABLE         | Place of birth               |
| region                 | TEXT      | NULLABLE         | Region                       |
| countryOfBirth         | TEXT      | NULLABLE         | Country of birth             |
| zanId                  | TEXT      | UNIQUE, NOT NULL | Zanzibar ID number           |
| phoneNumber            | TEXT      | NULLABLE         | Contact phone                |
| contactAddress         | TEXT      | NULLABLE         | Mailing address              |
| zssfNumber             | TEXT      | NULLABLE         | Social Security Fund number  |
| payrollNumber          | TEXT      | NULLABLE         | Payroll system identifier    |
| cadre                  | TEXT      | NULLABLE         | Job cadre/grade              |
| salaryScale            | TEXT      | NULLABLE         | Salary scale                 |
| ministry               | TEXT      | NULLABLE         | Ministry assignment          |
| department             | TEXT      | NULLABLE         | Department assignment        |
| appointmentType        | TEXT      | NULLABLE         | Type of appointment          |
| contractType           | TEXT      | NULLABLE         | Contract type                |
| recentTitleDate        | TIMESTAMP | NULLABLE         | Date of most recent title    |
| currentReportingOffice | TEXT      | NULLABLE         | Current reporting office     |
| currentWorkplace       | TEXT      | NULLABLE         | Current workplace            |
| employmentDate         | TIMESTAMP | NULLABLE         | Date of employment           |
| confirmationDate       | TIMESTAMP | NULLABLE         | Date of confirmation         |
| retirementDate         | TIMESTAMP | NULLABLE         | Planned retirement date      |
| status                 | TEXT      | NULLABLE         | Employment status            |
| ardhilHaliUrl          | TEXT      | NULLABLE         | Current status document URL  |
| confirmationLetterUrl  | TEXT      | NULLABLE         | Confirmation letter URL      |
| jobContractUrl         | TEXT      | NULLABLE         | Job contract document URL    |
| birthCertificateUrl    | TEXT      | NULLABLE         | Birth certificate URL        |
| institutionId          | TEXT      | NOT NULL         | Associated institution       |

**Relationships:**

- Many-to-One with `Institution` (institutionId)
- One-to-One with `User` (optional reverse relation)
- One-to-Many with `EmployeeCertificate` (employeeId)
- One-to-Many with all Request entities (employeeId)

**Business Rules:**

- Zanzibar ID (zanId) must be unique
- Must be associated with an institution
- Employee can have multiple certificates
- Employee can have multiple requests of different types

---

## 5. Request Management Entities

All request entities follow a common pattern with standardized workflow fields:

### Common Request Pattern

| Field           | Type      | Purpose                                      |
| --------------- | --------- | -------------------------------------------- |
| id              | TEXT      | Unique request identifier                    |
| status          | TEXT      | Current status (pending, approved, rejected) |
| reviewStage     | TEXT      | Current review stage in workflow             |
| documents       | TEXT[]    | Array of supporting document URLs            |
| rejectionReason | TEXT      | Reason for rejection (if applicable)         |
| employeeId      | TEXT      | Employee this request concerns               |
| submittedById   | TEXT      | User who submitted the request               |
| reviewedById    | TEXT      | User who reviewed/processed the request      |
| createdAt       | TIMESTAMP | Request creation timestamp                   |
| updatedAt       | TIMESTAMP | Last update timestamp                        |

### 5.1 ConfirmationRequest

**Purpose:** Manages employee confirmation requests after probation period.

**Specific Fields:**

- `decisionDate` (TIMESTAMP): Date of confirmation decision
- `commissionDecisionDate` (TIMESTAMP): Public Service Commission decision date

---

### 5.2 PromotionRequest

**Purpose:** Handles employee promotion requests.

**Specific Fields:**

- `proposedCadre` (TEXT, NOT NULL): Target cadre for promotion
- `promotionType` (TEXT, NOT NULL): Type of promotion (regular, accelerated, etc.)
- `studiedOutsideCountry` (BOOLEAN): Whether employee studied abroad
- `commissionDecisionReason` (TEXT): Reason for commission's decision

**Migration History:**

- Added `commissionDecisionReason` field (20250715102327)

---

### 5.3 LwopRequest

**Purpose:** Leave Without Pay requests.

**Specific Fields:**

- `duration` (TEXT, NOT NULL): Duration of leave
- `reason` (TEXT, NOT NULL): Reason for leave
- `startDate` (TIMESTAMP): Leave start date
- `endDate` (TIMESTAMP): Leave end date

---

### 5.4 CadreChangeRequest

**Purpose:** Requests for changing employee cadre/classification.

**Specific Fields:**

- `newCadre` (TEXT, NOT NULL): Target new cadre
- `reason` (TEXT): Reason for cadre change
- `studiedOutsideCountry` (BOOLEAN): Whether employee studied abroad

---

### 5.5 RetirementRequest

**Purpose:** Employee retirement requests.

**Specific Fields:**

- `retirementType` (TEXT, NOT NULL): Type of retirement (normal, early, medical)
- `illnessDescription` (TEXT): Description if medical retirement
- `proposedDate` (TIMESTAMP, NOT NULL): Proposed retirement date
- `delayReason` (TEXT): Reason for delayed retirement if applicable

---

### 5.6 ResignationRequest

**Purpose:** Employee resignation requests.

**Specific Fields:**

- `effectiveDate` (TIMESTAMP, NOT NULL): Effective date of resignation
- `reason` (TEXT): Reason for resignation

---

### 5.7 ServiceExtensionRequest

**Purpose:** Requests to extend service beyond normal retirement date.

**Specific Fields:**

- `currentRetirementDate` (TIMESTAMP, NOT NULL): Current planned retirement date
- `requestedExtensionPeriod` (TEXT, NOT NULL): Requested extension period
- `justification` (TEXT, NOT NULL): Justification for extension

---

### 5.8 SeparationRequest

**Purpose:** Handles employee separation from service (termination, dismissal, etc.).

**Specific Fields:**

- `type` (TEXT, NOT NULL): Type of separation
- `reason` (TEXT, NOT NULL): Reason for separation

---

## 6. Supporting Entities

### 6.1 EmployeeCertificate

**Purpose:** Stores employee educational certificates and qualifications.

| Column     | Type | Constraints  | Description                   |
| ---------- | ---- | ------------ | ----------------------------- |
| id         | TEXT | PRIMARY KEY  | Unique certificate identifier |
| type       | TEXT | NOT NULL     | Certificate type              |
| name       | TEXT | NOT NULL     | Certificate name              |
| url        | TEXT | NULLABLE     | Certificate document URL      |
| employeeId | TEXT | NOT NULL, FK | Associated employee           |

**Relationships:**

- Many-to-One with `Employee` (employeeId)
- CASCADE DELETE when employee is deleted

---

### 6.2 Complaint

**Purpose:** Manages employee complaints and grievances.

| Column                 | Type      | Constraints   | Description                        |
| ---------------------- | --------- | ------------- | ---------------------------------- |
| id                     | TEXT      | PRIMARY KEY   | Unique complaint identifier        |
| complaintType          | TEXT      | NOT NULL      | Type of complaint                  |
| subject                | TEXT      | NOT NULL      | Complaint subject                  |
| details                | TEXT      | NOT NULL      | Detailed description               |
| complainantPhoneNumber | TEXT      | NOT NULL      | Complainant contact number         |
| nextOfKinPhoneNumber   | TEXT      | NOT NULL      | Next of kin contact                |
| attachments            | TEXT[]    | NOT NULL      | Supporting document URLs           |
| status                 | TEXT      | NOT NULL      | Current status                     |
| reviewStage            | TEXT      | NOT NULL      | Current review stage               |
| officerComments        | TEXT      | NULLABLE      | Officer's comments                 |
| internalNotes          | TEXT      | NULLABLE      | Internal processing notes          |
| rejectionReason        | TEXT      | NULLABLE      | Reason for rejection if applicable |
| complainantId          | TEXT      | NOT NULL, FK  | User who filed complaint           |
| assignedOfficerRole    | TEXT      | NOT NULL      | Role of assigned officer           |
| reviewedById           | TEXT      | NULLABLE, FK  | User who reviewed complaint        |
| createdAt              | TIMESTAMP | DEFAULT now() | Creation timestamp                 |
| updatedAt              | TIMESTAMP | NOT NULL      | Last update timestamp              |

**Relationships:**

- Many-to-One with `User` (complainantId)
- Many-to-One with `User` (reviewedById)

---

### 6.3 Notification

**Purpose:** User notification system for alerts and updates.

| Column    | Type      | Constraints   | Description                    |
| --------- | --------- | ------------- | ------------------------------ |
| id        | TEXT      | PRIMARY KEY   | Unique notification identifier |
| message   | TEXT      | NOT NULL      | Notification message           |
| link      | TEXT      | NULLABLE      | Related link/URL               |
| isRead    | BOOLEAN   | DEFAULT false | Read status                    |
| userId    | TEXT      | NOT NULL, FK  | Recipient user                 |
| createdAt | TIMESTAMP | DEFAULT now() | Creation timestamp             |

**Relationships:**

- Many-to-One with `User` (userId)
- CASCADE DELETE when user is deleted

---

## 7. Relationships and Constraints

### Foreign Key Relationships

#### Institution Relationships

```sql
User.institutionId -> Institution.id (RESTRICT)
Employee.institutionId -> Institution.id (RESTRICT)
```

#### User-Employee Relationships

```sql
User.employeeId -> Employee.id (SET NULL)
```

#### Request Entity Relationships (Pattern applies to all request types)

```sql
{Request}.employeeId -> Employee.id (RESTRICT)
{Request}.submittedById -> User.id (RESTRICT)
{Request}.reviewedById -> User.id (SET NULL)
```

Request types following this pattern:

- ConfirmationRequest
- PromotionRequest
- LwopRequest
- CadreChangeRequest
- RetirementRequest
- ResignationRequest
- ServiceExtensionRequest
- SeparationRequest

#### Complaint Relationships

```sql
Complaint.complainantId -> User.id (RESTRICT)
Complaint.reviewedById -> User.id (SET NULL)
```

#### Supporting Entity Relationships

```sql
EmployeeCertificate.employeeId -> Employee.id (CASCADE)
Notification.userId -> User.id (CASCADE)
```

### Delete Behaviors

| Relationship                         | On Delete Action  | Rationale                                   |
| ------------------------------------ | ----------------- | ------------------------------------------- |
| User -> Institution                  | RESTRICT          | Cannot delete institution with active users |
| Employee -> Institution              | RESTRICT          | Cannot delete institution with employees    |
| User -> Employee                     | SET NULL          | User can exist without employee link        |
| Request -> Employee                  | RESTRICT          | Preserve request history                    |
| Request -> User (submitted/reviewed) | RESTRICT/SET NULL | Preserve audit trail                        |
| EmployeeCertificate -> Employee      | CASCADE           | Certificates are employee-specific          |
| Notification -> User                 | CASCADE           | Clean up notifications with user            |

---

## 8. Indexes and Performance

### Unique Indexes

```sql
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");
CREATE UNIQUE INDEX "Institution_tinNumber_key" ON "Institution"("tinNumber");
CREATE UNIQUE INDEX "Employee_zanId_key" ON "Employee"("zanId");
```

### Performance Considerations

1. **Frequently Queried Fields:**
   - User.username (login operations)
   - Employee.zanId (employee lookups)
   - Institution.name (institution searches)
   - Request.status, Request.reviewStage (workflow queries)

2. **Recommended Additional Indexes:**
   - Consider adding indexes on:
     - `Employee.institutionId` (institution employee lists)
     - `Request.submittedById` (user's submitted requests)
     - `Request.createdAt` (chronological queries)
     - `Notification.userId, isRead` (unread notifications)

3. **Array Field Queries:**
   - Documents arrays may benefit from GIN indexes for document searches
   - Consider: `CREATE INDEX ON {Request}Table USING GIN(documents);`

---

## 9. Data Types and Conventions

### ID Generation

- All primary keys use `TEXT` type
- Allows for UUID or custom ID generation strategies
- Generated at application level (not database level)

### Timestamp Fields

- Use PostgreSQL `TIMESTAMP(3)` (millisecond precision)
- Default to `CURRENT_TIMESTAMP` for creation timestamps
- All times stored in UTC (application handles timezone conversion)

### Array Fields

- `documents`: TEXT[] - Stores multiple document URLs
- `attachments`: TEXT[] - Stores multiple attachment URLs
- Empty arrays represented as `[]`, not NULL

### Boolean Fields

- Use PostgreSQL native BOOLEAN type
- Default values specified where applicable
- Examples: `User.active` (DEFAULT true), `Notification.isRead` (DEFAULT false)

### Text Fields

- No explicit length limits at database level
- Application layer enforces business rules
- NULL allowed where business logic permits

### Naming Conventions

- **Tables:** PascalCase (User, Employee, PromotionRequest)
- **Columns:** camelCase (employeeId, createdAt, zanId)
- **Foreign Keys:** Descriptive names with entity reference
- **Indexes:** Auto-generated by Prisma with `_key` suffix for unique

---

## 10. Security Considerations

### Authentication & Authorization

- Passwords stored as hashed values (never plain text)
- User roles determine access control (implemented at application layer)
- Active flag allows disabling users without deletion

### Data Protection

- Personal identifiable information (PII) in Employee table
- Sensitive fields: zanId, phoneNumber, contactAddress, dateOfBirth
- Document URLs should use secure storage with access controls

### Audit Trail

- All request entities include timestamps (createdAt, updatedAt)
- Submitter and reviewer tracked for accountability
- Rejection reasons preserved for compliance

### Data Integrity

- Foreign key constraints prevent orphaned records
- Unique constraints on critical identifiers
- NOT NULL constraints on required fields
- RESTRICT delete policies preserve historical data

### Recommendations

1. Implement row-level security for multi-tenant isolation
2. Encrypt sensitive fields at rest
3. Use prepared statements to prevent SQL injection
4. Regular backup and disaster recovery procedures
5. Audit logging for sensitive operations

---

## 11. Migration History

### Initial Migration (20250712105050_init)

- Created all core tables
- Established foreign key relationships
- Set up unique indexes
- Configured cascade behaviors

### Promotion Enhancement (20250715102327_add_commission_decision_reason_to_promotion)

- Added `commissionDecisionReason` field to PromotionRequest table
- Allows tracking of Public Service Commission decision rationale

### Future Migration Considerations

- Adding composite indexes for performance optimization
- Implementing database-level enums for status/stage values
- Adding full-text search capabilities for employee searches
- Implementing partitioning for large request tables
- Adding soft delete flags for archival purposes

---

## Appendix A: Workflow Stages

### Common Status Values

- `PENDING` - Initial submission
- `UNDER_REVIEW` - Being reviewed
- `APPROVED` - Approved by authority
- `REJECTED` - Rejected with reason
- `COMPLETED` - Fully processed

### Common Review Stages

- `INSTITUTION` - Institution level review
- `HR_OFFICER` - HR officer review
- `DIRECTOR` - Director level review
- `PERMANENT_SECRETARY` - PS review
- `COMMISSION` - Public Service Commission review

### Request-Specific Workflows

Each request type may have specific workflow stages defined at the application level based on business rules and approval hierarchies.

---

## Appendix B: Entity Count Estimates

| Entity Type         | Expected Volume | Growth Rate |
| ------------------- | --------------- | ----------- |
| Institution         | 50-100          | Low         |
| Employee            | 10,000-50,000   | Medium      |
| User                | 500-2,000       | Low         |
| PromotionRequest    | 1,000-5,000/yr  | Medium-High |
| ConfirmationRequest | 500-2,000/yr    | Medium      |
| RetirementRequest   | 100-500/yr      | Low         |
| LwopRequest         | 200-1,000/yr    | Medium      |
| Complaint           | 50-500/yr       | Variable    |
| Notification        | High Volume     | High        |

---

## Document Control

| Version | Date       | Author | Changes                     |
| ------- | ---------- | ------ | --------------------------- |
| 1.0     | 2025-12-25 | System | Initial database design doc |

---

**End of Database Design Document**
