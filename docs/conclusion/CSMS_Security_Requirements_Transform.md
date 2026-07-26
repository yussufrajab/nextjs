# CSMS Security Requirements → Developer-Implementable Specifications (All 30 Controls)

This document transforms all 30 security requirements from *Security_requirements_and_Controls.md* into developer-implementable specifications, in tabular form, that can be mapped directly to design, development, testing, and security assessment activities.

---

## Requirement 1: Authentication & Identity Assurance

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Multi-Factor Authentication (MFA) | Require a second verification factor for designated roles (e.g., Commission, Admin) | User ID, MFA method, MFA status | Server-side, on login |
| Strong Password Policy | Reject weak/common passwords | Password, policy rule set | Registration/reset API |
| Minimum Password Length | Enforce ≥ 12 characters | Password length | Registration/reset API |
| Password Complexity Enforcement | Require mix of upper/lower/number/symbol | Password | Registration/reset API |
| Password History | Prevent reuse of last 5 passwords | Password hash history | Reset API |
| Password Expiry | Force change every 90 days (configurable) | Last changed date | Login check |
| Account Lockout | Lock account after 5 failed attempts | Failed attempt counter, lockout timestamp | Login API |
| Login Attempt Rate Limiting | Throttle repeated attempts per IP/user | IP, User ID, attempt count | Login API / gateway |
| Secure Password Hashing (Argon2id) | Hash all passwords with Argon2id, unique salt | Password hash, salt | Storage layer |
| Secure Password Reset Process | Token-based reset, single-use, time-limited (≤15 min) | Reset token, expiry, User ID | Reset API |
| Generic Authentication Error Messages | Return identical error for invalid username/password | Error message | Login API |
| Failed Login Monitoring | Log and alert on repeated failures | User ID, IP, timestamp, count | Auth service |
| Reauthentication for High-Risk Actions | Require password/MFA re-entry before sensitive actions (e.g., termination approval) | User ID, action type, timestamp | Sensitive-action endpoints |

---

## Requirement 2: Session Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Session Timeout | Expire idle sessions after 15–30 min | Last activity timestamp | Middleware |
| Absolute Session Lifetime | Force re-login after 8–12 hrs regardless of activity | Session start timestamp | Middleware |
| Secure Session Identifiers | Use cryptographically random, HttpOnly, Secure, SameSite cookies | Session token | Session issuance |
| Session Invalidation on Logout | Destroy server-side session record immediately | Session ID | Logout API |
| Session Invalidation on Password Change | Invalidate all active sessions on password/role change | User ID, session list | Auth service |
| Server-Side Session Validation | Validate session against server store on every request | Session ID | Middleware |
| Concurrent Session Control | Limit or flag multiple simultaneous sessions per user | User ID, active session count | Auth service |
| Reauthentication for Sensitive Actions | Require fresh session token for high-risk operations | Session age, action type | Sensitive-action endpoints |

---

## Requirement 3: Authorization & Least Privilege

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Role-Based Access Control (RBAC) | Map every endpoint/action to allowed roles (HRO, HHRMD, HRMO, DO, CSCS, PO, Commission, Admin) | User role, permission matrix | Middleware/API layer |
| Least Privilege Enforcement | Grant only permissions required for role function | Role-permission map | Access control layer |
| Need-to-Know Access Control | Restrict data visibility to job function | Role, data classification | Query layer |
| Deny-by-Default Authorization | Reject any request without explicit permission match | Permission check result | Middleware |
| Server-Side Authorization Validation | Never trust client-side role claims | User ID, role (server-fetched) | API layer |
| Permission Validation on Every Request | Re-check permissions per request, not cached client-side | Session/User ID, endpoint, action | Middleware |

*(Note: This is the control area addressed by the recent RBAC work blocking HRO from Commission decision actions.)*

---

## Requirement 4: Institution Data Isolation

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Institution Ownership Validation | Confirm requested record belongs to user's institution | Institution ID, Record Institution ID | API layer |
| Institution-Based Access Control | Restrict CRUD operations to user's own institution scope | User Institution ID | Middleware |
| Institution Context Validation | Validate institution context passed matches session/user | Institution ID (session vs. request) | API layer |
| Institution Filtering in Queries | All DB queries auto-filter by institution ID | Institution ID | Data access layer (Prisma) |
| Institution Filtering in APIs | All API responses scoped to institution | Institution ID | API layer |
| Institution Filtering in Reports | Reports scoped to institution unless elevated role | Institution ID, Role | Reporting module |
| Institution Validation During Synchronization | Validate institution mapping during HRIMS sync | Institution ID, sync source | Sync service |

