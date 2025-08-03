# Maelezo ya Mfumo wa HR - Civil Service Commission Zanzibar

## Muhtasari
Huu ni mfumo mkuu wa usimamizi wa rasilimali watu kwa ajili ya Tume ya Utumishi wa Umma Zanzibar. Mfumo huu umegawanyika katika sehemu mbili kuu:

1. **Frontend** - Next.js 14 (TypeScript + React)
2. **Backend** - Spring Boot 3.1.5 (Java 17)

## FRONTEND - Next.js Application

### Teknolojia Zinazotumika
- **Framework**: Next.js 14 kwa kutumia App Router
- **Lugha**: TypeScript
- **Styling**: Tailwind CSS pamoja na custom design system
- **UI Components**: Radix UI primitives (kutumia pattern ya shadcn/ui)
- **Forms**: React Hook Form pamoja na Zod validation
- **Icons**: Lucide React
- **State Management**: Zustand na localStorage persistence
- **AI Integration**: Google Genkit na Gemini 2.0 Flash model

### Muundo wa Frontend

#### 1. Components (`src/components/`)
**Authentication Components**
- `login-form.tsx` - Fomu kuu ya kuingilia kwa watumishi
- `employee-login-form.tsx` - Fomu ya kuingilia kwa wafanyakazi

**Layout Components**
- `sidebar.tsx` - Sidebar inayoweza kufungwa/kufunguliwa na menu za role-based
- `header.tsx` - Header ya juu ya ukurasa
- `notification-bell.tsx` - Mfumo wa notifikesheni za real-time
- `user-nav.tsx` - Navigation ya mtumiaji/profile dropdown

**Shared Components**
- `page-header.tsx` - Header ya kurasa inayotumika tena
- `pagination.tsx` - Component ya pagination kwa tables

**UI Components (30+ primitives)**
- Button, Dialog, Form, Input, Select, Table, Toast na nyinginezo
- Zote zina TypeScript typing kamili

#### 2. Kurasa za Application (`src/app/`)

**Kurasa za Authentication**
- `/login` - Kuingilia kwa watumishi
- `/employee-login` - Kuingilia kwa wafanyakazi

**Kurasa za Dashboard**
- **Dashboard Kuu** - Inaonyesha takwimu, shughuli za hivi karibuni, na quick actions
- **Kurasa za Maombi (8 aina)**:
  - Confirmation (uthibitisho wa kukamilika kwa kipindi cha majaribio)
  - Promotion (maendeleo ya kazi)
  - LWOP (likizo bila malipo)
  - Cadre Change (mabadiliko ya aina ya kazi)
  - Retirement (kustaafu)
  - Resignation (kujiuzulu)
  - Service Extension (kuongeza muda wa kazi)
  - Termination (kusitishwa kazi)

**Kurasa Nyingine**
- Profile, Complaints, Urgent Actions, Track Status
- Reports, Audit Trail
- Admin: User & Institution Management

#### 3. API Routes (`src/app/api/`)
- Authentication endpoints
- Employee CRUD operations
- Maombi yote ya HR
- Dashboard metrics
- Notifications
- Reports

#### 4. State Management (`src/store/`)
- `auth-store.ts` - Zustand store kwa authentication
- Session persistence katika localStorage
- Auto-rehydration wakati wa kuanza app

#### 5. AI Integration
- Complaint rewriter kutumia Google Genkit
- Inasaidia kuandika malalamiko kwa mfumo wa kiserikali
- Server-side execution

## BACKEND - Spring Boot Application

### Teknolojia Zinazotumika
- **Framework**: Spring Boot 3.1.5
- **Lugha**: Java 17
- **Build Tool**: Maven
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA na Hibernate
- **Security**: Spring Security na JWT authentication
- **API Documentation**: OpenAPI/Swagger

### Muundo wa Backend

#### 1. Architecture Pattern
Layered Architecture (MVC) yenye layers zifuatazo:
- **Controller Layer** - REST API endpoints
- **Service Layer** - Business logic
- **Repository Layer** - Data access kutumia Spring Data JPA
- **Entity Layer** - Domain models

#### 2. Controllers (18 total)
Kila controller inasimamia endpoints za feature moja:
- `AuthController` - Login/logout/session management
- `EmployeeController` - Employee CRUD operations
- `ComplaintController` - Complaint management
- `DashboardController` - Dashboard metrics
- Controllers za kila aina ya maombi (8 types)
- Analytics na Report controllers

