# Three-Tier Architecture Setup Guide
## Civil Service Management System (CSMS)

### Overview
This guide provides step-by-step instructions to set up and run the three-tier CSMS architecture with proper PostgreSQL configuration.

## Architecture Components

```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   Frontend      │◄──────────────────►│    Backend      │
│   Next.js 15    │     Port 9002       │ Spring Boot 3   │
│   (Port 9002)   │     ↔ Port 8080     │   (Port 8080)   │
└─────────────────┘                     └─────────┬───────┘
                                                  │
                                           JPA/Hibernate
                                                  │
                                        ┌─────────▼───────┐
                                        │   Database      │
                                        │ PostgreSQL 15   │
                                        │ Database: prizma│
                                        └─────────────────┘
```

## Prerequisites

### Required Software
- ✅ **PostgreSQL 15+** - Database server
- ✅ **Java 17+** - For Spring Boot backend  
- ✅ **Maven 3.6+** - For Spring Boot build
- ✅ **Node.js 18+** - For Next.js frontend
- ✅ **npm/yarn** - Package manager

### Database Setup
The system uses a single PostgreSQL database (`prizma`) that contains:
- **159 users** with proper BCrypt password hashing
- **151 employees** 
- **41 institutions** (Government ministries)
- **Complete HR request data** for all modules

## Configuration Summary

### Database Configuration ✅ COMPLETED
| Component | Database | Host | Port | Schema |
|-----------|----------|------|------|---------|
| Frontend (Next.js) | prizma | localhost | 5432 | public |
| Backend (Spring Boot) | prizma | localhost | 5432 | public |

### Authentication Configuration ✅ COMPLETED
- **Method**: JWT tokens
- **Password Hashing**: BCrypt ($2a$10$...)
- **Access Token**: 10 minutes expiry
- **Refresh Token**: 24 hours expiry

## Step-by-Step Setup

### Step 1: Verify Database Connection

```bash
# Test PostgreSQL connection
psql postgresql://postgres:Mamlaka2020@localhost:5432/prizma

# Run database verification (from backend directory)
cd backend
psql postgresql://postgres:Mamlaka2020@localhost:5432/prizma -f test-database-connection.sql
```

**Expected Output**: All 6 tests should pass showing:
- Table "User" exists
- Sample users available (hro_commission, ahmedm, skhamis)
- 159 users with BCrypt passwords
- Institution relationships working
- All required fields populated

### Step 2: Start Spring Boot Backend

```bash
# Option 1: Using the provided script (Windows)
cd backend
start-backend.bat

# Option 2: Using Maven directly
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Option 3: Using shell script (Linux/Mac)
cd backend
chmod +x start-backend.sh
./start-backend.sh
```

**Expected Output**:
```
Started CSMS Application in X.XXX seconds (JVM running for X.XXX)
Server running on port 8080
Database connection successful
```

**Verify Backend**:
- Open: http://localhost:8080/api/actuator/health
- Should return: `{"status":"UP"}`

### Step 3: Start Next.js Frontend

```bash
# Start the frontend
npm run dev
```

**Expected Output**:
```
▲ Next.js 15.2.3
- Local:        http://localhost:9002
- Network:      http://192.168.x.x:9002

✓ Ready in X.Xs
```

### Step 4: Test Three-Tier Integration

1. **Open Frontend**: http://localhost:9002
2. **Login with Test Credentials**:
   - Username: `hro_commission` 
   - Password: `password123` (or check seed data)
   - Alternative: `ahmedm` / `password123`
   - Administrator: `skhamis` / `password123`

3. **Verify API Calls**: 
   - Open Browser DevTools → Network tab
   - Should see API calls to `localhost:8080/api/*`
   - No calls to `localhost:9002/api/*` (old API routes)

### Step 5: Test Key Features

**Dashboard Test**:
- Login successfully
- Dashboard should load with statistics
- Check Network tab for `/api/dashboard/statistics` calls

**Employee Search**:
- Try to access employee listing
- Should call `/api/employees` on backend

**Request Creation**:
- Try to create a confirmation request
- Should call `/api/confirmation-requests` on backend

## Test Credentials

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `hro_commission` | Check seed data | HRO | Submit requests |
| `ahmedm` | Check seed data | HRO | Submit requests |
| `skhamis` | Check seed data | HHRMD | Approve requests |
| `mariamj` | Check seed data | HRO | Submit requests |

**Note**: Passwords are BCrypt hashed. Check the seed script or database for actual values.

## Troubleshooting

### Common Issues and Solutions

#### 1. "Invalid username or password" ❌→✅
**Cause**: Database configuration mismatch  
**Solution**: ✅ FIXED - Backend now uses same database as frontend