---

## Requirement 5: Employee Profile Protection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Object-Level Authorization | Verify user is authorized for the specific employee record | User ID, Employee ID | API layer |
| Employee Ownership Validation | Confirm employee belongs to user's institution | Employee ID, Institution ID | API layer |
| Profile Access Validation | Validate read access before returning profile data | User role, Employee ID | API layer |
| Record Update Authorization | Validate write permission before allowing update | User role, Employee ID, field(s) | Update API |
| Sensitive Field Protection | Mask/restrict fields (ZanID, ZSSF, payroll no.) by role | Field-level ACL | API/serialization layer |
| Access Logging | Log every profile view/edit with actor and target | User ID, Employee ID, action, timestamp | Audit service |
| Record Integrity Validation | Validate data consistency before persisting changes | Record hash/version | Update API |

---

## Requirement 6: Employee Creation Integrity

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Employee Creation Authorization | Restrict creation to authorized roles (HRO/Admin) | User role | Create API |
| Unique Payroll Number Validation | Reject duplicate payroll numbers | Payroll Number | Create API / DB constraint |
| Unique ZanID Validation | Reject duplicate ZanID | ZanID | Create API / DB constraint |
| Unique ZSSF Validation | Reject duplicate ZSSF number | ZSSF Number | Create API / DB constraint |
| Duplicate Detection | Fuzzy-match name/DOB/institution to flag possible duplicates | Name, DOB, Institution | Create API |
| Institution Validation | Confirm institution exists and is active | Institution ID | Create API |
| Audit Logging | Log creation event with full payload snapshot | User ID, Employee ID, timestamp | Audit service |
| Business Rule Validation | Enforce mandatory fields, valid enums, date logic | Field-level rules | Create API |

---

## Requirement 7: Bulk Upload Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Upload Authorization | Restrict bulk upload to authorized roles | User role | Upload API |
| File Type Validation | Accept only whitelisted types (.xlsx, .csv) | MIME type, extension | Upload API |
| File Size Validation | Reject files above configured limit (e.g., 10MB) | File size | Upload API |
| Duplicate Detection | Detect duplicate rows against existing DB records | Payroll No./ZanID/ZSSF | Import service |
| Employee Validation Rules | Apply same validation rules as single-entry creation | Row-level field rules | Import service |
| Institution Validation | Confirm all rows belong to uploader's institution | Institution ID per row | Import service |
| Import Audit Logging | Log batch ID, uploader, row counts, outcomes | Batch ID, User ID, success/fail counts, timestamp | Audit service |
| Import Error Handling | Return row-level error report without exposing internals | Row number, error reason | Import service |
| Transaction Integrity Validation | Wrap import in DB transaction; rollback on critical failure | Transaction ID | Import service |

---

## Requirement 8: Workflow Security & Approval Integrity

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Workflow State Validation | Validate current state before allowing transition | Workflow ID, current status | Workflow engine |
| Workflow Transition Validation | Allow only defined state-machine transitions | From-status, To-status | Workflow engine |
| Approval Authorization Checks | Verify approver role matches required approval stage | User role, Workflow stage | Approval API |
| Rejection Authorization Checks | Verify rejecting role is authorized at that stage | User role, Workflow stage | Rejection API |
| Workflow Ownership Validation | Confirm workflow belongs to user's institution/scope | Institution ID, Workflow ID | API layer |
| Workflow Chain Enforcement | Enforce sequential approval chain (HRO→HHRMD/HRMO→Commission) | Workflow chain definition | Workflow engine |
| Workflow Audit Logging | Log every submission/approval/rejection/forward | Workflow ID, prev/new status, User ID, timestamp | Audit service |
| Non-Repudiation Controls | Bind decision to authenticated user identity, immutable | User ID, decision, timestamp | Workflow engine |
| Business Rule Enforcement | Apply domain rules (e.g., no self-approval) | Rule set | Workflow engine |

---

