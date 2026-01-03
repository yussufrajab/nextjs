# HRIMS Data Mapping to Employee Profile

## Overview

This document provides a comprehensive mapping of data returned from the HRIMS API (RequestId 205 - Fetch by TIN Number) to the employee profile page fields in the CSMS application.

**HRIMS Integration Test Page:** http://10.0.225.14:9002/dashboard/admin/test-hrims
**Employee Profile Page:** http://10.0.225.14:9002/dashboard/profile
**Default Test TIN:** 119060370 (RequestId: 205)

## HRIMS RequestId 205 Response Structure

RequestId 205 fetches employees by institution TIN Number and returns detailed employee data with the following structure:

```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "personalInfo": {
        "firstName": "...",
        "middleName": "...",
        "lastName": "...",
        "genderName": "...",
        "zanIdNumber": "...",
        "birthDate": "...",
        "placeOfBirth": "...",
        "districtName": "...",
        "birthRegionName": "...",
        "regionName": "...",
        "birthCountryName": "...",
        "primaryPhone": "...",
        "workPhone": "...",
        "houseNumber": "...",
        "street": "...",
        "city": "...",
        "zssfNumber": "...",
        "payrollNumber": "...",
        "employmentDate": "...",
        "employmentConfirmationDate": "...",
        "isEmployeeConfirmed": true/false
      },
      "employmentHistories": [
        {
          "isCurrent": true/false,
          "titlePrefixName": "...",
          "titleName": "...",
          "gradeName": "...",
          "employeeStatusName": "...",
          "employmentStatusName": "...",
          "parentEntityName": "...",
          "entityName": "...",
          "subEntityName": "...",
          "appointmentTypeName": "...",
          "divisionName": "...",
          "fromDate": "..."
        }
      ],
      "salaryInformation": [
        {
          "isCurrent": true/false,
          "salaryScaleName": "..."
        }
      ],
      "educationHistories": [
        {
          "isEmploymentHighest": true/false,
          "educationLevel": "...",
          "institution": "..."
        }
      ],
      "contractDetails": [
        {
          "isActive": true/false,
          "contractTypeName": "...",
          "toDate": "..."
        }
      ]
    }
  ]
}
```

## Employee Profile Page Structure

The employee profile page (`/src/app/dashboard/profile/page.tsx`) displays employee information in the following sections:

1. **Personal Information** (Lines 156-169)
2. **Employment Summary** (Lines 177-192)
3. **Employee Documents** (Lines 199-250)
4. **Employee Certificates** (Lines 251-282)

## Complete Data Mapping

### ✅ Section 1: Personal Information - FULLY MAPPED (11/11 fields)

All fields in this section can be populated from HRIMS RequestId 205:

| #   | Profile Field    | HRIMS Data Source                                                | Code Reference        | Status    |
| --- | ---------------- | ---------------------------------------------------------------- | --------------------- | --------- |
| 1   | Full Name        | `personalInfo.firstName + middleName + lastName`                 | `route.ts:77-79`      | ✅ Mapped |
| 2   | Gender           | `personalInfo.genderName` (Mwanamme→Male, Mwanamke→Female)       | `route.ts:82-84`      | ✅ Mapped |
| 3   | ZanID            | `personalInfo.zanIdNumber`                                       | `route.ts:126`        | ✅ Mapped |
| 4   | Date of Birth    | `personalInfo.birthDate`                                         | `route.ts:122`        | ✅ Mapped |
| 5   | Place of Birth   | `personalInfo.placeOfBirth`                                      | `route.ts:123`        | ✅ Mapped |
| 6   | Region           | `personalInfo.districtName \|\| birthRegionName \|\| regionName` | `route.ts:124`        | ✅ Mapped |
| 7   | Country of Birth | `personalInfo.birthCountryName`                                  | `route.ts:125`        | ✅ Mapped |
| 8   | Phone Number     | `personalInfo.primaryPhone \|\| workPhone`                       | `route.ts:127`        | ✅ Mapped |
| 9   | Contact Address  | `personalInfo.houseNumber + street + city`                       | `route.ts:87-89, 128` | ✅ Mapped |
| 10  | ZSSF Number      | `personalInfo.zssfNumber`                                        | `route.ts:129`        | ✅ Mapped |
| 11  | Payroll Number   | `personalInfo.payrollNumber`                                     | `route.ts:130`        | ✅ Mapped |