#### 2. Backend fails to start 
**Symptoms**: Spring Boot connection errors
**Solutions**:
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify database exists
psql -U postgres -c "\l" | grep prizma

# Check application.properties configuration
cat backend/src/main/resources/application-dev.properties
```

#### 3. Frontend can't reach backend
**Symptoms**: Network errors in browser console
**Solutions**:
```bash
# Verify backend is running
curl http://localhost:8080/api/actuator/health

# Check CORS configuration in Spring Boot
# Verify Next.js environment variables
echo $NEXT_PUBLIC_API_URL
```

#### 4. JWT Token Issues
**Symptoms**: 401 Unauthorized errors
**Solutions**:
- Check JWT secret configuration
- Verify token expiration times
- Clear browser localStorage
- Check authentication flow in Network tab

#### 5. Database Entity Mapping Errors
**Symptoms**: JPA/Hibernate errors about table/column names
**Solution**: ✅ FIXED - User entity updated to match Prisma schema

### Health Check Commands

```bash
# 1. Test Database Connection
psql postgresql://postgres:Mamlaka2020@localhost:5432/prizma -c "SELECT version();"

# 2. Test Backend Health
curl http://localhost:8080/api/actuator/health

# 3. Test Frontend
curl http://localhost:9002/

# 4. Test API Integration
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hro_commission","password":"your_password"}'
```

## File Changes Made

### Backend Configuration Files ✅
- `application.properties` - Updated database URL to `prizma`
- `application-dev.properties` - Development profile configuration
- `User.java` - Rewritten to match Prisma schema
- `DatabaseConfig.java` - Added database configuration

### Frontend Configuration Files ✅
- `.env` - Added backend API URLs
- `src/lib/api-client.ts` - Complete API client implementation
- `src/store/auth-store.ts` - JWT authentication integration
- `next.config.ts` - API rewrite rules

### Database Files ✅
- `database-setup.sql` - Database verification script
- `test-database-connection.sql` - Connection testing
- API routes disabled (renamed to `api-disabled`)

## Security Configuration

### CORS Settings
Backend allows requests from:
- `http://localhost:9002` (Frontend development)
- `http://localhost:3000` (Alternative frontend port)

### JWT Configuration
- **Algorithm**: HS256
- **Secret**: Configured in `application.properties`
- **Access Token Expiry**: 10 minutes
- **Refresh Token Expiry**: 24 hours

### Database Security
- Connection pooling enabled (HikariCP)
- Prepared statements (SQL injection prevention)
- Role-based data access
- BCrypt password hashing

## Performance Optimization

### Database
- ✅ Connection pooling (max 10 connections)
- ✅ Query optimization with JPA
- ✅ Proper indexing on User.username
- ✅ Lazy loading for relationships

### API
- ✅ Stateless JWT authentication
- ✅ Efficient JSON serialization
- ✅ Pagination support
- ✅ CORS optimization

### Frontend
- ✅ API client with request caching
- ✅ Automatic token refresh
- ✅ Optimized bundle size
- ✅ Lazy component loading

## Success Indicators

### ✅ Successful Setup Checklist
- [ ] PostgreSQL server running
- [ ] Database `prizma` accessible
- [ ] Spring Boot starts without errors
- [ ] Next.js frontend loads on port 9002
- [ ] Login works with test credentials
- [ ] API calls go to `localhost:8080/api/*`
- [ ] Dashboard loads with real data
- [ ] Network tab shows backend API calls
- [ ] No errors in browser console
- [ ] JWT tokens stored and refreshed

### ✅ Three-Tier Verification
- [ ] **Frontend**: Pure UI layer, no direct database access
- [ ] **Backend**: All business logic and data access
- [ ] **Database**: Single source of truth
- [ ] **API Communication**: RESTful HTTP/JSON
- [ ] **Authentication**: JWT-based stateless
- [ ] **Data Flow**: Frontend → Backend → Database

## Next Steps

### Production Deployment
1. **Environment Variables**: Set production database URLs
2. **SSL/TLS**: Configure HTTPS for both tiers
3. **Load Balancing**: Scale backend instances
4. **Database**: Production PostgreSQL cluster
5. **Monitoring**: Add application monitoring
6. **Logging**: Centralized log management

### Development Enhancements
1. **Testing**: Add integration tests
2. **Documentation**: API documentation with Swagger
3. **CI/CD**: Automated deployment pipeline
4. **Error Handling**: Enhanced error management
5. **Caching**: Add Redis for performance
6. **Backup**: Automated database backups

---

## Contact & Support

For issues with this setup:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure database connection is working
4. Check application logs for specific errors

The three-tier architecture is now properly configured and ready for development and testing!