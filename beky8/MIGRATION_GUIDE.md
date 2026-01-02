# Three-Tier Architecture Migration Guide

## Overview
This document outlines the migration from a monolithic Next.js application to a proper three-tier architecture where the Next.js frontend communicates with the Spring Boot backend.

## Architecture Change

### Before (Monolithic)
```
Next.js Application
├── Frontend (React Components)
├── Backend (API Routes)
└── Database (Prisma → PostgreSQL)
```

### After (Three-Tier)
```
Tier 1: Next.js Frontend (Presentation Layer)
    ↓ HTTP/REST API calls
Tier 2: Spring Boot Backend (Business Logic Layer)
    ↓ JPA/Hibernate
Tier 3: PostgreSQL Database (Data Layer)
```

## Changes Made

### 1. Environment Configuration
- **File**: `.env`
- **Changes**:
  - Added `NEXT_PUBLIC_API_URL=http://localhost:8080/api`
  - Added `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080`

### 2. API Client Implementation
- **File**: `src/lib/api-client.ts`
- **Purpose**: Centralized API communication with Spring Boot backend
- **Features**:
  - JWT token management
  - Automatic token refresh
  - Type-safe API calls
  - Error handling
  - Request/response interceptors

### 3. Authentication System Update
- **File**: `src/store/auth-store.ts`
- **Changes**:
  - Updated to use Spring Boot login endpoint
  - JWT token storage and management
  - Automatic token refresh functionality
  - Backend-compatible user data format

### 4. API Initialization
- **File**: `src/hooks/use-api-init.ts`
- **Purpose**: Initialize API client with stored tokens
- **File**: `src/store/auth-provider.tsx`
- **Changes**: Added API initialization to app startup

### 5. API Routes Disabled
- **Action**: Renamed `src/app/api/` to `src/app/api-disabled/`
- **Purpose**: Prevent conflicts and force migration to backend APIs

### 6. Backend Configuration
- **File**: `src/lib/backend-config.ts`
- **Purpose**: Map frontend routes to backend endpoints

## API Endpoint Mapping

### Authentication
| Frontend (Old) | Backend (New) | Status |
|---------------|---------------|---------|
| `/api/auth/login` | `/api/auth/login` | ✅ Implemented |
| `/api/auth/logout` | `/api/auth/logout` | ✅ Implemented |
| N/A | `/api/auth/refresh` | ✅ Implemented |

### Employees
| Frontend (Old) | Backend (New) | Status |
|---------------|---------------|---------|
| `/api/employees` | `/api/employees` | ✅ Implemented |
| `/api/employees/search` | `/api/employees/search` | ⚠️ Needs Implementation |
| `/api/employees/urgent-actions` | `/api/employees/urgent-actions` | ⚠️ Needs Implementation |

### Requests
| Frontend (Old) | Backend (New) | Status |
|---------------|---------------|---------|
| `/api/confirmations` | `/api/confirmation-requests` | ✅ Implemented |
| `/api/promotions` | `/api/promotion-requests` | ✅ Implemented |
| `/api/lwop` | `/api/lwop-requests` | ✅ Implemented |
| `/api/cadre-change` | `/api/cadre-change-requests` | ✅ Implemented |
| `/api/retirement` | `/api/retirement-requests` | ✅ Implemented |
| `/api/resignation` | `/api/resignation-requests` | ✅ Implemented |
| `/api/service-extension` | `/api/service-extension-requests` | ✅ Implemented |
| `/api/termination` | `/api/termination-requests` | ✅ Implemented |

### Other Endpoints
| Frontend (Old) | Backend (New) | Status |
|---------------|---------------|---------|
| `/api/complaints` | `/api/complaints` | ✅ Implemented |
| `/api/institutions` | `/api/institutions` | ✅ Implemented |
| `/api/users` | `/api/users` | ✅ Implemented |
| `/api/dashboard/summary` | `/api/dashboard/statistics` | ✅ Implemented |
| `/api/reports` | `/api/reports/generate` | ✅ Implemented |

## Migration Progress

