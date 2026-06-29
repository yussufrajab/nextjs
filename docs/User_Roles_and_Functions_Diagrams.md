# CSMS User Roles and Functions - Workflow Diagrams

Visual representation of all workflows in the Civil Service Management System.

---

## 1. Role Hierarchy and Relationships

```mermaid
graph TB
    subgraph System["System Level"]
        Admin["Admin<br/>System Administrator"]
    end

    subgraph Commission["Commission Level (All Institutions)"]
        CSCS["CSCS<br/>Commission Secretary"]
        HHRMD["HHRMD<br/>Head of HR Management"]
        HRMO["HRMO<br/>HR Management Officer"]
        DO["DO<br/>Disciplinary Officer"]
        PO["PO<br/>Planning Officer"]
    end

    subgraph Institution["Institution Level (Own Institution)"]
        HRRP["HRRP<br/>HR Responsible Personnel"]
        HRO["HRO<br/>HR Officer"]
    end

    subgraph Individual["Individual Level"]
        EMP["EMPLOYEE<br/>Self-Service"]
    end

    HRO -->|"Submits requests"| HRRP
    HRRP -->|"Approves & forwards"| CSCS
    HRRP -->|"Approves & forwards"| HHRMD
    HRRP -->|"Approves & forwards"| HRMO
    EMP -->|"Submits complaints"| DO
    EMP -->|"Submits complaints"| HHRMD

    Admin -.->|"Manages users"| Commission
    Admin -.->|"Manages users"| Institution
    Admin -.->|"Manages users"| Individual

    style System fill:#e8eaf6,stroke:#3949ab,stroke-width:2px
    style Commission fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Institution fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Individual fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

---

## 2. HR Request Approval Workflow

```mermaid
sequenceDiagram
    autonumber
    participant HRO as HRO<br/>(HR Officer)
    participant HRRP as HRRP<br/>(HR Responsible Personnel)
    participant System as CSMS System
    participant Commission as Commission Roles<br/>(HHRMD/HRMO/CSCS)
    participant DO as DO<br/>(Disciplinary Officer)

    rect rgb(255, 243, 224)
        Note over HRO, HRRP: Stage 1 - Institution Level
        HRO->>System: Submit HR Request
        System->>System: Status: "Pending HRRP Review"
        System->>HRRP: Notify: New request pending review
        HRRP->>System: Review request
        alt Approved
            HRRP->>System: Approve request
            System->>System: Status: "Approved by HRRP - Awaiting Commission Review"
            System->>Commission: Notify: Request awaiting review
            System->>DO: Notify: Request awaiting review
        else Rejected
            HRRP->>System: Reject with reason
            System->>System: Status: "Rejected by HRRP"
            System->>HRO: Notify: Request rejected
        end
    end

    rect rgb(232, 245, 233)
        Note over Commission, DO: Stage 2 - Commission Level
        Commission->>System: Review request
        alt Approved
            Commission->>System: Final approval
            System->>System: Status: "Approved"
            System->>HRO: Notify: Request approved
            System->>HRRP: Notify: Request approved
        else Rejected
            Commission->>System: Reject with reason
            System->>System: Status: "Rejected"
            System->>HRO: Notify: Request rejected
            System->>HRRP: Notify: Request rejected
        end
    end
```

---

## 3. Complaints Workflow

```mermaid
sequenceDiagram
    autonumber
    participant EMP as EMPLOYEE
    participant System as CSMS System
    participant DO as DO<br/>(Disciplinary Officer)
    participant HHRMD as HHRMD<br/>(Head of HR Management)

    rect rgb(252, 228, 236)
        Note over EMP, HHRMD: Complaint Submission and Resolution
        EMP->>System: Submit complaint
        System->>System: Create complaint record
        alt Assigned to DO
            System->>DO: Notify: New complaint assigned
            DO->>System: Review complaint
            DO->>System: Investigate and resolve
            System->>System: Status: "Resolved"
            System->>EMP: Notify: Complaint resolved
        else Assigned to HHRMD
            System->>HHRMD: Notify: New complaint assigned
            HHRMD->>System: Review complaint
            HHRMD->>System: Investigate and resolve
            System->>System: Status: "Resolved"
            System->>EMP: Notify: Complaint resolved
        else Escalated
            DO->>System: Escalate complaint
            System->>HHRMD: Notify: Complaint escalated
            HHRMD->>System: Handle escalation
            System->>EMP: Notify: Resolution update
        end
    end
