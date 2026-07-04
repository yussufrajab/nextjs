# 36. Security Headers & Configurations

**Requirement:** CSMS Requirement 36 -- Security Headers & Configurations (Cross-cutting)
**Application:** CSMS (Next.js 14 full-stack) on http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Date:** 2026-07-03
**Tester:** Automated security audit

---

## Summary

| Sub-case | Description | Verdict |
|----------|-------------|---------|
| 36.1 | Content-Security-Policy (CSP) | WARN |
| 36.2 | X-Frame-Options | PASS |
| 36.3 | X-Content-Type-Options | PASS |
| 36.4 | Strict-Transport-Security (HSTS) | PASS |
| 36.5 | Referrer-Policy | PASS |
| 36.6 | Permissions-Policy | PASS |
| 36.7 | Cache-Control | WARN |
| 36.8 | Server Information | PASS |
| 36.9 | Cookie Security Flags | PASS |
| 36.10 | CORS Configuration | PASS |
| 36.11 | Security Headers Audit | PASS |
| 36.12 | Cookie Scope | PASS |

**Overall: 10 PASS, 2 WARN, 0 FAIL**

---

## Methodology

Headers were tested using `curl -s -D -` against the running Next.js application at `http://localhost:9002`. Cookie flags were inspected from `Set-Cookie` headers returned by the `/api/auth/login` endpoint. Source code was reviewed for `next.config.ts`, `middleware.ts`, `src/lib/session-manager.ts`, `src/lib/csrf-utils.ts`, `src/lib/csp.ts`, and `src/app/api/external/employees/route.ts`.

---

## 36.1 Content-Security-Policy (CSP)

**Verdict: WARN**

