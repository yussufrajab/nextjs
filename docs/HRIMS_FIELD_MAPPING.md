# HRIMS Data Mapping — CSMS Employee Profile

## Overview

This document describes the exact data fields that the CSMS application extracts from the HRIMS API and stores in the local `Employee` database table. It reflects the actual mapping implemented in the sync worker (`src/lib/jobs/hrims-sync-worker.ts`) and the single-employee fetch route (`src/app/api/hrims/fetch-employee/route.ts`).

**Institution:** Tume ya Utumishi Serikalini — Vote Code **037**, TIN **101817199**
**Admin user:** `ymrajab` (Yussuf Mzee Rajab)
**Date:** 2026-08-11

### Fetch 1 — By Vote Code (RequestId 204)

- **HRIMS API RequestId:** 204 (Get employees by Vote Code)
- **Endpoint:** `POST /Employees` with `{ RequestId: "204", RequestPayloadData: { PageNumber, PageSize, RequestBody: "037" } }`
- **Result:** 6,408 employees fetched and stored

### Fetch 2 — By TIN Number (RequestId 205)

- **HRIMS API RequestId:** 205 (Get employees by TIN Number)
- **Endpoint:** `POST /Employees` with `{ RequestId: "205", RequestPayloadData: { PageNumber, PageSize, RequestBody: "101817199" } }`
- **Result:** 6,408 employees fetched and upserted (same records refreshed by ZanID)
- **Comparison:** Field coverage is identical between RequestId 204 and 205 — both return the same nested data structure (`personalInfo`, `employmentHistories`, `salaryInformation`, `educationHistories`, `contractDetails`) and the same mapping applies.

---

## HRIMS API Request IDs

| Request ID | Purpose                         | Parameters                                         | Used By             |
| ---------- | ------------------------------- | -------------------------------------------------- | ------------------- |
| 201        | Get list of all employees        | `PageNumber`, `PageSize`                           | Pagination          |
| 202        | Get single employee by payroll  | `RequestBody: payrollNumber`                       | Individual lookup   |
| 203        | Get employee photo              | `RequestBody: payrollNumber`                       | Photo fetch         |
| **204**    | **Get employees by Vote Code**  | `PageNumber`, `PageSize`, `RequestBody: voteCode`  | **Institution fetch** |
| **205**    | **Get employees by TIN Number**  | `PageNumber`, `PageSize`, `RequestBody: tinNumber`| **Institution fetch** |
| 206        | Get employee documents           | `RequestBody: payrollNumber`                       | Document fetch      |

---

## HRIMS Response Structure (RequestId 204 & 205)

Both RequestId 204 (Vote Code) and 205 (TIN Number) return the same data structure. The HRIMS API returns an array of employee objects, each containing nested sub-objects:



```json
{
  "code": 200,
  "overallDataSize": 6408,
  "currentDataSize": 100,
  "data": [
    {
      "personalInfo": {
        "firstName": "Suleiman",
        "middleName": "Faki",
        "lastName": "Khamis",
        "genderName": "Mwanamme",
        "zanIdNumber": "580330892",
        "birthDate": "1990-09-17T00:00:00",
        "placeOfBirth": "MAFIA",
        "districtName": "Magharibi B",
        "birthRegionName": "...",
        "regionName": "...",
        "birthCountryName": "United Republic of Tanzania",
        "primaryPhone": "0678504760",
        "workPhone": null,
        "houseNumber": "15",
        "street": "Fuoni Kibondeni",
        "city": "UNGUJA",
        "zssfNumber": "00104909",
        "payrollNumber": "963573",
        "employmentDate": "2019-02-04T00:00:00",
        "employmentConfirmationDate": "2020-02-04T00:00:00",
        "isEmployeeConfirmed": true
      },
      "employmentHistories": [
        {
          "isCurrent": true,
          "titlePrefixName": null,
          "titleName": "Afisa Mipango Mwandamizi",
          "gradeName": null,
          "employeeStatusName": "...",
          "employmentStatusName": "...",
          "parentEntityName": null,
          "entityName": "Wizara ya Ardhi, na Maendeleo ya Makaazi",
          "subEntityName": "Idara ya Rasilimaliwatu",
          "appointmentTypeName": "Tume ya Utumishi Serikalini",
          "divisionName": "Divisheni ya Utumishi",
          "fromDate": "2019-02-01T00:00:00",
          "toDate": "2050-09-17T00:00:00"
        }
      ],
      "salaryInformation": [
        {
          "isCurrent": true,
          "salaryScaleName": "ZPSH-06"
        }
      ],
      "educationHistories": [
        {
          "isEmploymentHighest": true,
          "educationLevel": "Bachelor Degree",
          "institution": "University of Dar es Salaam"
        }
      ],
      "contractDetails": [
        {
          "isActive": true,
          "contractTypeName": "Wa Kudumu",
          "toDate": "2050-09-17T00:00:00"
        }
      ]
    }
  ]
}
```

