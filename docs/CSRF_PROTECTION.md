# CSRF Protection Implementation Guide

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Implementation Status:** ✅ Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Details](#implementation-details)
4. [Usage Guide](#usage-guide)
5. [Testing](#testing)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The CSMS application implements **comprehensive CSRF (Cross-Site Request Forgery) protection** using a **double-submit cookie pattern** with **signed tokens** for enhanced security.

### What is CSRF?

CSRF is an attack that tricks a user's browser into making unwanted requests to a web application where the user is authenticated. Without CSRF protection, an attacker could potentially:

- Submit forms on behalf of authenticated users
- Perform state-changing operations (create, update, delete)
- Access sensitive endpoints

### How Our Protection Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User logs in successfully                                    │
│    → Server generates cryptographically secure CSRF token       │
│    → Server signs token with HMAC-SHA256                        │
│    → Server sets token in cookie (readable by JavaScript)       │
│    → Server returns token in response body                      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Client stores CSRF token                                     │
│    → Auth store saves token in state                            │
│    → Cookie automatically set by server                          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Client makes state-changing request (POST/PUT/PATCH/DELETE)  │
│    → API client reads CSRF token from cookie                    │
│    → API client adds token to 'x-csrf-token' header            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Server validates CSRF token                                  │
│    → Checks token exists in both cookie and header              │
│    → Verifies HMAC signature of cookie token                    │
│    → Compares cookie token with header token                    │
│    → Allows request if tokens match                             │
│    → Blocks request if validation fails (403 Forbidden)         │
│    → Logs violation to audit trail                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- ✅ **Double-Submit Cookie Pattern**: Token in cookie and header must match
- ✅ **Signed Tokens**: HMAC-SHA256 signature prevents token tampering
- ✅ **Automatic Integration**: API client automatically adds token to requests
- ✅ **Audit Logging**: All CSRF violations logged for security monitoring
- ✅ **Safe Methods Exemption**: GET, HEAD, OPTIONS don't require CSRF tokens
- ✅ **SameSite Protection**: Cookies set to `SameSite=Strict` for additional defense

---

## Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │  Auth Store     │    │   API Client     │                    │
│  │  - csrfToken    │───>│  - Adds CSRF     │                    │
│  │  - getCSRFToken │    │    header to     │                    │
│  └─────────────────┘    │    requests      │                    │
│                         └──────────────────┘                    │
│                                  ↓                                │
│                         HTTP Request (with headers)               │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│                        Server (Next.js)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Route Handler                                       │    │
│  │  1. withCSRFProtection(req)                             │    │
│  │  2. Validates CSRF token                                 │    │
│  │  3. Blocks or allows request                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                  ↓                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CSRF Utilities (src/lib/csrf-utils.ts)                 │    │
│  │  - generateCSRFToken()                                   │    │
│  │  - signCSRFToken()                                       │    │
│  │  - validateCSRFTokens()                                  │    │
│  │  - logCSRFViolation()                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                  ↓                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Audit Logger                                            │    │
│  │  - Logs CSRF violations with severity WARNING           │    │
│  │  - Includes IP, user agent, attempted route             │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── lib/
│   ├── csrf-utils.ts                 # Core CSRF utilities
│   ├── api-csrf-middleware.ts        # API route CSRF middleware
│   └── api-client.ts                 # Updated with CSRF header injection
├── store/
│   └── auth-store.ts                 # Updated with CSRF token management
└── app/
    └── api/
        ├── auth/
        │   └── login/
        │       └── route.ts           # Generates & sets CSRF token on login
        └── test/
            └── csrf/
                └── route.ts           # Test endpoint for CSRF validation
```

---

## Implementation Details

### 1. CSRF Token Generation (Login)

**File:** `src/app/api/auth/login/route.ts`

```typescript
// After successful authentication...

// Generate and set CSRF token
const {
  generateCSRFToken,
  signCSRFToken,
  getCSRFCookieOptions,
  CSRF_COOKIE_NAME,
} = await import('@/lib/csrf-utils');

const csrfToken = generateCSRFToken(); // 32 bytes of random data
const signedCSRFToken = signCSRFToken(csrfToken); // token.signature
const csrfCookieOptions = getCSRFCookieOptions();

// Create response with CSRF token
const response = NextResponse.json({
  success: true,
  data: authData,
  csrfToken: signedCSRFToken, // Include in response
  message: 'Login successful',
});

// Set CSRF token cookie
response.cookies.set(CSRF_COOKIE_NAME, signedCSRFToken, csrfCookieOptions);
```

**Cookie Options:**

```typescript
{
  httpOnly: false,      // JavaScript needs to read this
  secure: true,         // HTTPS only in production
  sameSite: 'strict',   // Prevent cross-site sending
  path: '/',
  maxAge: 604800        // 7 days
}
```

### 2. Client-Side Token Storage

**File:** `src/store/auth-store.ts`

```typescript
interface AuthState {
  // ... other fields
  csrfToken: string | null; // CSRF token
  getCSRFToken: () => string | null;
}

// In login method:
const csrfToken = backendResponse?.csrfToken || null;

set({
  user,
  role: userRole,
  isAuthenticated: true,
  csrfToken: csrfToken, // Store CSRF token
});
```

### 3. Automatic CSRF Header Injection

**File:** `src/lib/api-client.ts`

```typescript
private async request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<ApiResponse<T>> {
  // ... existing code

  // Add CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  const requiresCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (requiresCSRF && typeof window !== 'undefined') {
    // Get CSRF token from cookie
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1];

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    } else {
      console.warn('[API Client] CSRF token not found:', method, endpoint);
    }
  }

  // ... rest of request
}
```

### 4. Server-Side CSRF Validation

**File:** `src/lib/api-csrf-middleware.ts`

```typescript
export async function validateCSRF(request: NextRequest | Request): Promise<{
  valid: boolean;
  response?: NextResponse;
}> {
  const method = request.method;

  // Skip CSRF validation for safe HTTP methods
  if (!requiresCSRFProtection(method)) {
    return { valid: true };
  }

  // Get CSRF token from cookie and header
  const cookieToken = getCookieToken(request);
  const headerToken = request.headers.get('x-csrf-token') || undefined;

  // Validate tokens
  const isValid = validateCSRFTokens(cookieToken, headerToken);

  if (!isValid) {
    // Log violation and return error
    await logCSRFViolation(/* ... */);

    return {
      valid: false,
      response: NextResponse.json(createCSRFError(reason), { status: 403 }),
    };
  }

  return { valid: true };
}
```

**Token Validation Logic:**

```typescript
export function validateCSRFTokens(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  // 1. Both must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // 2. Verify signature of cookie token
  if (!verifyCSRFToken(cookieToken)) {
    return false;
  }

  // 3. Cookie and header must match exactly
  if (cookieToken !== headerToken) {
    return false;
  }

  return true;
}
```

---

## Usage Guide

### For API Route Developers

#### Option 1: Using the Wrapper Function (Recommended)

```typescript
import { withCSRFProtection } from '@/lib/api-csrf-middleware';