## Requirement 9: Complaint Management Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Complaint Ownership Validation | Confirm requester owns or is authorized on complaint | User ID, Complaint ID | API layer |
| Complaint Access Control | Restrict complaint visibility to involved parties/roles | User role, Complaint ID | API layer |
| Complaint Authorization Checks | Validate permission before status change | User role, action | API layer |
| Complaint Status Validation | Enforce valid status transitions | Current status, new status | Workflow engine |
| Complaint Audit Logging | Log create/update/review/closure with actor | Complaint ID, User ID, action, timestamp | Audit service |
| Confidential Information Protection | Restrict complainant identity/details to authorized roles | Field-level ACL | API/serialization layer |
| Complaint Resolution Authorization | Restrict closure/resolution to designated roles | User role, Complaint ID | Resolution API |

---

## Requirement 10: File & Document Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| File Access Control | Verify permission before serving file | User role, File ID | Download API |
| File Ownership Validation | Confirm file belongs to accessible institution/record | File ID, Institution ID | Download API |
| Secure Download Authorization | Issue signed, time-limited URLs (MinIO presigned) | File ID, expiry | Download API |
| Document Authorization Checks | Validate document type-specific access rules | Document type, User role | API layer |
| File Type Validation | Restrict upload to whitelisted extensions/MIME types | MIME type | Upload API |
| File Integrity Validation | Verify checksum/hash on upload and retrieval | File hash | Storage layer |
| Malware Scanning | Scan uploaded files before storage | Scan result | Upload pipeline |
| File Audit Logging | Log upload/download/delete with actor | User ID, File ID, action, timestamp | Audit service |

---

## Requirement 11: HRIMS Integration Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Synchronization Authorization | Restrict sync trigger to authorized service accounts/roles | Service account ID/role | Sync API |
| Trusted Source Validation | Verify sync requests originate from whitelisted HRIMS endpoint | Source IP/cert, API key | Sync gateway |
| Employee Matching Validation | Match incoming records via unique identifiers only | ZanID/Payroll No. | Sync service |
| Duplicate Prevention | Reject/merge duplicate incoming records | Matching key | Sync service |
| Institution Validation | Confirm institution mapping validity | Institution ID | Sync service |
| Synchronization Audit Logging | Log every sync batch with outcome | Batch ID, timestamp, record counts | Audit service |
| Synchronization Failure Handling | Log and alert on failed sync, no partial silent writes | Error code, batch ID | Sync service |
| Data Integrity Validation | Validate incoming schema/field consistency before commit | Field-level rules | Sync service |

---

## Requirement 12: Reporting & Export Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Report Authorization | Restrict report generation to authorized roles | User role | Reporting API |
| Export Authorization | Restrict export actions to authorized roles | User role | Export API |
| Institution-Based Report Filtering | Auto-scope reports to user's institution unless elevated | Institution ID | Reporting module |
| Data Minimization | Exclude non-essential sensitive fields from reports by default | Field-level rules | Reporting module |
| Export Audit Logging | Log exporter, scope, timestamp, record count | User ID, export type, record count, timestamp | Audit service |
| Report Ownership Validation | Confirm requested report scope matches user's authority | Institution ID, Report scope | Reporting API |
| Restricted Data Export Controls | Block export of classified/restricted fields without approval | Data classification, User role | Export API |
| Export Approval Controls | Require secondary approval for bulk/sensitive exports | Approver ID, Export request ID | Export workflow |

---

## Requirement 13: Notification Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Recipient Validation | Verify recipient is authorized party before sending | Recipient User ID, context ID | Notification service |
| Notification Authorization | Restrict who can trigger notifications | User role | Notification API |
| Workflow Notification Controls | Send workflow updates only to involved parties | Workflow ID, participant list | Notification service |
| Complaint Notification Restrictions | Restrict complaint notification content/recipients | Complaint ID, recipient role | Notification service |
| Notification Audit Logging | Log notification sent, recipient, content type, timestamp | Notification ID, Recipient ID, timestamp | Audit service |
| Content Minimization | Exclude sensitive details from notification payloads | Field-level rules | Notification templates |

---

