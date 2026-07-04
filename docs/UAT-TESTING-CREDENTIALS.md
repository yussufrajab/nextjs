# CSMS UAT Testing Credentials

> **Generated:** 2026-07-03
> **Default Password (all accounts):** `Csms@2026`

---

## Login URL

- **Local:** `http://localhost:9002/login`

---

## Test Accounts by Role

### Admin

| Username   | Name               | Email                       | Password    |
|------------|--------------------|-----------------------------|-------------|
| `ymrajab`  | Yussuf Mzee Rajab  | yussuf.rajab@zanajira.go.tz | `Csms@2026` |
| `akassim`  | Amina Kassim       | amina.ali@zanajira.go.tz    | `Csms@2026` |
| `admin`    | System Administrator | admin@mock.local          | `Csms@2026` |

**Capabilities:** Full system access, user management, system configuration.

---

### HHRMD (Head of HR Management Division)

| Username   | Name           | Email                        | Password    |
|------------|----------------|------------------------------|-------------|
| `skhamis`  | Safia Khamis   | safia.khamis@zanajira.go.tz  | `Csms@2026` |
| `vuai`     | vuai makame    | vuai.juma@gmail.com          | `Csms@2026` |

**Capabilities:** Review & approve/reject requests forwarded by HRMO, commission decision workflow.

---

### HRMO (HR Management Officer)

| Username   | Name              | Email                  | Password    |
|------------|-------------------|------------------------|-------------|
| `fautest`  | Fauzia Majaribo   | fautest@mock.local     | `Csms@2026` |
| `fiddi`    | Fauzia Iddi       | fauzi.iddi@zanajira.go.tz | `Csms@2026` |

**Capabilities:** Review requests from HRO, forward to HHRMD.

---

### HRO (HR Officer)

| Username   | Name                   | Email                       | Password    |
|------------|------------------------|-----------------------------|-------------|
| `skawesu`  | Shuwekha Kassim Awesu  | aminasaba@zanajira.go.tz    | `Csms@2026` |
| `lela`     | Lela Kassim Ali        | lkali@kilimo.go.tz          | `Csms@2026` |

**Capabilities:** Submit requests on behalf of employees, manage institution employees.

---

### HRRP (HR Responsible Person)

| Username          | Name                  | Email                          | Password    |
|-------------------|-----------------------|--------------------------------|-------------|
| `Hassan`          | Hassan Hussein Hassan | hassan.hassan@zanajira.go.tz   | `Csms@2026` |
| `shuwekhaawesu`   | shuwekha kassim awesu | shuwekha.awesu@zanajira.go.tz  | `Csms@2026` |

**Capabilities:** Institution-level HR operations, review and forward requests.

---

### DO (Disciplinary Officer)

| Username   | Name                | Email                    | Password    |
|------------|---------------------|--------------------------|-------------|
| `maitest`  | Maimuna Majaribio   | maitest@mock.local       | `Csms@2026` |
| `mussi`    | Maimuna Ussi        | maimuna.ussi@zanajira.go.tz | `Csms@2026` |

**Capabilities:** Handle disciplinary cases and separation requests.

---

### CSCS (Commission Secretary)

| Username   | Name             | Email                        | Password    |
|------------|------------------|------------------------------|-------------|
| `zhaji`    | Zaituni Haji     | zaituni.haji@zanajira.go.tz  | `Csms@2026` |

**Capabilities:** Final approval authority, commission-level operations.

---

### PO (Planning Officer)

| Username   | Name                 | Email              | Password    |
|------------|----------------------|--------------------|-------------|
| `mishak`   | Mwanakombo Is-hak    | mishak@mock.local  | `Csms@2026` |

**Capabilities:** Planning and reporting functions.

---

### EMPLOYEE (Self-Service)

| Username              | Name                    | Password    |
|-----------------------|-------------------------|-------------|
| `abdillahomarnajim`   | ABDILLAH OMAR NAJIM     | `Csms@2026` |
| `abdullaameiramour`   | Abdulla Ameir Amour     | `Csms@2026` |

**Capabilities:** View own profile, submit personal requests (promotions, confirmations, LWOP, etc.).

---

## Request Workflow Overview

```
EMPLOYEE (submit) → HRO (review/forward) → HRMO (review/forward) → HHRMD (review/forward) → CSCS (final decision)
```

Different request types:
- **Promotion Request** — Employee promotion workflow
- **Confirmation Request** — Probation confirmation
- **LWOP Request** — Leave Without Pay
- **Cadre Change Request** — Change job cadre
- **Retirement Request** — Employee retirement
- **Resignation Request** — Voluntary resignation
- **Separation Request** — Involuntary separation
- **Service Extension Request** — Extend service beyond retirement
- **Complaint** — Employee complaints

---

## Quick Test Scenarios

### 1. Login Test
- Login with each role above at `http://localhost:9002/login`
- Verify dashboard loads with role-appropriate content

### 2. Promotion Request Flow
1. Login as `abdillahomarnajim` (EMPLOYEE)
2. Submit a promotion request
3. Login as `skawesu` (HRO) — review and forward
4. Login as `fautest` (HRMO) — review and forward
5. Login as `skhamis` (HHRMD) — review and forward
6. Login as `zhaji` (CSCS) — final decision

### 3. Password Reset Verification
- All accounts above should login with `Csms@2026`
- No forced password change required
- No account lockouts

### 4. Admin Functions
- Login as `ymrajab` (Admin)
- Test user management, institution settings, audit logs

---

## Reset Script

To reset these passwords again (or to a different value):

```bash
# Reset all UAT users to default
npx tsx scripts/reset-all-uat-passwords.ts

# Reset all UAT users to a custom password
npx tsx scripts/reset-all-uat-passwords.ts 'NewPassword@123'

# Reset a single user
npx tsx scripts/reset-user-password.ts <username> <password>
```

---

## Notes

- All accounts have `active: true`, no lockouts, no forced password change
- EMPLOYEE accounts are auto-generated from employee records (no email)
- Mock/test accounts use `@mock.local` email domains
- The `Admin` and `ADMIN` roles are separate (case-sensitive) — verify which one your system uses