```

---

## 4. HRO (Human Resource Officer) Functions

```mermaid
graph TB
    subgraph HRO["HRO - Human Resource Officer"]
        direction TB

        subgraph EmployeeMgmt["Employee Management"]
            E1["Search employees<br/>(own institution)"]
            E2["View employee profiles"]
            E3["Add employees manually"]
        end

        subgraph HRSubmit["HR Request Submission"]
            S1["Confirmation requests"]
            S2["LWOP requests"]
            S3["Promotion requests"]
            S4["Cadre change requests"]
            S5["Retirement requests"]
            S6["Resignation requests"]
            S7["Service extension requests"]
            S8["Termination requests"]
        end

        subgraph Monitoring["Monitoring"]
            M1["View urgent attention<br/>employees"]
            M2["Track request status"]
            M3["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate reports<br/>(excl. complaints)"]
        end
    end

    HRO -->|"Pending HRRP Review"| HRRP["HRRP"]

    style HRO fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style EmployeeMgmt fill:#fff8e1,stroke:#f9a825
    style HRSubmit fill:#fff8e1,stroke:#f9a825
    style Monitoring fill:#fff8e1,stroke:#f9a825
    style Reports fill:#fff8e1,stroke:#f9a825
```

---

## 5. HRRP (Human Resource Responsible Personnel) Functions

```mermaid
graph TB
    subgraph HRRP["HRRP - HR Responsible Personnel"]
        direction TB

        subgraph Approval["HR Request Approval (First Level)"]
            A1["Review HRO submissions"]
            A2["Approve and forward<br/>to Commission"]
            A3["Reject with reasons"]
        end

        subgraph Direct["Direct Submission"]
            D1["Submit HR requests<br/>directly"]
        end

        subgraph Monitoring["Monitoring"]
            M1["View urgent attention<br/>employees"]
            M2["View employee profiles"]
            M3["Track request status"]
            M4["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate reports<br/>(excl. complaints)"]
        end
    end

    HRO["HRO"] -->|"Submits request"| HRRP
    HRRP -->|"Approves"| Commission["Commission<br/>(HHRMD/HRMO)"]
    HRRP -->|"Rejects"| HRO

    style HRRP fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Approval fill:#fff8e1,stroke:#f9a825
    style Direct fill:#fff8e1,stroke:#f9a825
    style Monitoring fill:#fff8e1,stroke:#f9a825
    style Reports fill:#fff8e1,stroke:#f9a825
```

---

## 6. HHRMD (Head of HR Management Department) Functions

```mermaid
graph TB
    subgraph HHRMD["HHRMD - Head of HR Management Department"]
        direction TB

        subgraph FinalApproval["HR Request Review & Approval (Final)"]
            FA1["Confirmation requests"]
            FA2["LWOP requests"]
            FA3["Promotion requests"]
            FA4["Cadre change requests"]
            FA5["Retirement requests"]
            FA6["Resignation requests"]
            FA7["Service extension requests"]
            FA8["Termination requests"]
        end

        subgraph Disciplinary["Disciplinary Actions"]
            DA1["Handle dismissal requests"]
            DA2["Review complaints"]
        end

        subgraph Institution["Institution Management"]
            I1["View all institutions"]
            I2["View employee profiles<br/>(all institutions)"]
        end

        subgraph Monitoring["Monitoring"]
            M1["Track all requests"]
            M2["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate all reports<br/>(incl. complaints)"]
        end

        subgraph UserMgmt["User Management"]
            U1["View system user list"]
        end
    end

    style HHRMD fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FinalApproval fill:#c8e6c9,stroke:#388e3c
    style Disciplinary fill:#c8e6c9,stroke:#388e3c
    style Institution fill:#c8e6c9,stroke:#388e3c
    style Monitoring fill:#c8e6c9,stroke:#388e3c
    style Reports fill:#c8e6c9,stroke:#388e3c
    style UserMgmt fill:#c8e6c9,stroke:#388e3c
```

---

## 7. HRMO (Human Resource Management Officer) Functions

```mermaid
graph TB
    subgraph HRMO["HRMO - HR Management Officer"]
        direction TB

        subgraph Approval["HR Request Review & Approval"]
            A1["Confirmation requests"]
            A2["LWOP requests"]
            A3["Promotion requests"]
            A4["Cadre change requests"]
            A5["Retirement requests"]
            A6["Resignation requests"]
            A7["Service extension requests"]
        end

        subgraph Institution["Institution Management"]
            I1["View all institutions"]
            I2["View employee profiles<br/>(all institutions)"]
        end

        subgraph Monitoring["Monitoring"]
            M1["Track all requests"]
            M2["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate all reports"]
        end
    end

    style HRMO fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Approval fill:#c8e6c9,stroke:#388e3c
    style Institution fill:#c8e6c9,stroke:#388e3c
    style Monitoring fill:#c8e6c9,stroke:#388e3c
    style Reports fill:#c8e6c9,stroke:#388e3c