**Coverage: 11/11 (100%)**

### ✅ Section 2: Employment Summary - FULLY MAPPED (13/13 fields)

All fields in this section can be populated from HRIMS RequestId 205:

| #   | Profile Field            | HRIMS Data Source                                           | Code Reference          | Status    |
| --- | ------------------------ | ----------------------------------------------------------- | ----------------------- | --------- |
| 1   | Rank (Cadre)             | `currentEmployment.titlePrefixName + titleName + gradeName` | `route.ts:92-95, 131`   | ✅ Mapped |
| 2   | Salary Scale             | `currentSalary.salaryScaleName`                             | `route.ts:132`          | ✅ Mapped |
| 3   | Ministry                 | `currentEmployment.parentEntityName \|\| entityName`        | `route.ts:133`          | ✅ Mapped |
| 4   | Institution              | Local DB (connected via `institutionId` parameter)          | `route.ts:144`          | ✅ Mapped |
| 5   | Department               | `currentEmployment.subEntityName`                           | `route.ts:134`          | ✅ Mapped |
| 6   | Appointment Type         | `currentEmployment.appointmentTypeName`                     | `route.ts:135`          | ✅ Mapped |
| 7   | Contract Type            | `activeContract.contractTypeName`                           | `route.ts:136`          | ✅ Mapped |
| 8   | Recent Title Date        | `currentEmployment.fromDate`                                | `route.ts:137`          | ✅ Mapped |
| 9   | Current Reporting Office | `currentEmployment.divisionName \|\| subEntityName`         | `route.ts:138`          | ✅ Mapped |
| 10  | Current Workplace        | `currentEmployment.entityName`                              | `route.ts:139`          | ✅ Mapped |
| 11  | Employment Date          | `personalInfo.employmentDate`                               | `route.ts:140`          | ✅ Mapped |
| 12  | Confirmation Date        | `personalInfo.employmentConfirmationDate`                   | `route.ts:141`          | ✅ Mapped |
| 13  | Retirement Date          | `activeContract.toDate` (if not '1900-01-01T00:00:00')      | `route.ts:110-115, 142` | ✅ Mapped |

**Additional Computed Field:**

- **Status**: Derived from `personalInfo.isEmployeeConfirmed` and `currentEmployment.employeeStatusName`
  - Logic: `route.ts:98-108, 143`
  - Values: "Confirmed", "On Probation", "Retired", "Resigned", "Terminated", "Dismissed"

**Coverage: 13/13 (100%)**

### ❌ Section 3: Employee Documents - NOT AVAILABLE (0/4 fields)

These documents are **NOT provided** by HRIMS API and are stored locally in the CSMS database:

| #   | Document Type       | HRIMS Availability | Storage Location                            |
| --- | ------------------- | ------------------ | ------------------------------------------- |
| 1   | Ardhil-hali         | ❌ Not in HRIMS    | Local DB (`Employee.ardhilHaliUrl`)         |
| 2   | Confirmation Letter | ❌ Not in HRIMS    | Local DB (`Employee.confirmationLetterUrl`) |
| 3   | Job Contract        | ❌ Not in HRIMS    | Local DB (`Employee.jobContractUrl`)        |
| 4   | Birth Certificate   | ❌ Not in HRIMS    | Local DB (`Employee.birthCertificateUrl`)   |

**Coverage: 0/4 (0%)**