export async function POST(req: Request) {
  // Validate CSRF token first
  const csrfCheck = await withCSRFProtection(req);
  if (!csrfCheck.valid) {
    return csrfCheck.response!;
  }

  // Your API logic here
  const body = await req.json();

  return NextResponse.json({
    success: true,
    data: {
      /* ... */
    },
  });
}
```

#### Option 2: Using the Higher-Order Function

```typescript
import { withCSRF } from '@/lib/api-csrf-middleware';

export const POST = withCSRF(async (req: Request) => {
  // CSRF validation happens automatically
  // Your API logic here
  const body = await req.json();

  return NextResponse.json({
    success: true,
    data: {
      /* ... */
    },
  });
});
```

### For Frontend Developers

**No action required!** The API client automatically handles CSRF tokens:

```typescript
// Just use the API client as normal
import { apiClient } from '@/lib/api-client';

// CSRF token automatically added to headers
const response = await apiClient.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

### Exempt Routes (No CSRF Required)

The following routes **do not** require CSRF tokens:

- `/api/auth/login` - Login endpoint (generates token)
- `/api/auth/employee-login` - Employee login
- All **GET**, **HEAD**, **OPTIONS** requests (safe methods)

---

## Testing

### Manual Testing

#### Test 1: Successful Request with CSRF Token

```bash
# 1. Login to get CSRF token
curl -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt \
  -v

# Extract CSRF token from response
# Token will be in response body: { "csrfToken": "..." }

# 2. Make POST request with CSRF token
curl -X POST http://localhost:9002/api/test/csrf \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <TOKEN_FROM_STEP_1>" \
  -b cookies.txt \
  -d '{"test":"data"}' \
  -v

# Expected: 200 OK with success message
```

