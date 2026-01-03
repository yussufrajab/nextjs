# Security Implementation Guide

This document describes the authentication and authorization security measures implemented in the CSMS application.

## Overview

The application now implements **defense-in-depth** security with multiple layers of protection:

1. **Server-Side Middleware** - Next.js middleware validates all routes before rendering
2. **Cookie-Based Session** - Auth state is stored in secure cookies for server-side validation
3. **Client-Side Guards** - React components and hooks provide UX and additional protection
4. **Role-Based Access Control (RBAC)** - Fine-grained permissions based on user roles

## Security Layers

### 1. Next.js Middleware (`middleware.ts`)

**Location:** `/middleware.ts`

The middleware runs on **every request** before the page is rendered. It:

- ✅ Validates authentication by checking the `auth-storage` cookie
- ✅ Extracts user role from the cookie
- ✅ Checks if the user's role has permission to access the requested route
- ✅ Redirects to login if not authenticated
- ✅ Redirects to dashboard with error if not authorized

**Example:**

```typescript
// A DO user trying to access /dashboard/admin/users
// Middleware intercepts → Checks role → Denies access → Redirects to /dashboard?error=unauthorized
```

### 2. Route Permission Configuration (`src/lib/route-permissions.ts`)

**Location:** `/src/lib/route-permissions.ts`

Centralized configuration for all route permissions:

```typescript
const ROUTE_PERMISSIONS = [
  {
    pattern: /^\/dashboard\/admin/,
    allowedRoles: ['Admin'],
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO'],
  },
  // ... more routes
];
```

**Key Functions:**

- `canAccessRoute(pathname, role)` - Check if a role can access a route
- `getAllowedRolesForRoute(pathname)` - Get all allowed roles for a route

### 3. Auth Store Cookie Integration (`src/store/auth-store.ts`)

**Location:** `/src/store/auth-store.ts`

The auth store has been enhanced to:

- ✅ Set `auth-storage` cookie on login
- ✅ Clear cookie on logout
- ✅ Sync cookie on auth state initialization

**Cookie Structure:**

```json
{
  "state": {
    "user": { "id": "...", "role": "Admin", "username": "..." },
    "role": "Admin",
    "isAuthenticated": true
  }
}
```

**Cookie Properties:**

- Expires: 7 days
- Path: `/`
- SameSite: `Strict`

### 4. Client-Side Route Guards

#### Route Guard Hook (`src/hooks/use-route-guard.ts`)

**Location:** `/src/hooks/use-route-guard.ts`

Provides programmatic route validation:

```typescript
function AdminPage() {
  const { hasAccess, isChecking } = useRouteGuard({ redirectOnDenied: true });

  if (isChecking) return <LoadingSpinner />;
  if (!hasAccess) return null;

  return <div>Admin Content</div>;
}
```

#### Route Guard Component (`src/components/auth/route-guard.tsx`)

**Location:** `/src/components/auth/route-guard.tsx`

Declarative component wrapper for protecting pages:

```typescript
export default function AdminPage() {
  return (
    <RouteGuard>
      <h1>Admin Dashboard</h1>
      {/* Protected content */}
    </RouteGuard>
  );
}
```

**Features:**

- Shows loading skeleton while checking access
- Displays professional error UI if access denied
- Provides "Return to Dashboard" button

## Role-Based Access Control Matrix

| Route Pattern             | Allowed Roles         |
| ------------------------- | --------------------- |
| `/dashboard/admin/*`      | Admin                 |
| `/dashboard/confirmation` | HRO, HHRMD, HRMO      |
| `/dashboard/lwop`         | HRO, HHRMD, HRMO      |
| `/dashboard/promotion`    | HRO, HHRMD, HRMO      |
| `/dashboard/termination`  | HRO, DO, HHRMD        |
| `/dashboard/complaints`   | EMPLOYEE, DO, HHRMD   |
| `/dashboard/institutions` | HHRMD, CSCS, DO, HRMO |
| `/dashboard/profile`      | All authenticated     |
| `/dashboard`              | All authenticated     |

## How It Works: Attack Prevention

### Scenario 1: Direct URL Access

**Attack:** A DO user tries to access `/dashboard/admin/institutions` by typing the URL

**Defense:**

1. ✅ **Middleware** intercepts the request
2. ✅ Reads `auth-storage` cookie
3. ✅ Extracts role: "DO"
4. ✅ Checks permissions: Admin route requires "Admin" role
5. ✅ Denies access and redirects to `/dashboard?error=unauthorized`
6. ✅ Dashboard shows error toast: "Access Denied"

### Scenario 2: Cookie Manipulation

**Attack:** User modifies the `auth-storage` cookie to change their role

**Defense:**

1. ✅ Middleware reads the cookie
2. ❌ **Backend API routes still validate** - The backend has the authoritative user data
3. ✅ Any API call will fail with 401/403 if role doesn't match
4. ✅ Token-based API authentication prevents unauthorized data access

### Scenario 3: Bypassing Client-Side Checks

**Attack:** User disables JavaScript or manipulates React state

**Defense:**

1. ✅ **Server-side middleware runs FIRST**, before any client-side code
2. ✅ No JavaScript? Middleware still protects routes
3. ✅ Page never renders if access is denied

