# Security Remediation Continuation Prompt

## Copy this entire prompt into a new Claude Code session to continue fixing remaining security findings.

---

## Task

Fix all failed security tests from the UAT security review for the CSMS (Civil Service Management System). The security findings are in `/home/latest/docs/security/findings/`. Requirements 1–10 have already been remediated. You need to continue with requirements **11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30** and the technical security requirements **31–38**.

After fixing each requirement, update the UAT document at `/home/latest/docs/security/findings/UAT_Security_review_By_AMINA (1).md` with a remediation status section.

---

## How to Work

1. Read each finding file: `/home/latest/docs/security/findings/<number>-<name>.md`
2. For each FAIL or PARTIAL finding, identify the affected source files
3. Read the source files to understand the current implementation
4. Apply fixes following the established patterns (see below)
5. Run `npx tsc --noEmit --pretty` after each batch to verify no type errors
6. Run `npm run build` to verify build succeeds
7. After fixing each requirement, append a remediation table to the UAT document

---

## Already Fixed (Requirements 3–10)

Do NOT re-fix these. They are already done:

- **Req 3**: Authorization & Least Privilege — all PATCH handlers have institution ownership checks, all unprotected endpoints have `withAuth()`
- **Req 4**: Institution Data Isolation — employee list override fixed, reports filtering fixed, HRIMS auth added, credentials masked
- **Req 5**: Employee Profile Protection — `sanitizeEmployee()` created for field masking, auth added to validate/email-check endpoints, fetch-documents ownership check added
- **Req 6**: Employee Creation Integrity — ZSSF uniqueness checks added, date/name/ZAN ID validation added to manual-entry and bulk-upload
- **Req 7**: Bulk Upload Security — Admin role fix, ZSSF DB check, audit logging, transaction wrapping
- **Req 8**: Workflow Security — rejection reason enforcement, GET role restriction, reviewStage server-controlled
- **Req 9**: Complaint Management — PUT auth rewrite with role-based access, status transitions, XSS sanitization
- **Req 10**: File & Document Security — download/preview path traversal validation

---

## Established Fix Patterns

### Adding Authentication
```typescript
import { withAuth } from '@/lib/api-auth';
import { wrapHandler } from '@/lib/error-handler';

// Option A: wrapHandler + withAuth (preferred for new endpoints)
export const GET = wrapHandler(withAuth(async (req, { auth }) => {
  // handler body
}, { allowedRoles: ['Admin', 'HRO'] }), 'endpoint-name');

// Option B: verifyAuth inline (for existing handlers that need params)
export const PUT = wrapHandler(async (req, { params }) => {
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) return authResult.response!;
  const auth = authResult.context!;
  // handler body
}, 'endpoint-name');
```

### Adding Institution Ownership Check
```typescript
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

// After fetching the existing request with Employee include:
const existing = await db.someRequest.findUnique({
  where: { id },
  include: { Employee: { select: { id: true, institutionId: true } } },
});

if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
  if (!existing.Employee || existing.Employee.institutionId !== auth.institutionId) {
    return NextResponse.json(
      { success: false, message: 'Access denied: request belongs to a different institution' },
      { status: 403 }
    );
  }
}
```

### Adding Employee Field Masking
```typescript
import { sanitizeEmployee, sanitizeEmployees } from '@/lib/sanitize-response';

// Wrap response data:
const masked = sanitizeEmployee(employeeData, auth.role);
const maskedList = sanitizeEmployees(employeeArray, auth.role);
```

### Adding XSS Sanitization
```typescript
import { sanitizeText } from '@/lib/sanitize-input';

// Apply to user-supplied text fields before storing:
const clean = sanitizeText(userInput);
```

### Adding Rejection Reason Enforcement
```typescript
if (validatedData.status?.toLowerCase().includes('rejected') && !validatedData.rejectionReason) {
  return NextResponse.json(
    { success: false, message: 'Rejection reason is required when rejecting a request' },
    { status: 400 }
  );
}
```

### Adding Path Traversal Validation
```typescript
if (objectKey.includes('..') || objectKey.includes('\0') || objectKey.startsWith('/')) {
  return NextResponse.json(
    { success: false, message: 'Invalid file path' },
    { status: 400 }
  );
}
```

