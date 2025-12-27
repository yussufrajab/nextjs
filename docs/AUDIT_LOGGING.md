# Audit Logging System

Comprehensive audit logging for security monitoring, compliance, and incident response.

## Overview

The CSMS application now includes a full audit logging system that tracks:
- ✅ All unauthorized access attempts
- ✅ Authentication events (login, logout, failures)
- ✅ Authorization violations
- ✅ Suspicious activities
- ✅ Security incidents

## Architecture

### 1. Database Layer (`AuditLog` Model)

**Location:** `prisma/schema.prisma`

```prisma
model AuditLog {
  id                String   @id @default(cuid())
  eventType         String   // Event type (e.g., UNAUTHORIZED_ACCESS)
  eventCategory     String   // Category (SECURITY, ACCESS, AUTHENTICATION)
  severity          String   // Severity level (INFO, WARNING, ERROR, CRITICAL)
  userId            String?  // User ID (null if unauthenticated)
  username          String?  // Username for quick reference
  userRole          String?  // User's role
  ipAddress         String?  // Client IP address
  userAgent         String?  // Browser/client information
  attemptedRoute    String   // The route accessed
  requestMethod     String?  // HTTP method
  isAuthenticated   Boolean  // Whether user was authenticated
  wasBlocked        Boolean  // Whether access was blocked
  blockReason       String?  // Reason for blocking
  timestamp         DateTime @default(now())
  additionalData    Json?    // Extra contextual data

  User              User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([timestamp])
  @@index([eventType])
  @@index([severity])
  @@index([attemptedRoute])
}
```

**Indexes:**
- `userId` - Quick lookups by user
- `timestamp` - Time-based queries and sorting
- `eventType` - Filter by event type
- `severity` - Filter by severity level
- `attemptedRoute` - Find access attempts to specific routes

### 2. Audit Logger Utility (`src/lib/audit-logger.ts`)

**Functions:**
- `logAuditEvent(data)` - Log any audit event
- `logUnauthorizedAccess(data)` - Log unauthorized access attempts
- `logAccessDenied(data)` - Log access denied events
- `logForbiddenRoute(data)` - Log forbidden route access
- `logLoginAttempt(data)` - Log login attempts (success/failure)
- `getClientIp(headers)` - Extract client IP from request headers
- `getAuditLogs(filters)` - Query audit logs with filters
- `getAuditStatistics(filters)` - Get aggregated statistics

**Event Types:**
```typescript
enum AuditEventType {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  FORBIDDEN_ROUTE = 'FORBIDDEN_ROUTE',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  ROLE_VIOLATION = 'ROLE_VIOLATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  POTENTIAL_BREACH = 'POTENTIAL_BREACH',
}
```

**Severity Levels:**
- `INFO` - Informational events (successful logins)
- `WARNING` - Warning events (access denied)
- `ERROR` - Error events (failed logins)
- `CRITICAL` - Critical security events (potential breaches)

### 3. Middleware Integration

**Location:** `middleware.ts`

The middleware automatically logs:
1. **Unauthenticated Access Attempts**
   - Event: `UNAUTHORIZED_ACCESS`
   - Severity: `WARNING`
   - Logged when: User not authenticated tries to access protected route

2. **Authorization Failures**
   - Event: `UNAUTHORIZED_ACCESS`
   - Severity: `WARNING`
   - Logged when: Authenticated user tries to access route they don't have permission for

**Example Log Entry:**
```json
{
  "eventType": "UNAUTHORIZED_ACCESS",
  "severity": "WARNING",
  "userId": "user_123",
  "username": "john.doe",
  "userRole": "DO",
  "attemptedRoute": "/dashboard/admin/users",
  "blockReason": "Role 'DO' does not have permission to access '/dashboard/admin/users'",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "isAuthenticated": true,
  "wasBlocked": true,
  "timestamp": "2025-12-27T10:30:45.123Z"
}
```

### 4. API Endpoints

#### POST `/api/audit/log`
Log an audit event (called by middleware and application)

**Request:**
```json
{
  "userId": "user_123",
  "username": "john.doe",
  "userRole": "DO",
  "attemptedRoute": "/dashboard/admin/users",
  "blockReason": "Permission denied",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "isAuthenticated": true,
  "requestMethod": "GET"
}
```

#### GET `/api/audit/logs`
Retrieve audit logs (Admin and CSCS only)

**Query Parameters:**
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `eventType` - Filter by event type
- `severity` - Filter by severity level
- `userId` - Filter by user ID
- `username` - Search by username (partial match)
- `attemptedRoute` - Search by route (partial match)
- `limit` - Number of records to return (default: 100)
- `offset` - Offset for pagination (default: 0)
- `statsOnly=true` - Return statistics only

**Response (Logs):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123",
        "eventType": "UNAUTHORIZED_ACCESS",
        "severity": "WARNING",
        "userId": "user_123",
        "username": "john.doe",
        "userRole": "DO",
        "attemptedRoute": "/dashboard/admin/users",
        "blockReason": "Permission denied",
        "ipAddress": "192.168.1.100",
        "timestamp": "2025-12-27T10:30:45.123Z",
        "wasBlocked": true,
        "isAuthenticated": true
      }
    ],
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

