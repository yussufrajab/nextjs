# Requirement 27: Export & Data Extraction Control — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 27)

---

## Test Case No.: 27 — Requirement 27: Export & Data Extraction Control

**Process/Function Name:** Government Employee Data Extraction Protection

**Function Description:** Tests prevention of unauthorized extraction of government employee information.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 27.1 | Export Authorization | 1. Unauthorized export<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed | ❌ Not implemented | N/A — Export routes not implemented. CSV export exists for audit trail only (Admin/CSCS). | N/A | Implement export routes |
| 27.2 | Export Audit Logging | 1. Export data<br>2. Check audit | - Export logged<br>- User, data, timestamp | ❌ Not implemented | N/A — Export audit logging not implemented | N/A | Implement export audit |
| 27.3 | Restricted Data Export Controls | 1. Export restricted data<br>2. Check controls | - Restricted blocked/limited<br>- Approval required | ❌ Not implemented | N/A — Restricted data export controls not implemented | N/A | Implement restricted export controls |
| 27.4 | Data Minimization on Export | 1. Export data<br>2. Check minimization | - Only necessary data<br>- Minimization practiced | ❌ Not implemented | N/A — Data minimization on export not implemented | N/A | Implement data minimization |
| 27.5 | Export Approval Workflow | 1. Request export<br>2. Verify workflow | - Approval workflow<br>- Required for sensitive | ❌ Not implemented | N/A — Export approval workflow not implemented | N/A | Implement export approval |
| 27.6 | Institution-Based Export Filtering | 1. HRO exports<br>2. Check filter | - Export scoped to institution<br>- No cross-institution | ❌ Not implemented | N/A — Institution-based export filtering not implemented | N/A | Implement institution-based export filtering |

---

## Summary Matrix

**Overall: 0 PASS, 0 PARTIAL, 0 FAIL, 6 N/A**

## Recommendations

- Implement when export routes are built
- Include authorization, audit logging, and institution filtering in the export specification
- Note: CSV export for audit trail already exists and is access-controlled (Admin/CSCS only)
- Design export approval workflow for sensitive data from the start