## Usage Guide

### Protecting a New Page

**Option 1: Let Middleware Handle It (Recommended)**

If your route is already in `ROUTE_PERMISSIONS`, you don't need to do anything! The middleware automatically protects it.

**Option 2: Add Client-Side Guard for Better UX**

```tsx
import { RouteGuard } from '@/components/auth/route-guard';

export default function MyProtectedPage() {
  return <RouteGuard>{/* Your page content */}</RouteGuard>;
}
```

### Adding a New Protected Route

1. **Add to `src/lib/route-permissions.ts`:**

```typescript
{
  pattern: '/dashboard/my-new-feature',
  allowedRoles: ['HRO', 'HHRMD'],
  description: 'My new feature',
}
```

2. **Update `middleware.ts`** (if using RegExp patterns):

```typescript
{
  pattern: /^\/dashboard\/my-new-feature/,
  allowedRoles: ['HRO', 'HHRMD'],
}
```

3. **That's it!** The route is now protected automatically.

### Conditionally Showing UI Elements

Use the `useCanAccessRoute` hook to conditionally show navigation items:

```tsx
import { useCanAccessRoute } from '@/hooks/use-route-guard';

function Navigation() {
  const canAccessAdmin = useCanAccessRoute('/dashboard/admin/users');

  return (
    <nav>
      {canAccessAdmin && (
        <Link href="/dashboard/admin/users">User Management</Link>
      )}
    </nav>
  );
}
```

## Security Best Practices

### ✅ DO

- ✅ Keep `ROUTE_PERMISSIONS` in sync between `middleware.ts` and `route-permissions.ts`
- ✅ Test new routes with different user roles
- ✅ Use the `RouteGuard` component for critical admin pages
- ✅ Always validate roles on the backend API as well
- ✅ Log unauthorized access attempts for security monitoring

### ❌ DON'T

- ❌ Rely solely on client-side checks
- ❌ Store sensitive role data only in localStorage
- ❌ Assume the cookie is secure - always validate on backend
- ❌ Hardcode role checks in components - use the centralized config

## Testing the Security

### Test Case 1: Unauthorized Route Access

1. Login as a DO user
2. Try to access: `https://test.zanajira.go.tz/dashboard/admin/institutions`
3. **Expected:** Redirected to dashboard with "Access Denied" error

### Test Case 2: Role Validation

1. Login as an EMPLOYEE user
2. Try to access: `/dashboard/promotion`
3. **Expected:** Redirected to dashboard with error (EMPLOYEE not in allowed roles)

### Test Case 3: Authorized Access

1. Login as Admin user
2. Access: `/dashboard/admin/users`
3. **Expected:** Page loads successfully

## Troubleshooting

### Issue: User can still access protected routes

**Check:**

1. Is the route listed in `ROUTE_PERMISSIONS`?
2. Is the middleware configured with the correct matcher?
3. Is the cookie being set properly? (Check browser DevTools → Application → Cookies)
4. Is the user's role correctly stored in the auth state?

### Issue: Cookie not being set

**Check:**

1. Login is calling `setAuthCookie()`
2. Browser is not blocking cookies
3. Cookie expiry is not in the past
4. SameSite attribute is compatible with your setup

### Issue: Middleware not running

**Check:**

1. `middleware.ts` is at the root of the project (not in `/src`)
2. The `matcher` config includes your route
3. Clear Next.js cache: `rm -rf .next`

## Migration Checklist

- [x] Created `middleware.ts` at project root
- [x] Created `src/lib/route-permissions.ts`
- [x] Updated `src/store/auth-store.ts` to set cookies
- [x] Created `src/hooks/use-route-guard.ts`
- [x] Created `src/components/auth/route-guard.tsx`
- [x] Updated `src/app/dashboard/page.tsx` to show unauthorized errors
- [x] Updated admin pages to use `RouteGuard` component
- [ ] Test all user roles against all protected routes
- [ ] Deploy and test in production environment

## Maintenance

### When Adding a New Role

1. Add to `src/lib/types.ts` `Role` type
2. Add to `src/lib/constants.ts` `ROLES` object
3. Update relevant routes in `ROUTE_PERMISSIONS`
4. Update middleware's ROLES constant

### When Adding a New Route

1. Add to `NAV_ITEMS` in `src/lib/navigation.ts`
2. Add to `ROUTE_PERMISSIONS` in `src/lib/route-permissions.ts`
3. Add to middleware's `ROUTE_PERMISSIONS`
4. Test with different user roles

## Security Notes

⚠️ **Important Security Considerations:**

1. **Cookies are NOT httpOnly** - They're set from client-side JavaScript. For maximum security, consider implementing a server-side session API route.

2. **Token validation** - The middleware validates the cookie, but the backend API should ALWAYS validate the JWT token.

3. **XSS Protection** - Sanitize all user inputs to prevent cookie theft via XSS attacks.

4. **HTTPS Only** - In production, ensure all traffic uses HTTPS to prevent cookie interception.

5. **Regular Audits** - Periodically review `ROUTE_PERMISSIONS` to ensure they match business requirements.

---

**Last Updated:** 2025-12-27
**Author:** Security Implementation Team
**Version:** 1.0