**Note:** These documents must be uploaded manually through the CSMS interface by authorized users (HRO, HHRMD, HRMO, DO, CSCS, PO, ADMIN roles).

### ❌ Section 4: Employee Certificates - NOT AVAILABLE (0/9 types)

Educational certificates (PDF documents) are **NOT provided** by HRIMS API, though `educationHistories` provides metadata:

| #   | Certificate Type                                       | HRIMS Availability | Storage Location                 |
| --- | ------------------------------------------------------ | ------------------ | -------------------------------- |
| 1   | Certificate of primary education                       | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 2   | Certificate of Secondary education (Form IV)           | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 3   | Advanced Certificate of Secondary education (Form VII) | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 4   | Certificate                                            | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 5   | Diploma                                                | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 6   | Advanced Diploma                                       | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 7   | Bachelor Degree                                        | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 8   | Master Degree                                          | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |
| 9   | PHd                                                    | ❌ Not in HRIMS    | Local DB (`EmployeeCertificate`) |

**Coverage: 0/9 (0%)**

**What HRIMS Provides:** `educationHistories` array with metadata (level names, institutions, dates) but NOT the actual certificate documents.

### ⚠️ Employee Photo - AVAILABLE VIA SEPARATE REQUEST

Employee photos are available from HRIMS but require a **separate API call**:

| Field         | Request ID | Endpoint         | Parameter Required |
| ------------- | ---------- | ---------------- | ------------------ |
| Profile Photo | **203**    | `/api/Employees` | `payrollNumber`    |

**Implementation:**

- Test endpoint: `/src/app/api/hrims/test/route.ts:225-317`
- Not currently integrated in the fetch-by-institution flow
- Could be added as a follow-up fetch after employee creation

**Response Structure:**

```json
{
  "code": 200,
  "photo": {
    "content": "base64-encoded-image-data",
    "contentType": "image/jpeg"
  }
}
```

## Summary Statistics

### Overall Data Coverage

| Section               | Fields Available | Fields Mapped | Coverage                |
| --------------------- | ---------------- | ------------- | ----------------------- |
| Personal Information  | 11               | 11            | ✅ 100%                 |
| Employment Summary    | 13               | 13            | ✅ 100%                 |
| Employee Documents    | 4                | 0             | ❌ 0%                   |
| Employee Certificates | 9                | 0             | ❌ 0%                   |
| Employee Photo        | 1                | 0\*           | ⚠️ Available separately |
| **TOTAL**             | **38**           | **24**        | **63.2%**               |

\*Photo available via RequestId 203 but not currently integrated

### What Can Be Automated from HRIMS

**✅ Fully Automated (24 fields):**

- All personal information
- All employment details
- Employee status determination

**❌ Not Available from HRIMS (13 items):**

- 4 core documents (Ardhil-hali, Confirmation Letter, Job Contract, Birth Certificate)
- 9 educational certificates (actual PDF documents)

**⚠️ Available But Requires Additional Implementation (1 item):**

- Employee photo (RequestId 203)

## Implementation Details

### Current Implementation

**File:** `/src/app/api/hrims/fetch-by-institution/route.ts`

**Function:** `saveEmployeeFromDetailedData()` (Lines 50-182)

This function:

1. Receives detailed employee data from HRIMS API
2. Extracts and transforms data from multiple nested objects
3. Maps HRIMS field names to CSMS database schema
4. Handles data validation (skips employees without ZanID)
5. Performs upsert operation (update existing or create new employee)

### Data Transformation Examples

**Gender Mapping:**

```typescript
const gender =
  personalInfo.genderName === 'Mwanamme'
    ? 'Male'
    : personalInfo.genderName === 'Mwanamke'
      ? 'Female'
      : personalInfo.genderName;
```

**Status Determination:**

