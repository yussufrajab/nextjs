# Mystery: 33 vs 6,408 Employees — Root Cause & Fix

## The Problem

Tume ya Utumishi Serikalini (Vote Code 037) has **33 employees** who actually work there. But fetching from HRIMS returned **6,408 employees** and stored them all under this institution. Before the security implementation, the same fetch returned only 33.

## Root Cause

### What changed

The HRIMS server endpoint was changed:

| | Old | Current |
|---|---|---|
| HRIMS host | `10.0.217.11` | `10.15.10.20` |
| When changed | — | Updated in DB on 2026-07-20 |
| Employees for vote code 037 | 33 | 6,408 (earlier today); 57 (now) |

The new HRIMS server at `10.15.10.20` returns a **much broader dataset** for the same vote code. The old server returned only employees whose current workplace was the institution itself; the new server returns all employees appointed under that vote code.

### How HRIMS vote codes work

A **vote code** is the **appointing authority**, not the current workplace. Vote code 037 (Tume ya Utumishi Serikalini) is the central Public Service Commission — it appoints civil servants across **all** government ministries and departments.

When the HRIMS API (RequestId 204/205) is queried with vote code 037, it returns:
- Employees whose `appointmentType = "Tume ya Utumishi Serikalini"` (4,980 employees)
- Plus employees appointed by other authorities under the same vote code (Tume ya Mahakama, Mkuu wa Mkoa, etc.)
- **Total: 6,408 employees**, of which only **33** actually work at the commission

### The 6,408 employees by current workplace (top 15)

| Current Workplace | Count |
|---|---|
| Chuo Kikuu cha Taifa cha Zanzibar | 586 |
| Mamlaka ya Maji | 501 |
| Mahkama Kuu | 404 |
| Mamlaka ya Mapato Zanzibar | 337 |
| Mamlaka ya Mafunzo ya Amali | 278 |
| Wizara ya Fedha na Mipango | 233 |
| Wakala wa Usajili wa Matukio ya Kijamii | 206 |
| Shirika la Utangazaji Zanzibar | 199 |
| Mdhibiti na Mkaguzi Mkuu wa Hesabu | 198 |
| Wakala wa Chakula, Dawa na Vipodozi | 175 |
| Baraza la Wawakilishi | 174 |
| Mamlaka ya Kuzuia Rushwa na Uhujumu wa Uchumi | 168 |
| Chuo cha Kiislam | 150 |
| Taasisi ya Sayansi na Teknolojia ya Karume | 148 |
| (null) | 134 |
| ... | ... |
| **Tume ya Utumishi Serikalini** | **33** |

### Appointment type distribution (6,408 employees)

| Appointment Type | Count |
|---|---|
| Tume ya Utumishi Serikalini | 4,980 |
| Uteuzi wa Bodi ya Wakurugenzi | 385 |
| Tume ya Utumishi Mahakama | 271 |
| Mkuu wa Mkoa | 153 |
| (null) | 134 |
| Tume ya Utumishi Baraza la Wawakilishi | 105 |
| Baraza la Taasisi | 86 |
| Uteuzi wa Mkuu wa Mkoa | 74 |
| Baraza la Chuo cha Utawala wa Umma (IPA) | 69 |
| Uteuzi wa Rais | 52 |

## The Fix

Added a **workplace filter** to the HRIMS sync worker (`src/lib/jobs/hrims-sync-worker.ts`) and bulk-fetch route (`src/app/api/hrims/bulk-fetch/route.ts`).

### What it does

After extracting `currentEmployment.entityName` (the employee's current workplace) from the HRIMS response, the code now compares it against the institution name being synced. If they don't match, the employee is **skipped** (not saved to the database).

### Code change (hrims-sync-worker.ts)

```typescript
// After extracting currentEmployment:
const workplace = currentEmployment?.entityName ?? '';
if (
  institutionName &&
  workplace &&
  !workplaceMatch(workplace, institutionName)
) {
  workerLogger.debug(
    { zanId: personalInfo.zanIdNumber, workplace, institutionName },
    'Skipping employee — workplace does not match institution'
  );
  return null;
}
```

Where `workplaceMatch` does a case-insensitive, whitespace-normalized comparison.

### Same fix applied to bulk-fetch/route.ts

```typescript
const workplace = currentEmployment?.entityName ?? '';
if (
  institutionName &&
  workplace &&
  workplace.trim().toLowerCase() !== institutionName.trim().toLowerCase()
) {
  return null;
}
```

### What was NOT changed

- **Single-employee fetch** (`fetch-employee/route.ts`): Not filtered — the user explicitly searched for a specific employee by ZanID/payroll, so they should get the result regardless of workplace.
- **HRIMS API request**: The request to HRIMS is unchanged (still sends vote code/TIN as `RequestBody`). The filtering happens **after** the response, before saving to DB.

## Impact on All 76 Institutions

This issue affects **every institution** — the HRIMS API returns all employees appointed under a vote code, not just those currently at that institution. The fix applies uniformly:

| Institution | Vote Code | Employees in DB | Actual Workplace Match |
|---|---|---|---|
| Wizara ya Elimu na Mafunzo ya Amali | 011 | 18,978 | ~0 (needs filtering) |
| Tume ya Utumishi Serikalini | 037 | 6,408 | 33 |
| Wizara ya Afya | 008 | 6,055 | ~0 (needs filtering) |
| Wizara ya Kilimo... | 012 | 1,677 | ~0 (needs filtering) |
| Hospitali ya Mnazi Mmoja | 025 | 1,519 | 603 |
| ... | ... | ... | ... |
| **Total in DB** | — | **43,510** | Needs recount |

After the fix, future fetches will only store employees whose `currentWorkplace` matches the institution name. Existing incorrect data should be cleaned up by re-fetching (the upsert will update matching employees; non-matching ones will no longer be added).

## Database Cleanup

The 6,375 employees currently in the DB under institution 037 that don't work at Tume ya Utumishi need to be removed. A re-fetch with the fix applied will correctly save only the 33 (or ~39, depending on HRIMS's current data) matching employees.

## Summary

| Aspect | Before Fix | After Fix |
|---|---|---|
| HRIMS returns | All employees by vote code (appointing authority) | Same — HRIMS API unchanged |
| Saved to DB | All returned employees | Only those whose `currentWorkplace` matches the institution |
| Tume ya Utumishi (037) | 6,408 employees | ~33-57 employees (matching workplace only) |
| Other institutions | Same over-counting | Correctly filtered |
| Single-employee fetch | Unaffected | Unaffected (no filter) |