## Requirement 14: Administrative Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Administrative RBAC | Restrict admin functions to Admin role only | User role | Admin API |
| Privileged Access Control | Require elevated auth (MFA) for admin console | Admin User ID, MFA status | Admin login |
| User Management Authorization | Restrict user create/edit/deactivate to Admin | User role | User mgmt API |
| Role Assignment Authorization | Restrict role changes to Admin, log all changes | Admin ID, target User ID, old/new role | Role mgmt API |
| Institution Assignment Authorization | Restrict institution reassignment to Admin | Admin ID, User ID, Institution ID | Admin API |
| Configuration Change Authorization | Restrict system config changes to Admin | Admin ID, config key | Config API |
| Administrative Audit Logging | Log all admin actions with before/after values | Admin ID, action, prev/new value, timestamp | Audit service |
| Separation of Duties | Prevent single admin from both creating and approving critical changes | Role separation matrix | Admin workflow |

---

## Requirement 15: Audit Trail & Accountability
*(See full detail in transforms_security_requirements.md — summarized here for consistency)*

| Control | What the System Shall Do | Required Fields | Enforcement Point |
|---|---|---|---|
| Audit Logging (Auth/Workflow/Admin/Complaint) | Auto-log defined events per category | Actor, Action, Target, Timestamp | Audit service |
| Immutable / Append-Only Audit Logs | No edit/delete functionality exposed to any role | Audit Record ID | DB schema + API |
| Audit Log Retention | Retain per Government retention policy | Retention period | Audit storage policy |
| Audit Access Control | Restrict view/search/export to audit-review roles | User role | Audit API |
| Audit Integrity Validation | Detect/prevent tampering | Record hash/checksum | Audit storage |
| Change History Tracking | Store previous/new value on record changes | Prev value, New value, User ID, timestamp | Data layer triggers |
| Security Event Logging | Log denied access, auth failures, IDOR attempts, privilege escalation | Event type, User ID, timestamp, context | Security monitoring service |

---

## Requirement 16: Background Processing Security

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Job Authorization Validation | Verify job runs under authorized service context | Service/Job ID, permissions | Job scheduler |
| Job Ownership Validation | Confirm job operates only on its designated scope | Job ID, target record scope | Job execution layer |
| Job Audit Logging | Log job start, actions taken, completion status | Job ID, timestamp, outcome | Audit service |
| Duplicate Processing Prevention | Use idempotency keys to prevent reprocessing | Idempotency key, Job ID | Job queue |
| Retry Protection | Limit retries; log and alert on repeated failures | Retry count, Job ID | Job scheduler |
| Workflow Integrity Validation | Confirm background workflow actions follow same state rules as UI actions | Workflow ID, state | Job execution layer |
| Institution Context Validation | Preserve institution scoping in background operations | Institution ID | Job execution layer |

---

## Requirement 17: Direct Object Reference Protection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Object Ownership Validation | Confirm requesting user owns/has rights to referenced object | User ID, Object ID | API layer |
| Object-Level Authorization | Re-validate permission per object, not just endpoint | User role, Object ID | API layer |
| Resource Access Validation | Validate resource exists within user's authorized scope | Resource ID, scope | API layer |
| Secure Object References | Use non-sequential/UUID identifiers where feasible | Object ID format | Data model |
| Server-Side Identifier Validation | Never trust client-supplied IDs without server check | Object ID | API layer |
| Access Denial Logging | Log every denied object access attempt | User ID, Object ID, timestamp | Security monitoring service |

---

## Requirement 18: Workflow State Integrity

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| State Machine Enforcement | Implement explicit finite state machine for all workflows | State definitions, allowed transitions | Workflow engine |
| Transition Validation | Reject any transition not defined in state machine | From-state, To-state | Workflow engine |
| Status Change Authorization | Verify role authority for each transition | User role, transition type | Workflow engine |
| Workflow Ownership Validation | Confirm workflow instance belongs to actor's scope | Institution ID, Workflow ID | API layer |
| Workflow Audit Logging | Log every state change | Workflow ID, prev/new state, User ID, timestamp | Audit service |
| Workflow Integrity Checks | Periodically validate no orphaned/inconsistent workflow states | Workflow ID, state consistency check | Background job |

---

## Requirement 19: Non-Repudiation

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| User Attribution | Bind every action to authenticated User ID | User ID | API layer |
| Approval Attribution | Record approver identity on every approval decision | Approver ID, Workflow ID | Workflow engine |
| Decision Logging | Log decision rationale/comments where provided | Decision, comment, User ID, timestamp | Audit service |
| Timestamp Validation | Use server-generated timestamps only (never client-supplied) | Server timestamp | API layer |
| Change Tracking | Track all field-level changes with actor | Field, prev/new value, User ID | Data layer |
| Workflow Decision Audit Logging | Persist immutable record of every workflow decision | Workflow ID, Decision, User ID, timestamp | Audit service |