**Response (Statistics):**
```json
{
  "success": true,
  "data": {
    "totalEvents": 1523,
    "blockedAttempts": 47,
    "criticalEvents": 3,
    "eventsByType": [
      { "eventType": "UNAUTHORIZED_ACCESS", "_count": 32 },
      { "eventType": "LOGIN_FAILED", "_count": 15 }
    ],
    "eventsBySeverity": [
      { "severity": "WARNING", "_count": 47 },
      { "severity": "INFO", "_count": 1476 }
    ]
  }
}
```

### 5. Audit Trail UI

**Location:** `/dashboard/admin/audit-trail`

**Access:** Admin role only (protected by admin routes middleware)

**Features:**
- ✅ Real-time audit log viewing
- ✅ Statistics dashboard (total events, blocked attempts, critical events, success rate)
- ✅ Advanced filtering:
  - Date range selection
  - Severity level filter
  - Event type filter
  - Username/IP search
- ✅ Pagination (50 logs per page)
- ✅ Refresh button for real-time updates
- ✅ Export functionality (placeholder for CSV export)
- ✅ Color-coded severity badges
- ✅ Detailed event information

**Statistics Cards:**
1. **Total Events** - All logged events in the selected timeframe
2. **Blocked Attempts** - Number of blocked access attempts
3. **Critical Events** - Number of CRITICAL severity events
4. **Success Rate** - Percentage of allowed vs. blocked events

**Table Columns:**
- Timestamp
- Severity (with color-coded badge)
- Event Type
- User (username or "Anonymous")
- Role
- Route (attempted)
- IP Address
- Status (Blocked/Allowed)
- Reason

## Usage Guide

### Viewing Audit Logs

1. **Login as Admin**
2. **Navigate to:** `/dashboard/admin/audit-trail` (or click "Audit Trail" in the Admin Management menu)
3. **Use filters** to narrow down events:
   - Select date range (defaults to last 7 days)
   - Choose severity level
   - Select event type
   - Search by username or IP
4. **Click Refresh** to update data in real-time
5. **Navigate pages** using Previous/Next buttons

### Monitoring Security Events

**Common Queries:**

**1. Find all blocked access attempts in the last 24 hours:**
- Start Date: Yesterday
- End Date: Today
- Status: (Look for "Blocked" badge)
- Severity: WARNING or ERROR

**2. Find all login failures:**
- Event Type: LOGIN_FAILED
- Severity: ERROR

**3. Find all attempts by a specific user:**
- Search: Enter username
- Click Search button

**4. Find all critical security events:**
- Severity: CRITICAL

**5. Find all admin route access attempts:**
- Search Route: "/dashboard/admin"

### Best Practices

1. **Regular Monitoring**
   - Check audit logs daily for suspicious activity
   - Review CRITICAL and ERROR severity events immediately
   - Investigate multiple failed login attempts from the same IP

2. **Retention Policy**
   - Audit logs are stored indefinitely by default
   - Consider implementing a retention policy (e.g., keep 90 days)
   - Archive old logs for compliance

3. **Incident Response**
   - When a CRITICAL event is logged, investigate immediately
   - Check IP addresses for suspicious patterns
   - Verify user roles and permissions
   - Correlate with other security logs

4. **Performance**
   - Use date range filters to reduce query time
   - Audit logs are indexed for fast queries
   - Export large datasets for offline analysis

## Security Considerations

### What's Logged
✅ All unauthorized access attempts
✅ All authentication events
✅ IP addresses and user agents
✅ User IDs and roles
✅ Attempted routes
✅ Block reasons

### What's NOT Logged
❌ Password values
❌ Personal identifiable information (PII) beyond username
❌ Session tokens or cookies
❌ Request bodies (unless explicitly added to additionalData)

### Privacy
- Audit logs contain user identification data (username, IP)
- Access is restricted to Admin and CSCS only
- Logs should be treated as confidential
- Comply with data protection regulations in your jurisdiction

### Performance Impact
- Audit logging uses async operations (fire-and-forget)
- Middleware calls API endpoint asynchronously
- Minimal impact on request latency (~5-10ms)
- Database writes are optimized with indexes

## Troubleshooting

### Issue: Logs not appearing

**Possible Causes:**
1. Middleware API call failing
2. Database connection issue
3. Permission issue (audit/log endpoint)

**Solution:**
1. Check browser console for errors
2. Check server logs for Prisma errors
3. Verify database connection is healthy
4. Check that `/api/audit/log` endpoint is accessible

### Issue: Slow query performance

**Possible Causes:**
1. Large date range selected
2. No filters applied
3. Many audit logs in database

**Solution:**
1. Narrow date range
2. Apply specific filters (severity, event type)
3. Check database indexes are created

### Issue: Unable to access Audit Trail page

**Possible Causes:**
1. User is not Admin or CSCS
2. Route guard is blocking access
3. API endpoint returning 403

**Solution:**
1. Verify user has Admin or CSCS role
2. Check route permissions in `route-permissions.ts`
3. Check browser console for API errors

## Migration

To apply the audit logging schema to your database:

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_audit_logging

# Or apply directly (production)
npx prisma db push
```

## Future Enhancements

- [ ] CSV/Excel export functionality
- [ ] Real-time notifications for CRITICAL events
- [ ] Automated threat detection (e.g., brute force detection)
- [ ] Audit log retention policies
- [ ] Integration with SIEM systems
- [ ] Audit log encryption at rest
- [ ] Geographic IP tracking and visualization
- [ ] User activity heatmaps
- [ ] Compliance reports (GDPR, HIPAA, etc.)

---

**Last Updated:** 2025-12-27
**Version:** 1.0