---

## Complete Field Mapping

### Section 1: Personal Information

| # | CSMS DB Field      | HRIMS Source                                          | Transformation                                                                 | Coverage (037) |
|---|--------------------|-------------------------------------------------------|--------------------------------------------------------------------------------|----------------|
| 1 | `name`             | `personalInfo.firstName + middleName + lastName`      | Joined with spaces, empty parts filtered out                                   | 6,408/6,408 (100%) |
| 2 | `gender`           | `personalInfo.genderName`                             | `"Mwanamme"` → `"Male"`, `"Mwanamke"` → `"Female"`, else passthrough          | 6,408/6,408 (100%) |
| 3 | `zanId`            | `personalInfo.zanIdNumber`                            | Direct copy. Used as unique key for upsert. Skipped if empty                  | 6,408/6,408 (100%) |
| 4 | `dateOfBirth`      | `personalInfo.birthDate`                              | Parsed to `Date`                                                               | 6,347/6,408 (99.0%) |
| 5 | `placeOfBirth`     | `personalInfo.placeOfBirth`                           | Direct copy                                                                    | 5,989/6,408 (93.5%) |
| 6 | `region`           | `personalInfo.districtName \|\| birthRegionName \|\| regionName` | First non-null fallback chain                                       | 3,808/6,408 (59.4%) |
| 7 | `countryOfBirth`   | `personalInfo.birthCountryName`                       | Direct copy                                                                    | 6,045/6,408 (94.3%) |
| 8 | `phoneNumber`      | `personalInfo.primaryPhone \|\| workPhone`            | First non-null                                                                 | 3,778/6,408 (59.0%) |
| 9 | `contactAddress`   | `personalInfo.houseNumber + street + city`            | Joined with `", "`, empty parts filtered out, null if all empty               | 3,930/6,408 (61.3%) |
| 10| `zssfNumber`       | `personalInfo.zssfNumber`                             | Direct copy                                                                    | 5,899/6,408 (92.1%) |
| 11| `payrollNumber`    | `personalInfo.payrollNumber`                          | Direct copy, defaults to `""` if null                                          | 6,353/6,408 (99.1%) |

### Section 2: Employment Summary