### ✅ Completed
1. **API Client Setup** - Centralized backend communication
2. **Authentication Migration** - JWT-based auth with Spring Boot
3. **Environment Configuration** - Backend URLs configured
4. **Dashboard API** - Updated to use backend endpoint
5. **API Routes Disabled** - Prevented conflicts

### 🔄 In Progress
1. **Page-by-Page Migration** - Updating individual pages to use API client
2. **Error Handling** - Standardizing error responses
3. **Loading States** - Updating loading indicators

### ⚠️ Needs Backend Implementation
1. **Employee Search** - `/api/employees/search?zanId=xxx`
2. **Urgent Actions** - `/api/employees/urgent-actions`
3. **File Upload** - `/api/files/upload`
4. **Recent Activities** - `/api/dashboard/recent-activities`
5. **Request Tracking** - `/api/requests/track`
6. **Notifications** - `/api/notifications`

## How to Complete Migration

### For Frontend Developers

1. **Update Component API Calls**:
   ```typescript
   // Old way
   const response = await fetch('/api/employees');
   
   // New way
   import { apiClient } from '@/lib/api-client';
   const response = await apiClient.getEmployees();
   ```

2. **Handle API Response Format**:
   ```typescript
   // Backend returns ApiResponse<T>
   if (response.success && response.data) {
     setEmployees(response.data);
   } else {
     toast({ title: "Error", description: response.message });
   }
   ```

3. **Use Type-Safe API Calls**:
   ```typescript
   // All API methods are type-safe
   const employee: Employee = await apiClient.getEmployee(id);
   ```

### For Backend Developers

1. **Implement Missing Endpoints** (see list above)
2. **Ensure CORS Configuration**:
   ```java
   @CrossOrigin(origins = "http://localhost:9002")
   ```
3. **Match Frontend Data Formats**
4. **Implement File Upload Endpoint**

## Testing the Migration

### 1. Start Backend
```bash
cd backend
./mvnw spring-boot:run
# Backend should be running on http://localhost:8080
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
# Frontend should be running on http://localhost:9002
```

### 3. Test Authentication
1. Go to http://localhost:9002/login
2. Login with existing credentials
3. Verify JWT token is stored
4. Check network tab for backend API calls

### 4. Test API Endpoints
1. Navigate to dashboard - should call `/api/dashboard/statistics`
2. Try to view employees - should call `/api/employees`
3. Submit a request - should call appropriate backend endpoint

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Spring Boot CORS is configured for `http://localhost:9002`
   - Check browser console for CORS messages

2. **Authentication Failures**
   - Verify JWT secret matches between frontend and backend
   - Check token expiration times
   - Ensure backend accepts Bearer tokens

3. **404 Errors**
   - Verify backend endpoints exist
   - Check endpoint URL mapping in `backend-config.ts`

4. **Data Format Mismatches**
   - Compare frontend types with backend DTOs
   - Ensure date formats are compatible
   - Check for missing required fields

### Network Debugging
- Use browser DevTools Network tab
- Look for calls to `localhost:8080/api/*`
- Check request/response formats
- Verify authentication headers

## Benefits of Three-Tier Architecture

1. **Separation of Concerns**
   - Frontend focuses on UI/UX
   - Backend handles business logic
   - Database manages data persistence

2. **Scalability**
   - Each tier can be scaled independently
   - Multiple frontend clients can use same backend
   - Backend can be deployed separately

3. **Technology Flexibility**
   - Frontend and backend can use different technologies
   - Easier to replace or upgrade individual tiers

4. **Security**
   - Business logic secured on server
   - JWT-based stateless authentication
   - Centralized authorization

5. **Maintainability**
   - Clear API contracts between tiers
   - Easier testing and debugging
   - Better code organization

## Next Steps

1. **Complete Page Migration** - Update remaining pages to use API client
2. **Implement Missing Backend Endpoints** - See needs implementation list
3. **Add Error Boundaries** - Improve error handling
4. **Performance Optimization** - Add caching and request optimization
5. **Documentation** - Update API documentation
6. **Testing** - Add integration tests for three-tier communication