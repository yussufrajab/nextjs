# Tume ya Utumishi Serikalini (037) — Database Cleanup

## Problem

Tume ya Utumishi Serikalini (Vote Code 037) should have **33 employees** — only those who actually work at the commission. Instead, the database had **6,408 employees** assigned to it, because the HRIMS API returns all employees appointed under a vote code (the appointing authority), not just those currently working at the institution.

## Root Cause

A **vote code** represents the **appointing authority**, not the current workplace. Vote code 037 is the central Public Service Commission — it appoints civil servants across all government institutions. When HRIMS is queried with vote code 037, it returns all 6,408 employees appointed by the commission, even though only 33 actually work there. The remaining 6,375 work at other ministries, agencies, and departments.

## Cleanup Performed

### Step 1: Match currentWorkplace to institutions

Each employee's `currentWorkplace` field was matched against the 76 institutions in the database using:
1. **Exact match** (case-insensitive) — e.g. `"Wizara ya Afya"` → `WIZARA YA AFYA`
2. **Containment match** — e.g. `"Tume ya Uchaguzi"` → `TUME YA UCHAGUZI YA ZANZIBAR`
3. **Keyword score match** (≥50% keyword overlap) — e.g. `"Mamlaka ya Kudhibiti na Kupambana na Dawa za Kulevya"` → `MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR`

### Step 2: Reassign employees to correct institutions

Employees whose `currentWorkplace` matched one of the 76 institutions were **reassigned** to that institution.

### Step 3: Delete non-matching employees

Employees whose `currentWorkplace` did not match any of the 76 institutions were **deleted** from the database (along with their related records — promotions, confirmations, certificates, etc.). These 22 unmatched workplaces were:

| Workplace | Count |
|---|---|
| Chuo Kikuu cha Taifa cha Zanzibar | 586 |
| Mamlaka ya Maji | 501 |
| Mahkama Kuu | 404 |
| Mamlaka ya Mapato Zanzibar | 337 |
| Mamlaka ya Mafunzo ya Amali | 278 |
| Wizara ya Fedha na Mipango | 233 |
| Wakala wa Usajili wa Matukio ya Kijamii | 206 |
| Shirika la Utangazaji Zanzibar | 199 |
| Mdhibiti na Mkaguzi Mkuu wa Hesabu za Serikali | 198 |
| Wakala wa Chakula, Dawa na Vipodozi | 175 |
| Baraza la Wawakilishi | 174 |
| Mamlaka ya Kuzuia Rushwa na Uhujumu wa Uchumi | 168 |
| Chuo cha Kiislam | 150 |
| Taasisi ya Sayansi na Teknolojia ya Karume | 148 |
| ... and 8 others | ... |

These are legitimate government entities that are simply not among the 76 institutions registered in the CSMS database.

### Step 4: Code fix (prevents recurrence)

Added a **workplace filter** to the HRIMS sync worker (`src/lib/jobs/hrims-sync-worker.ts`) and bulk-fetch route (`src/app/api/hrims/bulk-fetch/route.ts`):
- After extracting `currentEmployment.entityName` from the HRIMS response, the code compares it against the institution name being synced
- If they don't match (case-insensitive, whitespace-normalized), the employee is **skipped** — not saved to the database
- Single-employee fetches (by ZanID/payroll) are not filtered — the user explicitly searched for that person

## Results

| Metric | Before | After |
|---|---|---|
| Employees at Tume ya Utumishi (037) | 6,408 | **33** |
| Total employees in database | 43,510 | 42,161 |
| Employees deleted (no matching institution) | — | 1,349 |
| Employees reassigned to other institutions | — | 7,575 |

### 33 Employees Remaining at Tume ya Utumishi Serikalini

All 33 have `currentWorkplace = "Tume ya Utumishi Serikalini"`:

| # | Full Name | ZanID |
|---|-----------|-------|
| 1 | Abass Sultan Mohammed | 210074950 |
| 2 | Ali Bakari Ali | 080086952 |
| 3 | Amina Kassim Ali | 220092672 |
| 4 | Amina Omar Yahya | 090170160 |
| 5 | Bimkubwa Ali Mohamed | 00162503 |
| 6 | Fauzia Ibrahim Iddi | 580294897 |
| 7 | Fauzia Makame Ame | 550087250 |
| 8 | Hamran Ali Salum | 270095214 |
| 9 | Harith Abdalla Ali | 610067725 |
| 10 | Hassan Hussein Hassan | 0220159690 |
| 11 | Hussein Suleiman Abjed | 630104659 |
| 12 | Juma Haji Mbwembwe | 040226176 |
| 13 | Khadija Makame Silima | 633076043 |
| 14 | Khamis Hamad Juma | 060359870 |
| 15 | Khamis Makame Khamis | 260026046 |
| 16 | Khamis Mnyonge Haji | 100134625 |
| 17 | Lela Kassim Ali | 270302150 |
| 18 | Maimuna Bakar Ussi | 620025290 |
| 19 | Mbarouk Nassor Mbarouk | 240102018 |
| 20 | Mussa Mmanga Mussa | 520156478 |
| 21 | Mwanaidi Salum Mohamed | 520248966 |
| 22 | Mwanaid Vuai Mrisho | 620116321 |
| 23 | Mwanakombo Mohammed Is-haka | 520102398 |
| 24 | Nasra Said Nassor | 620095738 |
| 25 | Pili Buda Juma | 080051084 |
| 26 | Rahma Khatibu Ahmada | 010272055 |
| 27 | Safia Juma Khamis | 230068863 |
| 28 | Samira Moh'd Fadhil | 610309160 |
| 29 | Shuwekha Kassim Awesu | 070167867 |
| 30 | Shuwena Nassor Mussa | 481169275 |
| 31 | Yussuf Mzee Rajab | 010277681 |
| 32 | Zainab Maulid Shaaban | 320144233 |
| 33 | Zaitun Mohammed Haji | 030131682 |

## Note on Other Institutions

The same over-counting issue affects other institutions in the database (e.g. Wizara ya Elimu has 19,273 employees). The **code fix** will prevent this for future fetches. Cleaning up existing data for all 76 institutions would require the same workplace-matching process applied to each institution — this was only done for Tume ya Utumishi (037) as requested.