### Role-Based Access Control
```typescript
// CSC roles (full access): 'HHRMD', 'HRMO', 'DO', 'PO', 'CSCS'
// Institution-scoped: 'HRO', 'HRRP'
// Self-only: 'EMPLOYEE'
// Admin is for system admin only, NOT data access

const PRIVILEGED_ROLES = ['ADMIN', 'HRO', 'HRRP', 'HHRMD', 'HRMO', 'CSCS', 'DO', 'PO'];
```

---

## Key Source Files Reference

| Area | File |
|------|------|
| Auth wrapper | `src/lib/api-auth.ts` — `verifyAuth()`, `withAuth()`, `AuthContext` |
| Role utils | `src/lib/role-utils.ts` — `shouldApplyInstitutionFilter()`, `isCSCRole()`, `CSC_ROLES` |
| Sanitize response | `src/lib/sanitize-response.ts` — `sanitizeEmployee()`, `sanitizeUser()` |
| Sanitize input | `src/lib/sanitize-input.ts` — `sanitizeText()`, `sanitizeRichText()` |
| Audit logger | `src/lib/audit-logger.ts` — `logEmployeeAction()`, `logFileAction()`, `logComplaintAction()`, `logRequestApproval()` |
| Error handler | `src/lib/error-handler.ts` — `wrapHandler()` |
| Rate limiter | `src/lib/rate-limiter.ts` — `withRateLimit()`, `checkRateLimit()` |
| File validation | `src/lib/file-validation.ts` — `validateFileUpload()` |
| HRIMS config | `src/lib/hrims-config.ts` — `getHrimsConfig()`, `getHrimsApiConfig()` |
| Session manager | `src/lib/session-manager.ts` — `validateSession()`, `verifySessionToken()` |
| Constants | `src/lib/constants.ts` — `ROLES` |
| DB client | `src/lib/db.ts` — Prisma client |

---

## Remaining Finding Files to Fix (in order)

```
11-hrims-integration-security.md
12-reporting-export-security.md
13-notification-security.md
14-administrative-security.md
15-audit-trail-accountability.md
16-background-processing-security.md
17-idor-protection.md
18-workflow-state-integrity.md
19-non-repudiation.md
20-data-integrity-protection.md
21-audit-log-protection.md
22-data-classification-enforcement.md
23-restricted-data-protection.md
24-accountability-traceability.md
25-separation-of-duties.md
26-security-monitoring-detection.md
27-export-data-extraction-control.md
28-administrative-change-control.md
29-synchronization-accountability.md
30-government-information-confidentiality.md
31-injection-prevention.md
32-csrf-protection.md
33-password-cryptography.md
34-api-security-rate-limiting.md
35-error-handling.md
36-security-headers.md
37-network-security.md
38-penetration-testing.md
```

---

## UAT Document Update Format

After fixing each requirement, append to `/home/latest/docs/security/findings/UAT_Security_review_By_AMINA (1).md` before the "Overall Remediation Summary" section using this format:

```markdown
### Requirement N: <Title> — Remediated

| Vuln ID | Original Finding | Remediation | Status |
|---------|-----------------|-------------|--------|
| XX-01 | Description | What was done | ✅ Fixed / ✅ Already Fixed / ⚠️ Partial |

**Files Modified:**
- `path/to/file.ts` — Description of change
```

Then update the "Overall Remediation Summary" table to include the new requirement row.

---

## Test Environment

| Role | Username | Institution | Institution ID |
|------|----------|-------------|----------------|
| Admin | `ymrajab` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| HRO | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| HRO (Inst B) | `lela` | Baraza la Mitihani | `cmd1545dfaf1f7a12e14814` |
| HHRMD | `skhamis` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| HRMO | `fiddi` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| EMPLOYEE | `abdillahomarnajim` | Wakala wa Majengo Zanzibar | — |

All passwords: `Csms@2026`
MFA: OTP stored in `MfaToken` database table — query directly after triggering login.

---

## Important Notes

- The project is a Next.js 14 full-stack app (port 9002)
- Database: PostgreSQL with Prisma ORM
- Path alias: `@/*` maps to `./src/*`
- `npm run build` to verify, `npx tsc --noEmit` for type checking
- Many HRIMS endpoints were already secured in earlier batches — check before re-applying auth
- The `withAuth()` wrapper handles CSRF validation for state-changing methods automatically
- `wrapHandler()` is the error boundary — always wrap route handlers with it
- Use `allowedRoles` in `withAuth()` for role restriction (case-insensitive comparison)