```

---

## 8. DO (Disciplinary Officer) Functions

```mermaid
graph TB
    subgraph DO["DO - Disciplinary Officer"]
        direction TB

        subgraph Disciplinary["Disciplinary Actions"]
            DA1["Handle termination requests"]
            DA2["Handle dismissal requests"]
            DA3["Review & resolve complaints"]
        end

        subgraph Institution["Institution Management"]
            I1["View all institutions"]
            I2["View employee profiles<br/>(all institutions)"]
        end

        subgraph Monitoring["Monitoring"]
            M1["Track requests"]
            M2["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate all reports"]
        end
    end

    EMP["EMPLOYEE"] -->|"Submits complaints"| DO

    style DO fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Disciplinary fill:#ffcdd2,stroke:#c62828
    style Institution fill:#c8e6c9,stroke:#388e3c
    style Monitoring fill:#c8e6c9,stroke:#388e3c
    style Reports fill:#c8e6c9,stroke:#388e3c
```

---

## 9. CSCS (Civil Service Commission Secretary) Functions

```mermaid
graph TB
    subgraph CSCS["CSCS - Commission Secretary"]
        direction TB

        subgraph FullAccess["Full HR Request Access"]
            FA1["Confirmations"]
            FA2["LWOP"]
            FA3["Promotions"]
            FA4["Cadre changes"]
            FA5["Retirements"]
            FA6["Resignations"]
            FA7["Service extensions"]
            FA8["Terminations"]
        end

        subgraph Complaints["Complaints Management"]
            C1["Handle complaints"]
            C2["Resolve complaints"]
        end

        subgraph Institution["Institution Management"]
            I1["View all institutions"]
            I2["View employee profiles<br/>(all institutions)"]
        end

        subgraph Monitoring["Monitoring"]
            M1["Track all requests"]
            M2["View recent activities"]
        end

        subgraph Reports["Reports"]
            R1["Generate all reports"]
        end
    end

    style CSCS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FullAccess fill:#c8e6c9,stroke:#388e3c
    style Complaints fill:#ffcdd2,stroke:#c62828
    style Institution fill:#c8e6c9,stroke:#388e3c
    style Monitoring fill:#c8e6c9,stroke:#388e3c
    style Reports fill:#c8e6c9,stroke:#388e3c
```

---

## 10. PO (Planning Officer) Functions

```mermaid
graph TB
    subgraph PO["PO - Planning Officer"]
        direction TB

        subgraph Reports["Reports & Analytics"]
            R1["View reports<br/>(all institutions)"]
            R2["Generate reports<br/>(excl. complaints)"]
        end
    end

    style PO fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Reports fill:#bbdefb,stroke:#1565c0
```

---

## 11. EMPLOYEE (Self-Service) Functions

```mermaid
graph TB
    subgraph EMP["EMPLOYEE - Self-Service"]
        direction TB

        subgraph Profile["Profile Management"]
            P1["View own profile"]
        end

        subgraph Complaints["Complaints"]
            C1["Submit new complaints"]
        end

        subgraph Tracking["Tracking"]
            T1["Track own requests"]
        end
    end

    EMP -->|"Submits complaints"| DO["DO / HHRMD"]

    style EMP fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style Profile fill:#f8bbd0,stroke:#c62828
    style Complaints fill:#f8bbd0,stroke:#c62828
    style Tracking fill:#f8bbd0,stroke:#c62828
```

---

## 12. Admin (System Administrator) Functions

```mermaid
graph TB
    subgraph Admin["Admin - System Administrator"]
        direction TB

        subgraph UserMgmt["User Management"]
            U1["Create users"]
            U2["View all users"]
            U3["Lock/unlock accounts"]
            U4["Reset passwords"]
        end

        subgraph Institution["Institution Management"]
            I1["Create institutions"]
            I2["Manage institutions"]
        end

        subgraph HRIMS["HRIMS Integration"]
            H1["Fetch employee data"]
            H2["Fetch photos/documents"]
            H3["Configure HRIMS settings"]
            H4["Test connectivity"]
        end

        subgraph Security["Security & Audit"]
            S1["Monitor security events"]
            S2["View access attempts"]
            S3["Manage sessions"]
        end
    end

    style Admin fill:#e8eaf6,stroke:#3949ab,stroke-width:2px
    style UserMgmt fill:#c5cae9,stroke:#3949ab
    style Institution fill:#c5cae9,stroke:#3949ab
    style HRIMS fill:#c5cae9,stroke:#3949ab
    style Security fill:#c5cae9,stroke:#3949ab