#### Test 2: Request Without CSRF Token (Should Fail)

```bash
# Login first
curl -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Make POST request WITHOUT CSRF header
curl -X POST http://localhost:9002/api/test/csrf \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"test":"data"}' \
  -v

# Expected: 403 Forbidden
# Response: {
#   "success": false,
#   "message": "CSRF token validation failed",
#   "error": "CSRF_VALIDATION_FAILED"
# }
```

#### Test 3: Safe Method (No CSRF Required)

```bash
# GET request without CSRF token (should succeed)
curl -X GET http://localhost:9002/api/test/csrf -v

# Expected: 200 OK
# Response: {
#   "success": true,
#   "message": "GET request successful - no CSRF token required"
# }
```

### Automated Testing

**Test Endpoint:** `/api/test/csrf`

| Method | CSRF Token    | Expected Result |
| ------ | ------------- | --------------- |
| GET    | Not required  | 200 OK          |
| POST   | Valid token   | 200 OK          |
| POST   | Missing token | 403 Forbidden   |
| POST   | Invalid token | 403 Forbidden   |
| PUT    | Valid token   | 200 OK          |
| DELETE | Valid token   | 200 OK          |

### Browser Testing

1. **Login** to the application
2. **Open DevTools** → Network tab
3. **Make a state-changing request** (e.g., create user, update profile)
4. **Check request headers** → Should see `x-csrf-token: <token>`
5. **Check cookies** → Should see `csrf-token` cookie
6. **Check response** → Should be successful

---

## Security Considerations

### Strengths

1. **✅ Double-Submit Pattern**
   - Token must exist in both cookie and header
   - Attacker cannot read cookie from another domain (SameSite)
   - Attacker cannot forge token without knowing secret

2. **✅ Signed Tokens**
   - HMAC-SHA256 signature prevents tampering
   - Secret key known only to server
   - Timing-safe comparison prevents timing attacks

3. **✅ SameSite Cookies**
   - `SameSite=Strict` prevents cross-site cookie sending
   - Additional layer of protection
   - Supported by all modern browsers

4. **✅ Audit Logging**
   - All CSRF violations logged
   - Includes IP address, user agent, attempted route
   - Enables security monitoring and incident response

5. **✅ Automatic Token Rotation**
   - New token generated on each login
   - Token cleared on logout
   - 7-day expiry

### Limitations & Mitigations

| Limitation                          | Risk Level | Mitigation                                           |
| ----------------------------------- | ---------- | ---------------------------------------------------- |
| **Cookie Accessible by JavaScript** | Low        | SameSite=Strict, HTTPS only, token signing           |
| **XSS Can Steal Token**             | Medium     | React auto-escaping, CSP (planned), input validation |
| **Subdomain Attack**                | Low        | SameSite=Strict, no vulnerable subdomains            |
| **Token Reuse Within 7 Days**       | Low        | Session expiry (24h), logout clears token            |

### Best Practices

1. **✅ Always Use HTTPS in Production**
   - Prevents man-in-the-middle attacks
   - Protects token in transit
   - Enables `Secure` cookie attribute

2. **✅ Change CSRF_SECRET in Production**

   ```bash
   # Generate strong secret
   openssl rand -base64 32

   # Add to .env
   CSRF_SECRET=<generated_secret>
   ```

3. **✅ Monitor Audit Logs**
   - Check `/dashboard/admin/audit-trail` regularly
   - Investigate CSRF violations
   - Look for patterns of attacks

4. **✅ Keep Dependencies Updated**
   - Update Next.js, React, and other packages
   - Security patches often include CSRF improvements

5. **✅ Implement CSP (Planned)**
   - Content Security Policy prevents XSS
   - Reduces risk of token theft
   - Configure in `next.config.ts`

---

## Troubleshooting

### Issue: "CSRF token validation failed"

**Symptoms:**

- 403 Forbidden error
- Error message: "CSRF token validation failed"

**Possible Causes:**

1. User logged in before CSRF implementation deployed
2. Cookie expired or deleted
3. Request from different origin (CORS issue)
4. Token signature verification failed

**Solutions:**

1. **Logout and login again** to get fresh CSRF token
2. **Check cookies** in browser DevTools → Application → Cookies
3. **Verify CSRF_SECRET** is set correctly in `.env`
4. **Check browser console** for warnings about missing token

---

### Issue: CSRF token not being sent in requests