```typescript
let status = 'On Probation';
if (personalInfo.isEmployeeConfirmed) {
  status = 'Confirmed';
} else if (currentEmployment) {
  const empStatus = currentEmployment.employeeStatusName?.toLowerCase();
  if (empStatus?.includes('staafu')) status = 'Retired';
  else if (empStatus?.includes('hayupo')) status = 'Resigned';
  else if (empStatus?.includes('aachishwa')) status = 'Terminated';
  else if (empStatus?.includes('fukuzwa')) status = 'Dismissed';
  // ...
}
```

**Address Construction:**

```typescript
const contactAddress =
  [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
    .filter((part) => part && part.trim())
    .join(', ') || null;
```

## Related HRIMS Request IDs

| Request ID | Purpose                        | Parameters                                         | Usage             |
| ---------- | ------------------------------ | -------------------------------------------------- | ----------------- |
| 201        | Get list of all employees      | `PageNumber`, `PageSize`                           | Pagination        |
| 202        | Get single employee by payroll | `RequestBody: payrollNumber`                       | Individual lookup |
| 203        | Get employee photo             | `RequestBody: payrollNumber`                       | Photo fetch       |
| 204        | Get employees by Vote Code     | `PageNumber`, `PageSize`, `RequestBody: voteCode`  | Institution fetch |
| 205        | Get employees by TIN Number    | `PageNumber`, `PageSize`, `RequestBody: tinNumber` | Institution fetch |

## Testing the Integration

### Via Admin Dashboard

1. Navigate to: http://10.0.225.14:9002/dashboard/admin/fetch-data
2. Select an institution with TIN number
3. Click "Fetch Data"
4. Review results

### Via Test Page

1. Navigate to: http://10.0.225.14:9002/dashboard/admin/test-hrims
2. Configure parameters:
   - TIN Number: 119060370 (default)
   - Page Number: 0
   - Page Size: 10
3. Click "Run HRIMS Tests"
4. Review "Test 5: Get employees by TIN Number" results

### Via Script

```bash
cd /home/nextjs/scripts
./run-hrims-fetch.sh
```

See `HRIMS_FETCH_README.md` for detailed script documentation.

## Recommendations

### 1. Photo Integration (Optional Enhancement)

Consider adding RequestId 203 integration to fetch employee photos during the bulk fetch process:

```typescript
// After saving employee, fetch photo
if (savedEmployee.payrollNumber) {
  const photoResponse = await fetchFromHRIMS('203', {
    RequestBody: savedEmployee.payrollNumber,
  });

  if (photoResponse.photo?.content) {
    // Save photo to storage and update employee.profileImageUrl
  }
}
```

**Considerations:**

- Increases fetch time significantly (1 additional API call per employee)
- Requires image storage solution
- May hit HRIMS API rate limits

### 2. Document Management

Documents and certificates should continue to be managed locally:

- Manual upload by authorized HR staff
- Quality control and verification
- Compliance with document retention policies

### 3. Data Synchronization

Consider implementing:

- Periodic sync to update employee data from HRIMS
- Change detection to identify updated records
- Conflict resolution for locally modified data

## Support and References

### Documentation Files

- `HRIMS_FETCH_README.md` - Bulk fetch script documentation
- `OVERNIGHT_FETCH_GUIDE.md` - Overnight batch processing guide
- `HRIMS_DATA_MAPPING.md` - This file

### Code References

- Test API: `/src/app/api/hrims/test/route.ts`
- Fetch API: `/src/app/api/hrims/fetch-by-institution/route.ts`
- Profile Page: `/src/app/dashboard/profile/page.tsx`
- Test UI: `/src/app/dashboard/admin/test-hrims/page.tsx`

### Key Configuration

- HRIMS API Base URL: `http://10.0.217.11:8135/api`
- HRIMS Endpoint: `/api/Employees`
- Timeout: 15 minutes per institution fetch
- Page Size: 10,000 employees per request

---

**Last Updated:** 2025-12-08
**Version:** 1.0
**Author:** Claude Code Assistant
**Location:** `/home/nextjs/scripts/HRIMS_DATA_MAPPING.md`