### Observed Header

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; report-uri /api/csp-report;
```

### Analysis

**Positive:**
- `default-src 'self'` -- restrictive default.
- `object-src 'none'` -- blocks Flash/plugin content.
- `base-uri 'self'` -- prevents base-tag injection.
- `form-action 'self'` -- restricts form submission targets.
- `frame-ancestors 'self'` -- prevents clickjacking (complements X-Frame-Options).
- `upgrade-insecure-requests` -- forces HTTPS for sub-resources.
- `report-uri /api/csp-report` -- violation reporting endpoint configured.

**Finding (LOW):**
- `script-src` and `style-src` use `'unsafe-inline'`, which weakens XSS protection. A nonce-based CSP utility exists at `src/lib/csp.ts` (`generateNonce()` / `getCspHeaders(nonce)`) but is not wired into the static header configuration in `next.config.ts`. The config comment acknowledges this: *"Uses 'unsafe-inline' as a fallback for Next.js compatibility."*

**Recommendation:** Wire the nonce-based CSP from `src/lib/csp.ts` into middleware or layout-level response headers to eliminate `'unsafe-inline'` from `script-src` and `style-src`.

---

## 36.2 X-Frame-Options

**Verdict: PASS**

### Observed Header

```
X-Frame-Options: SAMEORIGIN
```

### Analysis

The header is set to `SAMEORIGIN`, which prevents the application from being embedded in frames on external domains (clickjacking defense). This is configured in `next.config.ts` line 93. The CSP `frame-ancestors 'self'` directive provides a complementary, more modern defense.

---

## 36.3 X-Content-Type-Options

**Verdict: PASS**

### Observed Header

```
X-Content-Type-Options: nosniff
```

### Analysis

The `nosniff` value prevents browsers from MIME-type sniffing, which can lead to security vulnerabilities when content is served with incorrect Content-Type headers. Configured in `next.config.ts` line 97.

---

## 36.4 Strict-Transport-Security (HSTS)

**Verdict: PASS**

### Observed Header

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Analysis

- `max-age=63072000` (2 years) exceeds the minimum requirement of 31536000 (1 year).
- `includeSubDomains` ensures all subdomains are covered.
- `preload` qualifies for browser HSTS preload lists.

Configuration in `next.config.ts` lines 87-89 sets 2-year max-age in production and `max-age=0` in development (disabled for local HTTP testing).

---

## 36.5 Referrer-Policy

**Verdict: PASS**

### Observed Header

```
Referrer-Policy: strict-origin-when-cross-origin
```

### Analysis

This policy sends the full URL for same-origin requests but only the origin for cross-origin requests, and sends nothing when downgrading from HTTPS to HTTP. This is a restrictive, privacy-respecting policy. Configured in `next.config.ts` line 105.

---

## 36.6 Permissions-Policy

**Verdict: PASS**

### Observed Header

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

### Analysis

All unnecessary browser features are disabled:
- `camera=()` -- no camera access
- `microphone=()` -- no microphone access
- `geolocation=()` -- no geolocation access
- `interest-cohort=()` -- opts out of FLoC/Topics API

Configured in `next.config.ts` line 109.

---

## 36.7 Cache-Control

**Verdict: WARN**

### Observed Headers

| Page | Cache-Control |
|------|--------------|
| `/login` | `s-maxage=31536000` |
| `/dashboard` | `s-maxage=31536000` |
| `/dashboard/promotion` | `s-maxage=31536000` |
| `/dashboard/add-employee` | `no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` (set by middleware) |
| `/api/auth/me` | (none -- no Cache-Control header) |

### Analysis

**Positive:**
- The `/dashboard/add-employee` page explicitly sets `no-store` via middleware (`middleware.ts` line 369).
- API endpoints like `/api/auth/me` do not set caching headers, which means they default to no explicit caching.

**Finding (MEDIUM):**
- Most dashboard pages (e.g., `/dashboard`, `/dashboard/promotion`) return `s-maxage=31536000` (1-year CDN cache). This is Next.js's default for statically rendered pages. While the CDN cache directive (`s-maxage`) does not affect browser caching the same way `max-age` does, sensitive authenticated pages should ideally set `Cache-Control: no-store` to prevent any intermediary caching of user-specific content. The middleware only applies no-cache headers to the `/dashboard/add-employee` route.

**Recommendation:** Extend the middleware no-cache logic (currently at `middleware.ts` line 367-373) to cover all `/dashboard/*` routes, or set `Cache-Control: no-store` at the layout level for authenticated pages.

---

## 36.8 Server Information Disclosure

**Verdict: PASS**

### Observations

- **X-Powered-By header:** Not present. Disabled via `poweredByHeader: false` in `next.config.ts` line 12.
- **Server header:** Not present. Next.js does not emit a `Server` header by default.

### Analysis

No server technology or version information is leaked in response headers. This prevents attackers from fingerprinting the server stack.

---

## 36.9 Cookie Security Flags

**Verdict: PASS**

### Cookies Observed

**`pre-session` cookie (from `/api/auth/login`):**
```
Set-Cookie: pre-session=<token>; Path=/; Expires=Fri, 03 Jul 2026 19:32:24 GMT; Max-Age=900; Secure; HttpOnly; SameSite=strict
```

**`session` cookie (from code review of `getSessionCookieOptions` in `src/lib/session-manager.ts`):**
```
httpOnly: true
secure: isProduction  (true in production, false in dev for HTTP testing)
sameSite: 'strict'
path: '/'
maxAge: 86400  (24 hours)
```

**`csrf-token` cookie (from code review of `getCSRFCookieOptions` in `src/lib/csrf-utils.ts`):**
```
httpOnly: false  (intentional: JS must read it for double-submit pattern)
secure: isProduction
sameSite: 'strict'
path: '/'
maxAge: 604800  (7 days)
```

### Analysis

| Cookie | Secure | HttpOnly | SameSite | Notes |
|--------|--------|----------|----------|-------|
| `session` | Production only | Yes | strict | HMAC-signed, 24h expiry |
| `pre-session` | Production only | Yes | strict | Session fixation protection, 15min |
| `csrf-token` | Production only | **No** (by design) | strict | Double-submit pattern requires JS access |

- `session` and `pre-session` cookies are fully protected with HttpOnly, Secure, and SameSite=strict.
- `csrf-token` is intentionally not HttpOnly because the double-submit CSRF pattern requires JavaScript to read the cookie value and send it in the `x-csrf-token` header. The token is HMAC-signed (`src/lib/csrf-utils.ts` line 44) to prevent forgery.
- `Secure` flag is correctly set to `true` in production and `false` in development (for HTTP localhost testing). This is appropriate.

---

## 36.10 CORS Configuration

**Verdict: PASS**

### Tests Performed

**Test 1: OPTIONS preflight with evil origin on `/api/auth/me`:**
```bash
curl -X OPTIONS http://localhost:9002/api/auth/me \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET"
```
Result: `204 No Content` -- No `Access-Control-Allow-Origin` header returned.

**Test 2: OPTIONS preflight with legitimate origin on `/api/auth/me`:**
```bash
curl -X OPTIONS http://localhost:9002/api/auth/me \
  -H "Origin: http://localhost:9002" \
  -H "Access-Control-Request-Method: GET"
```
Result: `204 No Content` -- No `Access-Control-Allow-Origin` header returned.

**Test 3: OPTIONS preflight on `/api/external/employees` with evil origin:**
```bash
curl -X OPTIONS http://localhost:9002/api/external/employees \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST"
```
Result: `200 OK` -- `Access-Control-Allow-Origin` not present (empty string from `ALLOWED_ORIGINS` env).

### Analysis

- Internal API routes (`/api/auth/*`, `/api/*`) do not set any CORS headers, so cross-origin requests are blocked by the browser's same-origin policy.
- The external API route (`/api/external/employees`) uses an origin allowlist from the `ALLOWED_ORIGINS` environment variable (`src/app/api/external/employees/route.ts` line 7-9). When the requesting origin is not in the allowlist, `Access-Control-Allow-Origin` is not set (empty string).
- `allowedDevOrigins` in `next.config.ts` is set to `['csms.zanajira.go.tz']` for development server access.

No wildcard (`*`) CORS origins are used anywhere in the codebase.

---

## 36.11 Security Headers Audit (Completeness)

**Verdict: PASS**

### Full Header Inventory

All security headers are consistently present across all tested endpoints (login page, root page, API endpoints):

| Header | Present | Value |
|--------|---------|-------|
| Content-Security-Policy | Yes | Restrictive policy (see 36.1) |
| X-Frame-Options | Yes | SAMEORIGIN |
| X-Content-Type-Options | Yes | nosniff |
| Strict-Transport-Security | Yes | max-age=63072000; includeSubDomains; preload |
| Referrer-Policy | Yes | strict-origin-when-cross-origin |
| Permissions-Policy | Yes | camera=(), microphone=(), geolocation=(), interest-cohort=() |
| X-XSS-Protection | Yes | 1; mode=block (legacy, but present) |
| X-DNS-Prefetch-Control | Yes | on |
| X-Permitted-Cross-Domain-Policies | Yes | none |
| Cross-Origin-Embedder-Policy | Yes | require-corp |
| Cross-Origin-Opener-Policy | Yes | same-origin |
| Cross-Origin-Resource-Policy | Yes | same-origin |
| X-Powered-By | Absent | Correctly disabled |

All headers are configured in `next.config.ts` `headers()` function (lines 51-133) and applied to all routes via the `/:path*` source pattern. Headers are consistently present on both HTML pages and API responses.

---

## 36.12 Cookie Scope

**Verdict: PASS**

### Analysis

| Cookie | Path | Domain | SameSite | Scope Assessment |
|--------|------|--------|----------|-----------------|
| `session` | `/` | (not set -- current host) | strict | Correctly scoped to application root |
| `pre-session` | `/` | (not set -- current host) | strict | Correctly scoped to application root |
| `csrf-token` | `/` | (not set -- current host) | strict | Correctly scoped to application root |

- All cookies use `path: '/'`, making them available across the entire application but not leaking to other applications on the same domain.
- No explicit `Domain` attribute is set, so cookies are scoped to the exact host only (not subdomains). This is the most restrictive scope.
- `SameSite: 'strict'` on all cookies prevents them from being sent on cross-site requests, providing defense against CSRF.
- Cookie paths and scoping are configured in `src/lib/session-manager.ts` and `src/lib/csrf-utils.ts`.

---

## Files Examined

- `/home/latest/next.config.ts` -- Security headers configuration, `poweredByHeader: false`, `allowedDevOrigins`
- `/home/latest/middleware.ts` -- Route protection, no-cache headers for `/dashboard/add-employee`
- `/home/latest/src/lib/session-manager.ts` -- Session cookie options (`getSessionCookieOptions`, `getPreSessionCookieOptions`)
- `/home/latest/src/lib/csrf-utils.ts` -- CSRF cookie options, double-submit pattern
- `/home/latest/src/lib/csp.ts` -- Nonce-based CSP utility (exists but not wired into static config)
- `/home/latest/src/app/api/external/employees/route.ts` -- CORS origin allowlist for external API

---

## Recommendations

1. **36.1 (LOW):** Wire the nonce-based CSP from `src/lib/csp.ts` into middleware response headers to eliminate `'unsafe-inline'` from `script-src` and `style-src`. This strengthens XSS protection without breaking Next.js compatibility.

2. **36.7 (MEDIUM):** Extend the no-cache middleware logic to all `/dashboard/*` routes, not just `/dashboard/add-employee`. Authenticated pages containing user-specific data should not be cached by CDNs or intermediary proxies. Alternatively, configure `dynamic = 'force-dynamic'` or set `Cache-Control: no-store` at the layout level for authenticated routes.