---

## Requirement 20: Data Integrity Protection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Input Validation | Validate/sanitize all input server-side (type, length, format) | Field-level schema | API layer |
| Business Rule Validation | Enforce domain logic (e.g., valid date ranges, enum values) | Rule set | API/service layer |
| Data Integrity Checks | Validate referential/foreign-key consistency before commit | Related record IDs | Data access layer |
| Record Consistency Validation | Detect conflicting concurrent updates (optimistic locking) | Record version/timestamp | Update API |
| Synchronization Validation | Validate integrity of data received via HRIMS sync | Field-level schema | Sync service |
| Referential Integrity Validation | Enforce DB-level FK constraints | Foreign keys | Database schema (Prisma/Postgres) |

---

## Requirement 21: Audit Log Protection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Append-Only Logging | Insert-only audit table; no UPDATE/DELETE grants | DB permissions | Database layer |
| Audit Record Tamper Protection | Use hash-chaining or checksums to detect tampering | Record hash, previous hash | Audit storage |
| Audit Deletion Prevention | No API or admin function permits deletion | N/A | API layer / DB permissions |
| Audit Modification Prevention | No API or admin function permits edits | N/A | API layer / DB permissions |
| Restricted Audit Access | Limit read access to designated audit-review roles | User role | Audit API |
| Audit Integrity Monitoring | Periodically verify hash chain / detect anomalies | Hash verification job | Background job |

---

## Requirement 22: Government Data Classification Enforcement

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Data Classification Labels | Tag fields/records with classification (Public/Internal/Confidential/Restricted) | Classification label | Data model |
| Classification-Based Authorization | Restrict access based on classification and role clearance | Classification, User role | API layer |
| Classification-Based Reporting Controls | Filter report content by classification | Classification, Report scope | Reporting module |
| Classification-Based Export Controls | Block/require approval for exporting classified data | Classification, User role | Export API |
| Classification-Based Audit Controls | Apply enhanced logging for access to classified data | Classification, User ID, timestamp | Audit service |

---

## Requirement 23: Restricted Government Data Protection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Enhanced Authorization Controls | Require additional role/clearance checks for Restricted data | User clearance, Data classification | API layer |
| Restricted Data Access Approval | Require explicit approval workflow before access is granted | Approval request ID, Approver ID | Access approval workflow |
| Enhanced Audit Logging | Log every access to restricted data with full context | User ID, Record ID, timestamp, justification | Audit service |
| Export Restrictions | Block direct export of restricted data without dual approval | Data classification, Approver IDs | Export API |
| Administrative Approval Controls | Require Admin sign-off for restricted-data access grants | Admin ID, Access request ID | Admin workflow |
| Security Monitoring and Alerting | Alert security team on restricted-data access patterns | Alert rule, User ID, timestamp | Security monitoring service |

---

## Requirement 24: Accountability & Traceability

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| User Attribution | Attach authenticated User ID to every transaction | User ID | API layer |
| Timestamp Recording | Record server-side timestamp on every transaction | Timestamp | API layer |
| Activity Logging | Log all significant user activity | User ID, Activity type, timestamp | Audit service |
| Transaction Logging | Log all data-modifying transactions | Transaction ID, User ID, timestamp | Audit service |
| Correlation IDs | Assign unique correlation ID per request for cross-service tracing | Correlation ID | API gateway/middleware |
| End-to-End Audit Trails | Ensure logs can be joined via correlation/workflow IDs to reconstruct full action chain | Correlation ID, Workflow ID | Audit service |

---

## Requirement 25: Separation of Duties

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Role Separation Controls | Prevent one role from both initiating and approving same action | Role definitions | Workflow engine |
| Administrative Segregation | Separate user-management admin from data/config admin functions | Admin sub-role | Admin RBAC |
| Approval Separation | Disallow self-approval of own submitted requests | Submitter ID vs. Approver ID | Workflow engine |
| Independent Verification Controls | Require second reviewer for critical actions (e.g., termination) | Reviewer ID ≠ Submitter ID | Workflow engine |
| Dual Authorization for Critical Actions | Require two distinct approvals for highest-risk actions | Approver 1 ID, Approver 2 ID | Workflow engine |

---