| # | CSMS DB Field             | HRIMS Source                                                         | Transformation                                                | Coverage (037) |
|---|---------------------------|----------------------------------------------------------------------|---------------------------------------------------------------|----------------|
| 1 | `cadre`                   | `currentEmployment.titlePrefixName + titleName + gradeName`          | Joined with spaces, empty parts filtered out                  | 6,113/6,408 (95.4%) |
| 2 | `salaryScale`             | `currentSalary.salaryScaleName`                                      | From `salaryInformation[]` where `isCurrent == true`         | 6,274/6,408 (97.9%) |
| 3 | `ministry`                | `currentEmployment.parentEntityName \|\| entityName`                  | First non-null                                                | 6,274/6,408 (97.9%) |
| 4 | `department`              | `currentEmployment.subEntityName`                                    | Direct copy                                                   | 5,961/6,408 (93.0%) |
| 5 | `appointmentType`         | `currentEmployment.appointmentTypeName`                              | Direct copy                                                   | 6,274/6,408 (97.9%) |
| 6 | `contractType`            | `activeContract.contractTypeName`                                    | From `contractDetails[]` where `isActive == true`             | 6,274/6,408 (97.9%) |
| 7 | `recentTitleDate`         | `currentEmployment.fromDate`                                         | Parsed to `Date`                                              | 6,274/6,408 (97.9%) |
| 8 | `currentReportingOffice`  | `currentEmployment.divisionName \|\| subEntityName`                   | First non-null                                                | 6,014/6,408 (93.9%) |
| 9 | `currentWorkplace`        | `currentEmployment.entityName`                                       | Direct copy                                                   | 6,274/6,408 (97.9%) |
| 10| `employmentDate`          | `personalInfo.employmentDate`                                        | Parsed to `Date`                                              | 6,404/6,408 (99.9%) |
| 11| `confirmationDate`        | `personalInfo.employmentConfirmationDate`                            | Parsed to `Date`                                              | 4,405/6,408 (68.7%) |
| 12| `retirementDate`          | `activeContract.toDate`                                              | Parsed to `Date`. Skipped if `"1900-01-01T00:00:00"`          | 5,761/6,408 (89.9%) |
| 13| `status`                 | Derived (see below)                                                  | Computed from `isEmployeeConfirmed` + `employeeStatusName`   | 6,408/6,408 (100%) |

**`currentEmployment` selection logic:** First entry in `employmentHistories[]` where `isCurrent == true`, falling back to `employmentHistories[0]`.

**`currentSalary` selection logic:** First entry in `salaryInformation[]` where `isCurrent == true`, falling back to `salaryInformation[0]`.

**`activeContract` selection logic:** First entry in `contractDetails[]` where `isActive == true`.

**`status` derivation logic:**
```typescript
let status = 'On Probation';
if (personalInfo.isEmployeeConfirmed) {
  status = 'Confirmed';
} else if (currentEmployment) {
  const empStatus = currentEmployment.employeeStatusName?.toLowerCase();
  if (empStatus?.includes('staafu'))        status = 'Retired';
  else if (empStatus?.includes('hayupo'))   status = 'Resigned';
  else if (empStatus?.includes('aachishwa')) status = 'Terminated';
  else if (empStatus?.includes('fukuzwa'))   status = 'Dismissed';
  else if (currentEmployment.employmentStatusName?.toLowerCase().includes('hai'))
    status = 'Confirmed';
}
```

### Section 3: Computed / Metadata Fields

| # | CSMS DB Field       | Source                                                      | Notes                                                       |
|---|---------------------|-------------------------------------------------------------|-------------------------------------------------------------|
| 1 | `id`                | `uuidv4()` (new) or existing employee ID                    | Reused on update (upsert by `zanId`)                        |
| 2 | `employeeEntityId`  | `personalInfo.zanIdNumber`                                  | Same as ZanID; used as HRIMS entity reference               |
| 3 | `institutionId`     | Local DB — the institution being synced                     | Set once at creation; NOT overwritten on subsequent syncs   |
| 4 | `dataSource`        | Default `"HRIMS"`                                           | Distinguishes from `MANUAL_ENTRY` employees                 |
| 5 | `island`            | `deriveIsland(subEntityName, entityName, ..., institutionName)` | Defaults to `UNGUJA` if no Pemba signal detected     |

### Section 4: Data NOT Fetched from HRIMS

These fields exist in the `Employee` model but are **not available** from HRIMS. They are stored locally and uploaded manually:

| Field                     | Storage                    | Notes                                    |
|---------------------------|----------------------------|------------------------------------------|
| `profileImageUrl`         | MinIO (via RequestId 203)  | Available via separate API call, not in bulk fetch |
| `ardhilHaliUrl`           | Local upload               | Manual upload by authorized HRO/Admin   |
| `confirmationLetterUrl`   | Local upload               | Manual upload                            |
| `jobContractUrl`          | Local upload               | Manual upload                            |
| `birthCertificateUrl`     | Local upload               | Manual upload                            |
| `email`                   | Not in HRIMS               | Not populated by HRIMS sync              |
| `EmployeeCertificate[]`   | Local upload / MinIO       | Educational certificate PDFs (metadata in `educationHistories` but not document files) |

---

## Sample Employee (Tume ya Utumishi — Vote Code 037 / TIN 101817199)

```json
{
  "name": "Suleiman Faki Khamis",
  "gender": "Male",
  "zanId": "580330892",
  "dateOfBirth": "1990-09-17",
  "placeOfBirth": "MAFIA",
  "region": "Magharibi B",
  "countryOfBirth": "United Republic of Tanzania",
  "phoneNumber": "0678504760",
  "contactAddress": "15, Fuoni Kibondeni, UNGUJA",
  "zssfNumber": "00104909",
  "payrollNumber": "963573",
  "cadre": "Afisa Mipango Mwandamizi",
  "salaryScale": "ZPSH-06",
  "ministry": "Wizara ya Ardhi, na Maendeleo ya Makaazi",
  "department": "Idara ya Rasilimaliwatu",
  "appointmentType": "Tume ya Utumishi Serikalini",
  "contractType": "Wa Kudamu",
  "recentTitleDate": "2019-02-01",
  "currentReportingOffice": "Divisheni ya Utumishi",
  "currentWorkplace": "Mthamini Mkuu wa Serikali",
  "employmentDate": "2019-02-04",
  "confirmationDate": "2020-02-04",
  "retirementDate": "2050-09-17",
  "status": "Confirmed",
  "island": "UNGUJA",
  "dataSource": "HRIMS"
}
```


---

## Vote Code (204) vs TIN Number (205) Comparison

| Aspect                    | RequestId 204 (Vote Code)                    | RequestId 205 (TIN Number)                     |
| ------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Identifier used           | `037`                                        | `101817199`                                    |
| RequestBody parameter    | Vote Code                                    | TIN Number                                     |
| Response structure        | Same (`personalInfo`, `employmentHistories`, etc.) | Same                                      |
| Field mapping             | Same `saveEmployeeFromDetailedData()`         | Same `saveEmployeeFromDetailedData()`          |
| Employees returned       | 6,408                                        | 6,408                                          |
| Field coverage            | Identical (see tables above)                 | Identical                                      |
| Upsert key                | `zanId` (globally unique)                     | `zanId` (globally unique)                      |
| `institutionId` behavior  | Set once at creation, not overwritten on update | Same — not overwritten on subsequent syncs   |

**Conclusion:** RequestId 204 and 205 return the same employee data for the same institution. Both use the same `saveEmployeeFromDetailedData()` mapping function and produce identical field coverage. The only difference is the identifier passed in `RequestBody` (vote code vs TIN number).
---

## Code References

| File | Function | Lines |
|------|----------|-------|
| `src/lib/jobs/hrims-sync-worker.ts` | `saveEmployeeFromDetailedData()` | 63–232 |
| `src/lib/jobs/hrims-sync-worker.ts` | `processHRIMSSyncJob()` (pagination + fetch loop) | 237–466 |
| `src/app/api/hrims/fetch-by-institution/route.ts` | Request handler (queues background job, selects RequestId 204/205) | 17–113 |
| `src/app/api/hrims/fetch-employee/route.ts` | `saveEmployeeToDatabase()` (single-employee variant) | 111–215 |
| `src/app/api/hrims/bulk-fetch/route.ts` | `saveEmployeeFromDetailedData()` + `saveEmployeeFromListData()` | 37–240 |
| `prisma/schema.prisma` | `Employee` model | 113–168 |
| `src/lib/island-utils.ts` | `deriveIsland()` | — |