```

---

## 13. Data Access Scope

```mermaid
graph TB
    subgraph DataAccess["Data Access Levels"]

        subgraph Commission["Commission Roles<br/>(All Institutions)"]
            C1["HHRMD"]
            C2["HRMO"]
            C3["DO"]
            C4["CSCS"]
            C5["PO"]
        end

        subgraph Institution["Institution Roles<br/>(Own Institution)"]
            I1["HRO"]
            I2["HRRP"]
        end

        subgraph Individual["Individual<br/>(Own Data)"]
            IN1["EMPLOYEE"]
        end

        subgraph System["System<br/>(System-wide)"]
            S1["Admin"]
        end
    end

    style Commission fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Institution fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Individual fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style System fill:#e8eaf6,stroke:#3949ab,stroke-width:2px
```

---

## 14. Request Status State Diagram

```mermaid
stateDiagram-v2
    [*] --> PendingHRRP: HRO submits request

    PendingHRRP --> ApprovedByHRRP: HRRP approves
    PendingHRRP --> RejectedByHRRP: HRRP rejects

    ApprovedByHRRP --> PendingCommission: Awaiting Commission review

    PendingCommission --> Approved: Commission approves
    PendingCommission --> Rejected: Commission rejects

    RejectedByHRRP --> [*]
    Approved --> [*]
    Rejected --> [*]

    state PendingHRRP {
        [*] --> AwaitingHRRPReview
        AwaitingHRRPReview: Status: "Pending HRRP Review"
    }

    state ApprovedByHRRP {
        [*] --> AwaitingCommissionReview
        AwaitingCommissionReview: Status: "Approved by HRRP - Awaiting Commission Review"
    }

    state PendingCommission {
        [*] --> UnderCommissionReview
        UnderCommissionReview: Status: "Under Commission Review"
    }

    state Approved {
        [*] --> FinalApproved
        FinalApproved: Status: "Approved"
    }

    state Rejected {
        [*] --> FinalRejected
        FinalRejected: Status: "Rejected"
    }

    state RejectedByHRRP {
        [*] --> HRRPRejected
        HRRPRejected: Status: "Rejected by HRRP"
    }
```

---

## 15. Complaint Status State Diagram

```mermaid
stateDiagram-v2
    [*] --> Submitted: Employee submits complaint

    Submitted --> AssignedToDO: System assigns to DO
    Submitted --> AssignedToHHRMD: System assigns to HHRMD

    AssignedToDO --> UnderInvestigation: DO begins investigation
    AssignedToHHRMD --> UnderInvestigation: HHRMD begins investigation

    UnderInvestigation --> Escalated: Escalate to HHRMD
    UnderInvestigation --> Resolved: Resolve complaint

    Escalated --> UnderInvestigation: HHRMD investigates

    Resolved --> [*]

    state Submitted {
        [*] --> NewComplaint
        NewComplaint: Status: "Submitted"
    }

    state AssignedToDO {
        [*] --> DOPending
        DOPending: Status: "Assigned to DO"
    }

    state AssignedToHHRMD {
        [*] --> HHRMDPending
        HHRMDPending: Status: "Assigned to HHRMD"
    }

    state UnderInvestigation {
        [*] --> Investigating
        Investigating: Status: "Under Investigation"
    }

    state Escalated {
        [*] --> EscalatedStatus
        EscalatedStatus: Status: "Escalated to HHRMD"
    }

    state Resolved {
        [*] --> ResolvedStatus
        ResolvedStatus: Status: "Resolved"
    }
```

---

## Legend

| Color | Meaning |
|-------|---------|
| Orange | Institution-level roles (HRO, HRRP) |
| Green | Commission-level roles (HHRMD, HRMO, DO, CSCS, PO) |
| Red | Individual role (EMPLOYEE) |
| Blue | System role (Admin) |
| Pink | Disciplinary/Complaint functions |
| Light Blue | Read-only/Analytics functions |

---

*Generated from CSMS User Roles and Functions documentation.*
