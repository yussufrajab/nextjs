# CSMS Workflow Diagrams

## Table of Contents

1. [Confirmation Module Workflow](#1-confirmation-module-workflow)
2. [Complaints Module Workflow](#2-complaints-module-workflow)

---

## 1. Confirmation Module Workflow

The Confirmation module handles the process of confirming civil service employees after their probation period.

### Roles Involved

| Role | Full Name | Responsibilities |
|------|-----------|------------------|
| **HRO** | Human Resource Officer | Initiates requests, corrects rejected requests |
| **HRRP** | Human Resource Responsible Personnel | First reviewer, forwards to commission or rejects |
| **HHRMD** | Head of HR Management Division | Commission-level reviewer, final decision |
| **HRMO** | HR Management Officer | Commission-level reviewer, final decision |
| **CSCS** | Civil Service Commission Secretary | Read-only visibility |

### Workflow Diagram

```mermaid
flowchart TB
    subgraph submission ["📝 Initial Submission"]
        A[HRO or HRRP initiates<br>confirmation request]
    end

    subgraph hrrp_review ["👤 HRRP Review Stage"]
        B[Pending HRRP Review]
        C{HRRP Decision}
    end

    subgraph commission_review ["🏛️ Commission Review Stage"]
        D[Approved by HRRP<br>Awaiting Commission Review]
        E[HHRMD/HRMO Reviews]
        F{Commission<br>Officer Decision}
    end

    subgraph final_decision ["⚖️ Final Commission Decision"]
        G[Approved by Officer<br>Awaiting Commission Decision]
        H{Commission<br>Final Decision}
    end

    subgraph correction ["🔄 Correction Loop"]
        I[Rejected -<br>Awaiting HRO Correction]
        J[HRO corrects<br>& resubmits]
    end

    subgraph terminal ["✅ Terminal States"]
        K["Approved by Commission ✓<br><i>Employee status → Confirmed</i>"]
        L["Rejected by Commission ✗<br><i>Request Concluded</i>"]
    end

    A -->|HRO submits| B
    A -->|HRRP submits directly| D
    B --> C

    C -->|Approve & Forward| D
    C -->|Reject| I

    D --> E
    E --> F

    F -->|Forward| G
    F -->|Reject| I

    G --> H
    H -->|Approve| K
    H -->|Reject| L

    I --> J
    J -->|Resubmit| B

    style K fill:#10b981,stroke:#059669,color:#fff
    style L fill:#ef4444,stroke:#dc2626,color:#fff
    style I fill:#f59e0b,stroke:#d97706,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,color:#fff
    style D fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style G fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

### Status Transitions Table

| From Status | Trigger | To Status | Review Stage |
|-------------|---------|-----------|--------------|
| *(new)* | HRO submits | Pending HRRP Review | initial |
| *(new)* | HRRP submits directly | Approved by HRRP - Awaiting Commission Review | hrrp_review |
| Pending HRRP Review | HRRP approves | Approved by HRRP - Awaiting Commission Review | hrrp_review |
| Pending HRRP Review | HRRP rejects | Rejected by HRRP - Awaiting HRO Correction | initial |
| Approved by HRRP... | HHRMD/HRMO forwards | Approved by {role} - Awaiting Commission Decision | commission_review |
| Approved by HRRP... | HHRMD/HRMO rejects | Rejected by {role} - Awaiting HRO Correction | initial |
| Approved by {role}... | Commission approves | **Approved by Commission** | completed |
| Approved by {role}... | Commission rejects | **Rejected by Commission - Request Concluded** | completed |
| Rejected... Awaiting HRO | HRO resubmits | Pending HRRP Review | initial |

### Required Documents

- Evaluation Form (PDF)
- Letter of Request (PDF)
- IPA Certificate (PDF) - required if employee hired after May 1, 2014

### Validation Rules

- **Blocked** for employees with status: On LWOP, Retired, Resigned, Terminated, Dismissed
- **Allowed** for employees with status: On Probation (normal case)
- Duplicate pending requests for the same employee are blocked

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/confirmations` | GET | List requests (paginated, filtered by role/institution) |
| `/api/confirmations` | POST | Create new confirmation request |
| `/api/confirmations` | PATCH | Approve, reject, or resubmit |

---

## 2. Complaints Module Workflow

The Complaints module allows civil service employees to file complaints and track their resolution through a multi-stage review process.

### Roles Involved

| Role | Full Name | Responsibilities |
|------|-----------|------------------|
| **EMPLOYEE** | Employee/Complainant | Files complaints, provides additional info, confirms resolution |
| **DO** | Disciplinary Officer | Reviews and resolves complaints |
| **HHRMD** | Head of HR Management Department | Reviews and resolves complaints |
| **CSCS** | Civil Service Commission Secretary | Handles appeals, makes commission decisions |

### Workflow Diagram

```mermaid
flowchart TB
    subgraph filing ["📝 Complaint Filing"]
        A[Employee files complaint]
        B[AI rewrites complaint text]
        C[MFA verification via<br>magic link email]
    end

    subgraph initial_review ["👁️ Initial Review"]
        D[Submitted]
        E["lalamiko lako limepokelewa<br><i>(complaint received, being processed)</i>"]
        F{DO/HHRMD<br>Decision}
    end

    subgraph info_request ["❓ Additional Information"]
        G[Awaiting More Information]
        H[Employee provides<br>additional info]
        I["Under Review -<br>Additional Information Provided"]
    end

    subgraph resolution ["✅ Resolution Path"]
        J[Resolved - Pending<br>Employee Confirmation]
        K{Employee<br>Decision}
    end

    subgraph rejection ["❌ Rejection Path"]
        L["Rejected by DO/HHRMD -<br>Waiting submitter reaction"]
        M[Employee edits<br>& resubmits]
    end

    subgraph commission ["🏛️ Commission Appeal"]
        N[Appealed to Commission]
        O[CSCS Reviews<br>& Decides]
        P{Commission<br>Decision}
    end

    subgraph terminal_states ["📊 Terminal States"]
        Q["Mtumishi ameridhika<br>na hatua ✓<br><i>(Employee satisfied)</i>"]
        R["Closed - Commission<br>Decision (Resolved) ✓"]
        S["Closed - Commission<br>Decision (Rejected) ✗"]
    end

    A --> B
    B --> C
    C -->|Verified| D
    D -->|Officer opens| E
    E --> F

    F -->|Request More Info| G
    G -->|Employee responds| H
    H --> I
    I -->|Back to review| E

    F -->|Resolve| J
    J --> K
    K -->|Satisfied| Q
    K -->|Not satisfied| N

    F -->|Reject| L
    L -->|Edit & Resubmit| M
    M -->|Resubmit| D

    N --> O
    O --> P
    P -->|Resolved| R
    P -->|Rejected| S

    style Q fill:#10b981,stroke:#059669,color:#fff
    style R fill:#10b981,stroke:#059669,color:#fff
    style S fill:#ef4444,stroke:#dc2626,color:#fff
    style D fill:#3b82f6,stroke:#2563eb,color:#fff
    style E fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style J fill:#f59e0b,stroke:#d97706,color:#fff
    style L fill:#f59e0b,stroke:#d97706,color:#fff
    style N fill:#ec4899,stroke:#db2777,color:#fff
```

### Status Transitions Table

| From Status | Trigger | To Status | Review Stage |
|-------------|---------|-----------|--------------|
| *(new)* | MFA verified, complaint created | Submitted | initial |
| Submitted | Officer opens details | lalamiko lako limepokelewa, linafanyiwa kazi | initial |
| lalamiko lako... | Officer resolves | Resolved - Pending Employee Confirmation | completed |
| lalamiko lako... | Officer requests info | Awaiting More Information | completed |
| lalamiko lako... | Officer rejects | Rejected by DO/HHRMD - Waiting submitter reaction | initial |
| Awaiting More Information | Employee provides info | Under Review - Additional Information Provided | initial |
| Resolved - Pending... | Employee satisfied | **Mtumishi ameridhika na hatua** | completed |
| Resolved - Pending... | Employee appeals | Appealed to Commission | final_decision |
| Rejected by DO/HHRMD... | Employee resubmits | Submitted | initial |
| Appealed to Commission | Commission resolves | **Closed - Commission Decision (Resolved)** | final_decision |
| Appealed to Commission | Commission rejects | **Closed - Commission Decision (Rejected)** | final_decision |

### Complaint Filing Requirements

- Government email domain required (`.go.tz` or `.ac.tz`)
- AI text rewriting is mandatory before submission
- MFA verification via magic link is required
- Optional PDF attachments

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/complaints` | GET | List complaints (role-based filtering, pagination) |
| `/api/complaints` | POST | Create complaint (direct, non-MFA path) |
| `/api/complaints/[id]` | PUT | Update complaint status, comments, attachments |
| `/api/complaints/mfa-initiate` | POST | Send magic link email for MFA |
| `/api/complaints/magic-link-verify` | POST | Verify magic link and create complaint |

### Filtering Status Groups

| Group | Included Statuses |
|-------|-------------------|
| **Closed** | Closed - Satisfied, Mtumishi ameridhika na hatua, Closed - Commission Decision (Resolved), Closed - Commission Decision (Rejected) |
| **Resolved** | Closed - Satisfied, Mtumishi ameridhika na hatua, Closed - Commission Decision (Resolved) |
| **Rejected** | Closed - Commission Decision (Rejected) |

---

*Document generated: 2026-05-29*