#### 3. Service Layer (24 services)
Services zinashughulikia business logic:
- `AuthService` - Authentication logic
- `EmployeeService` - Employee operations
- `WorkflowService` - Workflow management
- `NotificationService` - Notification handling
- `BusinessRuleEngine` - Business rule validation
- Services nyingine za feature-specific

#### 4. Repository Layer
Repositories zote zinatumia Spring Data JPA:
```java
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    // Custom queries
}
```

#### 5. Entity Layer
Base entity structure:
```java
@MappedSuperclass
public abstract class BaseEntity {
    private UUID id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version; // optimistic locking
    private boolean isActive; // soft delete
}
```

#### 6. Security Implementation
- JWT-based authentication
- Role-based access control
- Custom security annotations
- Request filtering na validation

#### 7. Configuration
**application.properties**:
- Server port: 8080
- Context path: `/api`
- Database: PostgreSQL (localhost:5432/prizma)
- JWT configuration
- File upload limits: 2MB/file, 10MB/request

### API Structure
RESTful endpoints zifuatazo pattern:
- `/auth/*` - Authentication
- `/employees/*` - Employee management
- `/api/complaints/*` - Complaints
- `/api/[request-type]/*` - Specific requests
- `/dashboard/*` - Dashboard data
- `/reports/*` - Reports

### Features Muhimu
1. **Audit Trail** - Kila entity ina audit fields
2. **Soft Delete** - Records hazifutiki kabisa
3. **Pagination** - Built-in support
4. **Role-Based Security** - Fine-grained access
5. **API Documentation** - Swagger UI
6. **Async Processing** - Kwa tasks ndefu
7. **Scheduled Tasks** - Reports na monitoring

## Integration Points

### Frontend ↔ Backend Communication
1. Frontend inatuma HTTP requests kwa Spring Boot backend
2. Authentication kupitia JWT tokens
3. CORS configured kwa localhost:9002 na 3000
4. Consistent error handling na response format

### Database Integration
- Backend inatumia existing Prisma schema
- PostgreSQL database inashirikiwa
- Hibernate DDL mode: `none` (hakuna schema generation)

### Security Flow
1. User login → JWT token generated
2. Token stored katika frontend (localStorage)
3. Token sent kwa kila request katika Authorization header
4. Backend validates token na role permissions

## User Roles & Permissions

### Roles 9 za System
1. **HRO** - Human Resource Officer (full HR access)
2. **HHRMD** - Head of HR Management Department (oversight)
3. **HRMO** - Human Resource Management Officer (operations)
4. **DO** - Director Officer (complaints & terminations)
5. **EMPLOYEE** - Regular employee (limited access)
6. **CSCS** - Civil Service Commission Secretary (reports)
7. **HRRP** - HR Representative (urgent actions)
8. **PO** - Payroll Officer (payroll functions)
9. **ADMIN** - System administrator

## Development Commands

### Frontend
```bash
npm run dev          # Development server (port 9002)
npm run build        # Production build
npm run typecheck    # Type checking
npm run lint         # Linting
npx prisma studio    # Database GUI
```

### Backend
```bash
mvn spring-boot:run  # Development server (port 8080)
mvn clean install    # Build project
mvn test            # Run tests
```

## Changamoto na Mapendekezo

### Changamoto Zilizoonekana
1. **Session Storage** - localStorage si secure kabisa
2. **File Upload** - Hakuna implementation kamili
3. **Testing** - Hakuna test files
4. **Error Monitoring** - Hakuna system ya monitoring

### Mapendekezo ya Kuboresha
1. Implement server-side sessions badala ya localStorage
2. Add file upload kwa S3 au cloud storage
3. Add comprehensive test suites (unit, integration, E2E)
4. Implement error monitoring (Sentry au similar)
5. Add caching layer kwa performance
6. Implement email notifications
7. Add data export functionality
8. Multi-language support (Kiswahili/English)

## Hitimisho
Mfumo huu ni comprehensive HR management system inayotumia modern tech stack. Frontend inatumia Next.js 14 na backend inatumia Spring Boot, zote zikishirikiana kupitia REST API. Mfumo una features nyingi za kisasa ikiwa ni pamoja na AI integration, real-time notifications, na role-based access control.

Mfumo unafuata best practices za enterprise development na una muundo mzuri wa scalability na maintainability. Hata hivyo, kuna nafasi za kuboresha hasa katika security, testing, na production deployment.