**Symptoms:**

- Requests failing with CSRF error
- `x-csrf-token` header missing in Network tab

**Possible Causes:**

1. API client not updated with CSRF logic
2. Request not using API client (direct fetch)
3. Cookie not being set on login

**Solutions:**

1. **Use API client** for all API requests
2. **Check login response** includes `csrfToken` field
3. **Verify cookie** is set after login
4. **Clear cache** and hard refresh (Ctrl+Shift+R)

---

### Issue: Safe methods (GET) being blocked

**Symptoms:**

- GET requests returning 403
- Should not require CSRF token

**Possible Causes:**

1. Middleware applied to all methods
2. Incorrect method detection

**Solutions:**

1. **Verify middleware logic** skips safe methods
2. **Check `requiresCSRFProtection`** function
3. **Ensure GET requests** don't trigger CSRF validation

---

### Issue: CSRF violations not appearing in audit log

**Symptoms:**

- CSRF validation failing
- No entries in `/dashboard/admin/audit-trail`

**Possible Causes:**

1. Audit logging not enabled
2. Database connection issue
3. Error in `logCSRFViolation` function

**Solutions:**

1. **Check server logs** for errors
2. **Verify database connection** is healthy
3. **Test audit logging** with other events (login, etc.)

---

## Environment Variables

### Required Configuration

Add to `.env`:

```bash
# CSRF Protection
# Secret key for signing CSRF tokens (CHANGE THIS IN PRODUCTION!)
# Generate with: openssl rand -base64 32
CSRF_SECRET=your-secret-csrf-key-change-in-production
```

### Generating a Strong Secret

```bash
# Option 1: OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Python
python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

---

## Security Compliance

### Alignment with Standards

| Standard                   | Requirement                              | Implementation                                      | Status      |
| -------------------------- | ---------------------------------------- | --------------------------------------------------- | ----------- |
| **OWASP Top 10 (2021)**    | A01: Broken Access Control               | CSRF protection prevents unauthorized state changes | ✅ Met      |
| **OWASP CSRF Prevention**  | Double-Submit Cookie Pattern             | Implemented with signed tokens                      | ✅ Met      |
| **Security Assessment v2** | VULN-NEW-001: CSRF Protection            | Tokens + SameSite cookies                           | ✅ Resolved |
| **ISO 27001**              | A.13.1.3 Protecting application services | CSRF protection for all state-changing endpoints    | ✅ Met      |

### Compliance Checklist

- [x] CSRF tokens generated using cryptographically secure random
- [x] Tokens signed with HMAC-SHA256
- [x] Double-submit cookie pattern implemented
- [x] SameSite=Strict cookies
- [x] Audit logging of CSRF violations
- [x] Safe methods (GET, HEAD, OPTIONS) exempted
- [x] Token expiry (7 days)
- [x] Token rotation on login
- [x] Documentation complete

---

## Future Enhancements

### Planned Improvements

1. **[ ] Encrypted CSRF Tokens**
   - Encrypt token content before signing
   - Additional layer of protection
   - Timeline: Q2 2026

2. **[ ] Per-Request CSRF Tokens**
   - Generate unique token for each request
   - Store in session or database
   - Maximum security (but higher overhead)
   - Timeline: Q3 2026

3. **[ ] CSRF Token Refresh API**
   - Endpoint to refresh CSRF token without re-login
   - Useful for long-running sessions
   - Timeline: Q2 2026

4. **[ ] Rate Limiting on CSRF Failures**
   - Limit failed CSRF validation attempts
   - Prevent brute-force attacks
   - Timeline: Q2 2026

---

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [HMAC-SHA256](https://en.wikipedia.org/wiki/HMAC)
- [Security Assessment Report v2.0](/docs/Security_Assessment_Report_v2.md)
- [Security Policy Document](/docs/Security_Policy_Document.md)

---

## Contact

For questions or security concerns regarding CSRF protection:

| Role                 | Contact                 | Responsibility              |
| -------------------- | ----------------------- | --------------------------- |
| **Security Lead**    | security@zanzibar.go.tz | CSRF security policy        |
| **Development Lead** | dev-lead@zanzibar.go.tz | CSRF implementation         |
| **CISO**             | ciso@zanzibar.go.tz     | Overall security compliance |

---

**Document Classification:** Internal
**Last Reviewed:** 2025-12-28
**Next Review:** 2026-03-28

---

**END OF DOCUMENT**