## Requirement 26: Security Monitoring & Detection

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Failed Login Monitoring | Track and alert on repeated failed logins | User ID/IP, failure count, timestamp | Auth service |
| Privilege Escalation Detection | Detect unauthorized attempts to access higher-privilege functions | User ID, attempted action, timestamp | Security monitoring service |
| Authorization Failure Monitoring | Log/alert on repeated 403 responses | User ID, endpoint, count | Middleware |
| IDOR Attempt Detection | Flag repeated access attempts to non-owned object IDs | User ID, Object ID pattern | Security monitoring service |
| Administrative Activity Monitoring | Monitor and alert on unusual admin activity | Admin ID, action, timestamp | Security monitoring service |
| Security Alerting | Trigger real-time alerts to security/ICT team on defined thresholds | Alert rule, severity, timestamp | Alerting pipeline |

---

## Requirement 27: Export & Data Extraction Control

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Export Authorization | Restrict export function to authorized roles | User role | Export API |
| Export Audit Logging | Log exporter, data scope, record count, timestamp | User ID, export type, record count, timestamp | Audit service |
| Restricted Data Export Controls | Block/require approval for classified data export | Classification, Approver ID | Export API |
| Data Minimization | Exclude unnecessary sensitive fields by default | Field-level rules | Export API |
| Export Approval Workflow | Require approval step for bulk/sensitive exports | Export request ID, Approver ID | Export workflow |
| Institution-Based Export Filtering | Scope exports to user's institution unless elevated role | Institution ID | Export API |

---

## Requirement 28: Administrative Change Control

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Configuration Change Authorization | Restrict system configuration changes to Admin role | User role | Config API |
| Change Approval Workflow | Require secondary approval for critical config changes | Change request ID, Approver ID | Config change workflow |
| Configuration Audit Logging | Log every config change with before/after values | Admin ID, config key, prev/new value, timestamp | Audit service |
| Change Tracking | Maintain versioned history of configuration changes | Config version, timestamp | Config data store |
| Configuration Integrity Validation | Validate config values against allowed schema before applying | Config key, value type/range | Config API |

---

## Requirement 29: Synchronization Accountability

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Synchronization Logging | Log every sync run (start, end, source) | Sync ID, source, start/end timestamp | Sync service |
| Synchronization Attribution | Record triggering service/user for each sync | Sync ID, Triggering actor | Sync service |
| Synchronization Result Tracking | Log record counts (created/updated/skipped/failed) | Sync ID, counts by outcome | Sync service |
| Failure Logging | Log detailed failure reason per failed record | Sync ID, Record ID, error reason | Sync service |
| Synchronization Audit Trails | Ensure sync logs are queryable/reviewable and immutable | Sync ID, Audit Record ID | Audit service |

---

## Requirement 30: Government Information Confidentiality

| Control | What the System Shall Do | Required Fields / Parameters | Enforcement Point |
|---|---|---|---|
| Need-to-Know Enforcement | Restrict data visibility strictly to job function requirement | User role, data scope | API layer |
| Least Privilege Enforcement | Grant minimum permission set required per role | Role-permission matrix | Access control layer |
| Data Access Authorization | Validate every data access request against permission model | User ID, Resource ID | API layer |
| Institution Isolation | Enforce strict institution-level data segregation | Institution ID | Data access layer |
| Confidential Data Protection | Encrypt/mask confidential fields at rest and in transit | Field-level encryption flags | Data model / transport layer (TLS) |
| Access Monitoring | Monitor and log access patterns to confidential information | User ID, Record ID, timestamp | Security monitoring service |

---

## Implementation Notes for CSMS Development Team

1. **Cross-cutting controls** (RBAC, institution filtering, audit logging, session validation) should be implemented as shared middleware/utility layers in the Next.js API routes rather than duplicated per endpoint.
2. **Audit tables** should be append-only at the database level (Postgres row-level permissions or trigger-based protection), not just enforced in application code.
3. **Prisma schema** should encode classification labels, institution IDs, and ownership fields consistently across all models to support the filtering/authorization controls above.
4. **UAT test cases** should be derived directly from each table row — each control becomes one or more testable acceptance criteria.
5. **Penetration testing** (Kali Linux automation) should specifically target: IDOR (Req 17), RBAC bypass (Req 3), institution isolation bypass (Req 4), and audit tampering (Req 21).
