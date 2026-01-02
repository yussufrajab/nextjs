# USER ACCEPTANCE TEST (UAT) DOCUMENT
## HRIMS API INTEGRATION - CSMS

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | User Acceptance Test - HRIMS API Integration |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | December 20, 2025 |
| **Test Environment** | http://10.0.225.15:9002/dashboard/admin/test-hrims |
| **HRIMS API URL** | http://10.0.217.11:8135/api/Employees |
| **Prepared By** | ___________________ |
| **Reviewed By** | ___________________ |
| **Approved By** | ___________________ |

---

## 1. Introduction

### 1.1 Purpose
This User Acceptance Test (UAT) document is designed to verify that the HRIMS API Integration in the Civil Service Management System (CSMS) meets the specified business requirements and functions correctly in a production-like environment.

### 1.2 Scope
The UAT covers the following HRIMS integration functionalities:
- Fetching all employees with pagination (RequestId 201)
- Fetching individual employee details by payroll number (RequestId 202)
- Fetching employee photographs (RequestId 203)
- Fetching employees by institution/vote code (RequestId 204)
- Fetching employee documents (RequestId 206)
- Data synchronization and storage in CSMS
- MinIO integration for photos and documents

### 1.3 Test Objectives
- Verify all HRIMS API endpoints function correctly
- Validate data mapping from HRIMS to CSMS
- Ensure proper error handling and user feedback
- Confirm pagination functionality works as expected
- Validate document and photo retrieval and storage
- Test performance under various data loads

---

## 2. Test Environment

### 2.1 Hardware/Software Requirements

| Component | Specification |
|-----------|--------------|
| **Server** | Internal Network Server: 10.0.217.11 |
| **Port** | 8135 |
| **Protocol** | HTTP |
| **Test Interface** | http://10.0.225.15:9002/dashboard/admin/test-hrims |
| **Database** | PostgreSQL |
| **Storage** | MinIO Object Storage |

### 2.2 Access Requirements
- Internal network access to 10.0.217.11:8135
- Admin credentials for CSMS test interface
- HRIMS API authentication credentials
- MinIO storage access

### 2.3 Test Data Requirements
- Sample employee records in HRIMS
- Valid payroll numbers for testing
- Vote codes/TIN numbers for institutions
- Employee records with photos
- Employee records with documents (Ardhilihali, Birth Certificate, etc.)

---

## 3. Test Cases

---

### **Interface:** Employee Data Synchronization Module
### **Test Case No.: 1**

**Process/Function Name:** Fetch All Employees (Paginated) - RequestId 201

**Function Description:** This function retrieves a paginated list of all employees from the HRIMS system. It allows bulk synchronization of employee data from HRIMS to CSMS with configurable page sizes. The system supports pagination to handle large datasets efficiently and provides real-time progress updates via Server-Sent Events (SSE).

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 1.1 | Basic Pagination - First Page | 1. Login to CSMS Admin Interface<br>2. Navigate to HRIMS Test Interface<br>3. Select Test 1 (Fetch All - Page 0)<br>4. Set Page Size to 100<br>5. Click "Run Test" | - HTTP 200 status code returned<br>- Response contains "Success" status<br>- `currentPage` = 0<br>- `currentDataSize` ≤ 100<br>- `overallDataSize` shows total records<br>- Employee data array populated<br>- All required fields present in personalInfo<br>- Test completes within 120 seconds | | | |
| 1.2 | Pagination - Middle Page | 1. Login to CSMS Admin Interface<br>2. Navigate to HRIMS Test Interface<br>3. Select Test 1<br>4. Set Page Number to 5<br>5. Set Page Size to 50<br>6. Click "Run Test" | - HTTP 200 status returned<br>- `currentPage` = 5<br>- `currentDataSize` ≤ 50<br>- Data retrieved from middle of dataset<br>- No duplicate records from previous pages | | | |
| 1.3 | Pagination - Last Page | 1. Navigate to HRIMS Test Interface<br>2. Calculate last page number based on overallDataSize<br>3. Set appropriate page number<br>4. Set Page Size to 100<br>5. Run Test | - HTTP 200 status<br>- Last page data retrieved correctly<br>- `currentDataSize` may be less than page size<br>- No empty results<br>- `currentDataSize` = remaining records | | | |
| 1.4 | Different Page Sizes | 1. Test with Page Size = 10<br>2. Test with Page Size = 50<br>3. Test with Page Size = 100<br>4. Compare results | - All page sizes return valid data<br>- `currentDataSize` matches requested size<br>- Larger page sizes complete faster<br>- Total records remain consistent | | | |
| 1.5 | Empty Page Request | 1. Set Page Number beyond available data<br>2. Set Page Size to 100<br>3. Run Test | - System returns appropriate response<br>- No error occurs<br>- Empty data array or informative message<br>- HTTP 200 status maintained | | | |
| 1.6 | Data Field Validation | 1. Run Test 1 with Page 0, Size 10<br>2. Inspect returned employee data<br>3. Verify all fields | - All personal info fields present:<br>&nbsp;&nbsp;• zanIdNumber<br>&nbsp;&nbsp;• payrollNumber<br>&nbsp;&nbsp;• firstName, middleName, lastName<br>&nbsp;&nbsp;• genderName<br>&nbsp;&nbsp;• birthDate<br>&nbsp;&nbsp;• phoneNumbers<br>- Employment histories present<br>- Salary information included<br>- Education histories available<br>- Contract details present | | | |

---

### **Interface:** Employee Detail Retrieval Module
### **Test Case No.: 2**

**Process/Function Name:** Fetch Single Employee by Payroll Number - RequestId 202

**Function Description:** This function retrieves comprehensive information for a specific employee using their payroll number or ZanID. It provides detailed personal information, employment history, salary details, education background, and contract information for individual employee verification and updates.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 2.1 | Fetch Employee by Valid Payroll Number | 1. Login to CSMS Admin Interface<br>2. Navigate to HRIMS Test Interface<br>3. Select Test 2<br>4. Enter valid payroll number (e.g., "536151")<br>5. Click "Run Test" | - HTTP 200 status code<br>- "Success" status message<br>- "Employee found" message<br>- Complete employee data returned<br>- All sections populated:<br>&nbsp;&nbsp;• Personal Info<br>&nbsp;&nbsp;• Employment Histories<br>&nbsp;&nbsp;• Salary Information<br>&nbsp;&nbsp;• Education Histories<br>&nbsp;&nbsp;• Contract Details<br>- Response time < 30 seconds | | | |
| 2.2 | Fetch Employee by ZanID | 1. Navigate to Test Interface<br>2. Select Test 2<br>3. Enter valid ZanID instead of payroll number<br>4. Run Test | - HTTP 200 status<br>- Employee found successfully<br>- Same data as payroll number search<br>- All fields populated correctly | | | |
| 2.3 | Invalid Payroll Number | 1. Select Test 2<br>2. Enter non-existent payroll number<br>3. Run Test | - Appropriate error response<br>- "Employee not found" message or similar<br>- No system error<br>- User-friendly error display | | | |
| 2.4 | Employment History Validation | 1. Fetch employee with Test 2<br>2. Examine employment histories<br>3. Verify current employment flag | - Multiple employment records if applicable<br>- One record marked as `isCurrent: true`<br>- All history fields populated:<br>&nbsp;&nbsp;• titleName<br>&nbsp;&nbsp;• gradeName<br>&nbsp;&nbsp;• entityName<br>&nbsp;&nbsp;• appointmentTypeName<br>&nbsp;&nbsp;• fromDate, toDate<br>&nbsp;&nbsp;• employeeStatusName | | | |
| 2.5 | Salary Information Validation | 1. Fetch employee data<br>2. Review salary information section<br>3. Verify current salary flag | - Current salary marked with `isCurrent: true`<br>- Basic salary amount present<br>- Salary scale name included<br>- Data format correct | | | |
| 2.6 | Education Background Validation | 1. Retrieve employee details<br>2. Check education histories<br>3. Verify highest qualification flag | - Education records present<br>- Highest qualification marked with `isEmploymentHighest: true`<br>- Institution names included<br>- Completion years present | | | |
| 2.7 | Special Characters in Search | 1. Test with payroll numbers containing special characters or spaces<br>2. Run Test | - System handles input correctly<br>- No crashes or errors<br>- Appropriate response returned | | | |

---

### **Interface:** Employee Photo Management Module
### **Test Case No.: 3**

**Process/Function Name:** Fetch Employee Photo - RequestId 203

**Function Description:** This function retrieves employee photographs from HRIMS in base64 encoded format. The photos are then converted and stored in MinIO object storage, with URLs saved to the CSMS database. This enables profile pictures to be displayed throughout the system.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 3.1 | Fetch Photo for Employee with Photo | 1. Login to CSMS<br>2. Navigate to HRIMS Test Interface<br>3. Select Test 4 (Fetch Photo)<br>4. Enter payroll number of employee with photo (e.g., "111660")<br>5. Run Test | - HTTP 200 status<br>- "Success" message<br>- Base64 encoded photo data in `photoContent`<br>- Photo data length > 0<br>- Valid image data format<br>- Response time < 30 seconds | | | |
| 3.2 | Base64 Encoding Validation | 1. Fetch employee photo<br>2. Copy base64 data from response<br>3. Validate base64 format | - Base64 string is valid<br>- String starts with appropriate prefix (if any)<br>- Can be decoded to valid image<br>- No corruption in encoding | | | |
| 3.3 | Photo Upload to MinIO | 1. Fetch employee photo via API<br>2. System should auto-upload to MinIO<br>3. Verify MinIO storage | - Photo successfully uploaded to MinIO<br>- MinIO URL generated<br>- URL is accessible<br>- Photo displays correctly<br>- File format is correct (JPG/PNG) | | | |
| 3.4 | Employee Without Photo | 1. Select Test 4<br>2. Enter payroll number of employee without photo<br>3. Run Test | - Graceful handling of missing photo<br>- Appropriate message returned<br>- No system error<br>- Photo field null or empty<br>- System continues functioning | | | |
| 3.5 | Database Update with Photo URL | 1. Fetch and store employee photo<br>2. Check employee record in CSMS database<br>3. Verify profileImageUrl field | - `profileImageUrl` field updated<br>- URL points to MinIO storage<br>- URL format is valid<br>- Image accessible via URL | | | |
| 3.6 | Large Photo File Handling | 1. Fetch photo for employee with high-resolution image<br>2. Monitor response time and size<br>3. Verify successful processing | - Large photos handled correctly<br>- No timeout errors<br>- Photo compressed if needed<br>- Response within timeout limit<br>- MinIO storage successful | | | |
| 3.7 | Photo Display in UI | 1. After photo sync<br>2. Navigate to employee profile in CSMS<br>3. Verify photo display | - Photo displays correctly in UI<br>- Image quality acceptable<br>- Proper sizing and aspect ratio<br>- No broken image links | | | |

---

### **Interface:** Institution Employee Sync Module
### **Test Case No.: 4**

**Process/Function Name:** Fetch Employees by Vote Code/TIN - RequestId 204

**Function Description:** This function retrieves all employees belonging to a specific institution using the institution's vote code or TIN number. It supports pagination and enables bulk synchronization of employees for specific ministries, departments, or institutions.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 4.1 | Fetch Employees by Valid Vote Code | 1. Login to CSMS<br>2. Navigate to Test Interface<br>3. Select Test 3 (Vote Code Search)<br>4. Enter valid vote code (e.g., "004")<br>5. Set Page Number = 0<br>6. Set Page Size = 50<br>7. Run Test | - HTTP 200 status<br>- Success message<br>- Employee list for institution returned<br>- All employees belong to specified vote code<br>- Pagination data correct<br>- `currentDataSize` ≤ 50<br>- `overallDataSize` shows total employees in institution | | | |
| 4.2 | Pagination for Large Institutions | 1. Select institution with 100+ employees<br>2. Fetch first page (Page 0, Size 50)<br>3. Fetch second page (Page 1, Size 50)<br>4. Compare results | - Both pages return different employees<br>- No duplicate records<br>- Total count consistent across pages<br>- All employees from same institution<br>- Pagination metadata accurate | | | |
| 4.3 | Small Institution (Few Employees) | 1. Select vote code for small institution<br>2. Set Page Size = 100<br>3. Run Test | - All institution employees returned<br>- `currentDataSize` = total employees<br>- `overallDataSize` equals `currentDataSize`<br>- Only one page needed | | | |
| 4.4 | Invalid Vote Code | 1. Enter non-existent vote code<br>2. Run Test | - Appropriate error handling<br>- "No employees found" or similar message<br>- Empty data array<br>- No system crash<br>- User-friendly error message | | | |
| 4.5 | Vote Code Format Validation | 1. Test with vote code with leading zeros (e.g., "004")<br>2. Test without leading zeros (e.g., "4")<br>3. Compare results | - System handles both formats correctly<br>- Same results returned<br>- No formatting issues | | | |
| 4.6 | Data Consistency Check | 1. Fetch employees by vote code<br>2. Verify all returned employees<br>3. Check employment history entity names | - All employees show correct institution<br>- Entity names match vote code<br>- No employees from other institutions<br>- Data integrity maintained | | | |
| 4.7 | Performance with Different Page Sizes | 1. Fetch with Page Size = 10<br>2. Fetch with Page Size = 50<br>3. Fetch with Page Size = 100<br>4. Record response times | - Larger page sizes complete faster for bulk data<br>- All sizes return valid data<br>- Response times acceptable (<120s)<br>- No timeout errors | | | |

---

### **Interface:** Employee Document Management Module
### **Test Case No.: 5**

**Process/Function Name:** Fetch Employee Documents - RequestId 206

**Function Description:** This function retrieves various employee documents from HRIMS including Ardhilihali (ID application), Birth Certificates, Confirmation Letters, and Job Contracts. Documents are fetched individually by type to prevent timeout issues, encoded in base64 format, and stored in MinIO with URLs saved to CSMS database.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 5.1 | Fetch Ardhilihali Document | 1. Login to CSMS<br>2. Navigate to Test Interface<br>3. Select Test 5 (Documents)<br>4. Check only "Ardhilihal"<br>5. Enter employee payroll number (e.g., "149391")<br>6. Run Test | - HTTP 200 status<br>- Success message<br>- Document data returned<br>- Base64 PDF content in `attachmentContent`<br>- `attachmentType` = "Ardhilihal"<br>- Document size > 0<br>- Response within 120 seconds | | | |
| 5.2 | Fetch Birth Certificate | 1. Select Test 5<br>2. Check only "Cheti cha Kuzaliwa" (Birth Certificate)<br>3. Enter valid payroll number<br>4. Run Test | - HTTP 200 status<br>- Birth certificate returned<br>- Valid base64 PDF data<br>- Correct document type identifier<br>- File size reasonable | | | |
| 5.3 | Fetch Confirmation Letter | 1. Select Test 5<br>2. Check only "Barua ya Uthibitisho" (Confirmation Letter)<br>3. Enter payroll number<br>4. Run Test | - Confirmation letter retrieved<br>- Base64 PDF data present<br>- Correct document type<br>- Valid PDF format | | | |
| 5.4 | Fetch Job Contract | 1. Select Test 5<br>2. Check only "Mkataba wa kazi" (Job Contract)<br>3. Enter payroll number<br>4. Run Test | - Job contract returned<br>- Valid document data<br>- Correct document type<br>- PDF format verified | | | |
| 5.5 | Fetch Multiple Document Types | 1. Select Test 5<br>2. Check "Ardhilihal" and "Cheti cha Kuzaliwa"<br>3. Enter payroll number<br>4. Run Test | - Both documents retrieved<br>- Separate responses for each type<br>- All documents valid<br>- No data mixing between types<br>- Response time acceptable | | | |
| 5.6 | Document Upload to MinIO | 1. Fetch employee documents<br>2. Verify MinIO storage<br>3. Check database records | - Documents uploaded to MinIO<br>- URLs generated correctly<br>- Database fields updated:<br>&nbsp;&nbsp;• ardhilHaliUrl<br>&nbsp;&nbsp;• birthCertificateUrl<br>&nbsp;&nbsp;• confirmationLetterUrl<br>&nbsp;&nbsp;• jobContractUrl<br>- All URLs accessible | | | |
| 5.7 | Missing Document Handling | 1. Request document type not available for employee<br>2. Run Test | - Graceful error handling<br>- Appropriate message<br>- System continues functioning<br>- No crash or timeout<br>- Other available documents still fetched | | | |
| 5.8 | Base64 PDF Validation | 1. Fetch any document<br>2. Extract base64 data<br>3. Decode and verify | - Valid base64 encoding<br>- Decodes to valid PDF<br>- PDF opens correctly<br>- Content readable<br>- No corruption | | | |
| 5.9 | Document Size Handling | 1. Fetch documents of various sizes<br>2. Monitor response times<br>3. Verify successful processing | - Small documents (<1MB) process quickly<br>- Large documents (<5MB) complete within timeout<br>- No memory issues<br>- All sizes upload to MinIO successfully | | | |
| 5.10 | Split Request Architecture | 1. Select all 4 document types<br>2. Run Test<br>3. Monitor individual requests | - System makes separate request per document type<br>- Prevents timeout issues<br>- All documents retrieved eventually<br>- Progress shown for each type | | | |

---

### **Interface:** Data Synchronization and Storage Module
### **Test Case No.: 6**

**Process/Function Name:** Employee Data Synchronization to CSMS Database

**Function Description:** This function handles the complete synchronization process of employee data from HRIMS to CSMS database. It includes data mapping, transformation, validation, and storage of employee records, photos, and documents with appropriate error handling and logging.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 6.1 | Single Employee Sync | 1. Fetch employee data via API<br>2. Trigger sync process<br>3. Verify database record<br>4. Check all fields | - Employee record created in CSMS database<br>- All fields mapped correctly:<br>&nbsp;&nbsp;• zanId from zanIdNumber<br>&nbsp;&nbsp;• name concatenated correctly<br>&nbsp;&nbsp;• dates converted properly<br>&nbsp;&nbsp;• ministry from entityName<br>&nbsp;&nbsp;• department from subEntityName<br>- No data loss during mapping<br>- Timestamps recorded | | | |
| 6.2 | Bulk Employee Sync | 1. Fetch page of employees (50-100)<br>2. Trigger bulk sync<br>3. Monitor progress<br>4. Verify all records | - All employees synced successfully<br>- Progress updates via SSE<br>- Success/failure count accurate<br>- Failed records logged with reasons<br>- Database updated for all successful syncs<br>- Transaction handling proper | | | |
| 6.3 | Update Existing Employee | 1. Sync employee already in database<br>2. Modify data in HRIMS<br>3. Re-sync employee<br>4. Verify update | - Existing record updated (not duplicated)<br>- New data overwrites old<br>- Timestamps updated<br>- No data integrity issues<br>- Update logged properly | | | |
| 6.4 | Gender Mapping | 1. Sync employee with "Mwanamme"<br>2. Sync employee with "Mwanamke"<br>3. Check database values | - "Mwanamme" mapped to "Male" or appropriate value<br>- "Mwanamke" mapped to "Female" or appropriate value<br>- Consistent mapping across all records | | | |
| 6.5 | Date Format Conversion | 1. Sync employee<br>2. Verify date fields in database<br>3. Compare with HRIMS data | - ISO date strings converted to DateTime<br>- Dates stored in correct format<br>- No date corruption<br>- Timezone handling correct<br>- All date fields converted:<br>&nbsp;&nbsp;• birthDate<br>&nbsp;&nbsp;• employmentDate<br>&nbsp;&nbsp;• confirmationDate<br>&nbsp;&nbsp;• retirementDate | | | |
| 6.6 | Null/Missing Data Handling | 1. Sync employee with missing optional fields<br>2. Verify database record | - Null values handled gracefully<br>- Required fields validated<br>- Optional fields can be null<br>- No errors for missing data<br>- Database constraints respected | | | |
| 6.7 | Current Employment/Salary Flags | 1. Sync employee with multiple employment records<br>2. Check which is marked as current<br>3. Verify in database | - Current employment (isCurrent: true) used for primary fields<br>- Current salary (isCurrent: true) stored<br>- Historical data preserved if needed<br>- Correct current values in main fields | | | |
| 6.8 | Address Concatenation | 1. Sync employee<br>2. Check contactAddress field<br>3. Verify concatenation | - Address properly concatenated:<br>&nbsp;&nbsp;houseNumber + street + city<br>- Spaces added correctly<br>- Null fields handled<br>- Format consistent | | | |
| 6.9 | Institution Linking | 1. Sync employee<br>2. Verify institution linkage<br>3. Check foreign key | - Employee linked to correct institution<br>- institutionId set correctly<br>- Foreign key relationship valid<br>- Institution exists in database | | | |

---

### **Interface:** Error Handling and Recovery Module
### **Test Case No.: 7**

**Process/Function Name:** Error Handling, Logging, and Recovery

**Function Description:** This module tests the system's ability to handle various error scenarios gracefully, provide meaningful error messages to users, log errors appropriately, and recover from failures without data loss or system crashes.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 7.1 | Network Timeout Handling | 1. Simulate slow network<br>2. Attempt to fetch large dataset<br>3. Monitor timeout behavior | - Request times out after configured duration (120s for documents, 30s for others)<br>- User-friendly timeout message<br>- System remains stable<br>- Retry option available<br>- No data corruption | | | |
| 7.2 | HRIMS Server Unavailable | 1. Disconnect from HRIMS network<br>2. Attempt API call<br>3. Observe error handling | - Connection error caught<br>- Informative error message<br>- System doesn't crash<br>- Error logged<br>- User can retry when connection restored | | | |
| 7.3 | Invalid Authentication | 1. Use incorrect ApiKey or Token<br>2. Attempt API call<br>3. Check response | - 401/403 status code returned<br>- Authentication error message<br>- System doesn't expose credentials<br>- Error logged securely<br>- User notified of auth failure | | | |
| 7.4 | Malformed API Response | 1. Mock invalid JSON response from HRIMS<br>2. Attempt to process<br>3. Verify error handling | - JSON parsing error caught<br>- Doesn't crash application<br>- Error logged with details<br>- User notified of data issue<br>- Transaction rolled back if needed | | | |
| 7.5 | MinIO Upload Failure | 1. Simulate MinIO unavailability<br>2. Attempt photo/document upload<br>3. Verify handling | - Upload failure detected<br>- Error message displayed<br>- Employee record still saved without photo URL<br>- Error logged<br>- Retry mechanism available | | | |
| 7.6 | Database Connection Loss | 1. Simulate database disconnection during sync<br>2. Attempt to save data<br>3. Monitor recovery | - Database error caught<br>- Transaction rolled back<br>- No partial data saved<br>- Connection retry logic activated<br>- Data integrity maintained | | | |
| 7.7 | Duplicate Employee Handling | 1. Attempt to sync same employee twice<br>2. Check for duplicates<br>3. Verify unique constraint handling | - Duplicate detection works<br>- Update instead of insert performed<br>- No duplicate records created<br>- Appropriate message shown<br>- Database constraints enforced | | | |
| 7.8 | Concurrent Request Handling | 1. Trigger multiple API requests simultaneously<br>2. Monitor system behavior<br>3. Check data consistency | - System handles concurrent requests<br>- No race conditions<br>- All requests complete successfully<br>- Data remains consistent<br>- No deadlocks | | | |
| 7.9 | Error Logging Verification | 1. Trigger various errors<br>2. Check application logs<br>3. Verify log entries | - All errors logged with:<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Error type<br>&nbsp;&nbsp;• Stack trace<br>&nbsp;&nbsp;• Request details<br>- Sensitive data not logged<br>- Log levels appropriate<br>- Logs accessible for debugging | | | |
| 7.10 | Recovery After Error | 1. Cause an error during sync<br>2. Resolve the issue<br>3. Retry operation<br>4. Verify success | - System recovers after error resolution<br>- Retry mechanism works<br>- No residual issues<br>- Data synced successfully on retry<br>- No manual intervention needed | | | |

---

### **Interface:** Performance and Load Testing Module
### **Test Case No.: 8**

**Process/Function Name:** System Performance Under Various Loads

**Function Description:** This module tests the system's performance characteristics under different load conditions, including response times, throughput, and resource utilization. It ensures the integration can handle production workloads efficiently.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 8.1 | Single Employee Fetch Performance | 1. Fetch single employee<br>2. Record response time<br>3. Repeat 10 times<br>4. Calculate average | - Average response time < 5 seconds<br>- Consistent performance<br>- No degradation over time<br>- 95th percentile < 10 seconds | | | |
| 8.2 | Paginated Fetch Performance | 1. Fetch page with 100 employees<br>2. Record response time<br>3. Test different page numbers<br>4. Compare performance | - Response time < 30 seconds<br>- Performance consistent across pages<br>- No timeout errors<br>- Memory usage stable | | | |
| 8.3 | Photo Fetch Performance | 1. Fetch 10 employee photos<br>2. Record individual times<br>3. Calculate average and max | - Average time < 10 seconds per photo<br>- Max time < 30 seconds<br>- No timeouts<br>- Concurrent fetches handled | | | |
| 8.4 | Document Fetch Performance | 1. Fetch documents for 5 employees<br>2. Record time per document type<br>3. Monitor total time | - Individual document < 30 seconds<br>- All documents for one employee < 120 seconds<br>- No timeout errors<br>- Sequential fetches complete successfully | | | |
| 8.5 | Bulk Sync Performance | 1. Sync 500 employees<br>2. Monitor progress<br>3. Record total time<br>4. Check resource usage | - Bulk sync completes successfully<br>- Progress updates real-time<br>- No memory leaks<br>- CPU usage acceptable<br>- Database connections managed properly | | | |
| 8.6 | Large Dataset Pagination | 1. Fetch from institution with 1000+ employees<br>2. Paginate through all pages<br>3. Monitor performance | - All pages load successfully<br>- No performance degradation on later pages<br>- Consistent response times<br>- Total time reasonable for dataset size | | | |
| 8.7 | Network Bandwidth Usage | 1. Monitor network traffic during various operations<br>2. Measure data transfer sizes<br>3. Identify optimization opportunities | - Reasonable bandwidth usage<br>- No unnecessary data transfer<br>- Compression used where appropriate<br>- Base64 overhead acceptable | | | |
| 8.8 | Database Query Performance | 1. Monitor database queries during sync<br>2. Check query execution times<br>3. Identify slow queries | - All queries execute < 1 second<br>- Proper indexes used<br>- No N+1 query problems<br>- Batch operations efficient | | | |
| 8.9 | MinIO Upload Performance | 1. Upload 20 photos simultaneously<br>2. Upload 20 documents<br>3. Monitor upload times | - Photo uploads < 5 seconds each<br>- Document uploads < 10 seconds each<br>- Concurrent uploads handled<br>- No failures due to load | | | |
| 8.10 | Peak Load Testing | 1. Simulate multiple users testing simultaneously<br>2. Run all operations concurrently<br>3. Monitor system stability | - System remains stable under load<br>- All operations complete successfully<br>- Response times acceptable<br>- No crashes or errors<br>- Resource usage within limits | | | |

---

### **Interface:** User Interface and Experience Module  
### **Test Case No.: 9**

**Process/Function Name:** Test Interface Usability and User Experience

**Function Description:** This module tests the HRIMS test interface at http://10.0.225.15:9002/dashboard/admin/test-hrims for usability, clarity, and effectiveness in allowing administrators to test and monitor the HRIMS integration.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 9.1 | Test Interface Navigation | 1. Login to CSMS admin panel<br>2. Navigate to HRIMS test interface<br>3. Explore all sections | - Interface loads without errors<br>- All test options visible<br>- Clear navigation<br>- Responsive design<br>- No broken links | | | |
| 9.2 | Test Selection and Configuration | 1. Select different test types<br>2. Configure parameters<br>3. Verify input validation | - All test types selectable<br>- Input fields work correctly<br>- Validation provides helpful messages<br>- Default values appropriate<br>- Clear labels and instructions | | | |
| 9.3 | Real-time Progress Display | 1. Run bulk operation test<br>2. Monitor progress indicators<br>3. Verify real-time updates | - Progress bar displays correctly<br>- SSE updates in real-time<br>- Status messages clear<br>- Success/failure counts accurate<br>- No UI freezing | | | |
| 9.4 | Result Display and Formatting | 1. Run various tests<br>2. Review result displays<br>3. Check data formatting | - Results displayed clearly<br>- JSON formatted and readable<br>- Success indicators (✓) visible<br>- Error indicators (✗) clear<br>- Expandable/collapsible sections work | | | |
| 9.5 | Error Message Clarity | 1. Trigger various errors<br>2. Review error messages<br>3. Verify helpfulness | - Error messages user-friendly<br>- Technical details available but not overwhelming<br>- Suggested actions provided<br>- Error types clearly identified | | | |
| 9.6 | Response Data Inspection | 1. Run test successfully<br>2. Inspect response data<br>3. Verify all sections expandable | - Full response data viewable<br>- JSON syntax highlighted<br>- Large responses handle gracefully<br>- Copy/export options available<br>- Data structure clear | | | |
| 9.7 | Document Type Selection | 1. Select Test 5 (Documents)<br>2. Choose different document type combinations<br>3. Verify selection behavior | - Checkboxes work correctly<br>- Multiple selections allowed<br>- Clear indication of selected types<br>- Deselection works<br>- All 4 document types available | | | |
| 9.8 | Mobile Responsiveness | 1. Access test interface on tablet<br>2. Access on mobile device<br>3. Test functionality | - Interface adapts to screen size<br>- All functions accessible<br>- Readable on smaller screens<br>- Touch interactions work<br>- No horizontal scrolling required | | | |
| 9.9 | Help and Documentation | 1. Look for help sections<br>2. Review documentation links<br>3. Check tooltips and hints | - Help text available<br>- Tooltips on hover/click<br>- Documentation linked<br>- Examples provided<br>- Clear explanations of each test | | | |
| 9.10 | Export/Download Results | 1. Run test<br>2. Attempt to export/save results<br>3. Verify functionality | - Results can be copied<br>- Download option available if applicable<br>- Format appropriate (JSON/CSV/PDF)<br>- File naming logical<br>- Complete data exported | | | |

---

### **Interface:** Security and Access Control Module
### **Test Case No.: 10**

**Process/Function Name:** Security, Authentication, and Access Control

**Function Description:** This module tests the security aspects of the HRIMS integration including authentication, authorization, data protection, and secure communication to ensure sensitive employee data is properly protected.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 10.1 | API Authentication | 1. Review HRIMS API calls<br>2. Verify authentication headers<br>3. Check credential storage | - ApiKey and Token included in headers<br>- Credentials not exposed in UI<br>- Credentials securely stored<br>- Environment variables used<br>- No credentials in logs | | | |
| 10.2 | Access Control to Test Interface | 1. Attempt access without login<br>2. Login as non-admin user<br>3. Login as admin | - Redirected to login if not authenticated<br>- Non-admin users cannot access<br>- Only admin users can access test interface<br>- Appropriate error messages | | | |
| 10.3 | SQL Injection Prevention | 1. Enter SQL injection patterns in input fields<br>2. Attempt to exploit search parameters<br>3. Monitor database queries | - SQL injection attempts blocked<br>- Parameterized queries used<br>- Input sanitized<br>- No database errors<br>- Security logs record attempts | | | |
| 10.4 | Cross-Site Scripting (XSS) Prevention | 1. Enter script tags in input fields<br>2. Attempt XSS in search parameters<br>3. Review output rendering | - Script tags escaped/sanitized<br>- No script execution<br>- Output properly encoded<br>- No XSS vulnerabilities<br>- HTML entities handled correctly | | | |
| 10.5 | Data Encryption in Transit | 1. Monitor network traffic during API calls<br>2. Check internal HRIMS communication<br>3. Verify SSL/TLS where appropriate | - Sensitive data transmitted securely<br>- HTTPS used for web interface<br>- Internal network properly secured<br>- No plain text sensitive data in transit | | | |
| 10.6 | Sensitive Data Logging | 1. Review application logs<br>2. Check for sensitive data<br>3. Verify log access controls | - No passwords in logs<br>- No ZanID numbers in logs<br>- No bank account numbers logged<br>- PII properly redacted<br>- Logs secured with appropriate permissions | | | |
| 10.7 | Session Management | 1. Login to test interface<br>2. Remain idle for extended period<br>3. Attempt to use interface | - Session timeout implemented<br>- User prompted to re-login<br>- Session data cleared properly<br>- No unauthorized access after timeout | | | |
| 10.8 | File Upload Security (MinIO) | 1. Verify MinIO upload process<br>2. Check file type validation<br>3. Review access controls | - Only expected file types accepted (JPEG, PNG, PDF)<br>- File size limits enforced<br>- Malicious file upload prevented<br>- MinIO access properly secured<br>- URLs not guessable | | | |
| 10.9 | Error Information Disclosure | 1. Trigger various errors<br>2. Review error messages<br>3. Check for sensitive information leakage | - Error messages don't expose:<br>&nbsp;&nbsp;• Database structure<br>&nbsp;&nbsp;• Server paths<br>&nbsp;&nbsp;• Internal IPs<br>&nbsp;&nbsp;• Stack traces (to public)<br>- Generic errors for users<br>- Detailed errors in logs only | | | |
| 10.10 | Audit Trail | 1. Perform various operations<br>2. Review audit logs<br>3. Verify completeness | - All HRIMS API calls logged with:<br>&nbsp;&nbsp;• User who initiated<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Operation type<br>&nbsp;&nbsp;• Success/failure<br>&nbsp;&nbsp;• Number of records affected<br>- Audit logs tamper-evident<br>- Logs retained appropriately | | | |

---

## 4. Test Execution Schedule

| Phase | Start Date | End Date | Responsible Party |
|-------|------------|----------|------------------|
| **Phase 1:** Basic API Connectivity (Test Cases 1-2) | | | |
| **Phase 2:** Photo and Document Retrieval (Test Cases 3, 5) | | | |
| **Phase 3:** Institution-based Sync (Test Case 4) | | | |
| **Phase 4:** Data Synchronization (Test Case 6) | | | |
| **Phase 5:** Error Handling (Test Case 7) | | | |
| **Phase 6:** Performance Testing (Test Case 8) | | | |
| **Phase 7:** UI/UX Testing (Test Case 9) | | | |
| **Phase 8:** Security Testing (Test Case 10) | | | |
| **UAT Sign-off** | | | |

---

## 5. Test Entry and Exit Criteria

### 5.1 Entry Criteria
- HRIMS API integration development completed
- CSMS test environment configured and accessible
- Test data prepared in HRIMS system
- MinIO storage configured and accessible
- Test interface deployed at http://10.0.225.15:9002
- All stakeholders briefed on UAT process
- Test cases reviewed and approved

### 5.2 Exit Criteria
- All test cases executed
- At least 95% of test cases passed
- All critical and high priority defects resolved
- All medium priority defects documented with workarounds
- Performance benchmarks met
- Security requirements validated
- User acceptance documented
- Sign-off received from stakeholders

---

## 6. Defect Management

### 6.1 Defect Severity Levels

| Severity | Description | Example | Response Time |
|----------|-------------|---------|---------------|
| **Critical** | System crash, data loss, security breach | HRIMS API authentication fails completely | Immediate |
| **High** | Major functionality broken, no workaround | Cannot fetch any employee data | 24 hours |
| **Medium** | Functionality impaired but workaround exists | Slow performance but completes eventually | 48 hours |
| **Low** | Minor issue, cosmetic problem | UI formatting issue | Next sprint |

### 6.2 Defect Tracking Template

| Defect ID | Test Case | Severity | Description | Steps to Reproduce | Actual Result | Expected Result | Status | Resolution |
|-----------|-----------|----------|-------------|-------------------|---------------|----------------|--------|------------|
| | | | | | | | | |
| | | | | | | | | |

---

## 7. Assumptions and Dependencies

### 7.1 Assumptions
- HRIMS system will be available during testing hours
- Test data in HRIMS will remain stable during UAT
- Network connectivity between CSMS and HRIMS will be reliable
- MinIO storage will have sufficient capacity
- Admin users will have necessary permissions
- Test environment mirrors production configuration

### 7.2 Dependencies
- HRIMS API must be operational and accessible
- Network infrastructure between systems functional
- MinIO object storage operational
- CSMS database accessible
- Test accounts and credentials provided
- Sample employees with photos and documents available in HRIMS

---

## 8. Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| HRIMS API unavailable during testing | High | Medium | Schedule testing with HRIMS team, have backup testing window |
| Network connectivity issues | High | Low | Test during stable network hours, have IT support on standby |
| Insufficient test data | Medium | Low | Coordinate with HRIMS team to ensure adequate test data |
| Performance degradation under load | Medium | Medium | Conduct performance testing early, optimize before full UAT |
| Security vulnerabilities discovered | High | Low | Security review before UAT, penetration testing if needed |
| MinIO storage capacity issues | Low | Low | Monitor storage, provision additional capacity if needed |

---

## 9. Test Deliverables

1. Completed UAT test case document with results
2. Defect log with all identified issues
3. Performance test results and benchmarks
4. Security test results
5. Test execution logs
6. Screenshots/videos of critical test scenarios
7. UAT sign-off document
8. Lessons learned document
9. Recommendations for production deployment

---

## 10. Roles and Responsibilities

| Role | Responsibility | Name | Signature |
|------|---------------|------|-----------|
| **UAT Coordinator** | Overall UAT planning and execution | | |
| **Test Lead** | Test case execution and reporting | | |
| **Business Analyst** | Requirements validation | | |
| **System Administrator** | Test environment maintenance | | |
| **Developer** | Defect resolution | | |
| **Security Officer** | Security testing oversight | | |
| **Project Manager** | UAT approval and sign-off | | |

---

## 11. Test Results Summary

### 11.1 Overall Test Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Test Cases | 100 | 100% |
| Test Cases Executed | | |
| Test Cases Passed | | |
| Test Cases Failed | | |
| Test Cases Blocked | | |
| Test Cases Not Executed | | |

### 11.2 Test Case Results by Module

| Test Case No. | Module | Total Cases | Passed | Failed | Pass % |
|---------------|--------|-------------|--------|--------|--------|
| 1 | Employee Data Synchronization | 6 | | | |
| 2 | Employee Detail Retrieval | 7 | | | |
| 3 | Employee Photo Management | 7 | | | |
| 4 | Institution Employee Sync | 7 | | | |
| 5 | Employee Document Management | 10 | | | |
| 6 | Data Synchronization and Storage | 9 | | | |
| 7 | Error Handling and Recovery | 10 | | | |
| 8 | Performance and Load Testing | 10 | | | |
| 9 | User Interface and Experience | 10 | | | |
| 10 | Security and Access Control | 10 | | | |
| **TOTAL** | | **100** | | | |

---

## 12. Sign-Off

### 12.1 UAT Completion Sign-Off

I hereby certify that User Acceptance Testing for the HRIMS API Integration has been completed according to the test plan and that the system:
- ☐ Meets all specified business requirements
- ☐ Performs adequately under expected load
- ☐ Handles errors appropriately
- ☐ Meets security requirements
- ☐ Is ready for production deployment

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Business Owner** | | | |
| **Project Manager** | | | |
| **UAT Lead** | | | |
| **IT Manager** | | | |
| **Security Officer** | | | |

### 12.2 Conditions for Production Release

☐ All critical defects resolved  
☐ All high priority defects resolved  
☐ Medium priority defects documented with workarounds  
☐ Performance requirements met  
☐ Security requirements validated  
☐ User training completed  
☐ Documentation updated  
☐ Rollback plan prepared  
☐ Production deployment plan reviewed  
☐ Stakeholder approval received  

---

## 13. Appendix

### 13.1 Test Data Reference

**Sample Payroll Numbers for Testing:**
- Valid employee with photo: 111660
- Valid employee for documents: 149391
- Valid employee for general testing: 536151

**Sample Vote Codes:**
- Institution with multiple employees: 004
- Small institution: Wakala wa Vipimo Zanzibar -ZAWEMA

### 13.2 API Endpoint Reference

| Request Type | RequestId | Purpose | Timeout |
|--------------|-----------|---------|---------|
| Fetch All Employees | 201 | Paginated employee list | 120s |
| Fetch Single Employee | 202 | Individual employee details | 30s |
| Fetch Employee Photo | 203 | Employee photograph | 30s |
| Fetch by Vote Code | 204 | Institution employees | 120s |
| Fetch Documents | 206 | Employee documents by type | 120s |

### 13.3 Document Type Codes

| Document Type | Swahili Name | RequestBody Value |
|---------------|--------------|-------------------|
| Ardhilihali | Ardhilihal | 2 |
| Birth Certificate | Cheti cha Kuzaliwa | 3 |
| Confirmation Letter | Barua ya Uthibitisho | 8 |
| Job Contract | Mkataba wa kazi | 9 |

### 13.4 Glossary

| Term | Definition |
|------|------------|
| **HRIMS** | Human Resource Information Management System |
| **CSMS** | Civil Service Management System |
| **SSE** | Server-Sent Events - real-time data streaming |
| **MinIO** | Object storage system for photos and documents |
| **UAT** | User Acceptance Testing |
| **Vote Code/TIN** | Institution identifier in HRIMS |
| **ZanID** | Zanzibar National ID Number |
| **ZSSF** | Zanzibar Social Security Fund Number |

---

**End of UAT Document**

*Version: 1.0*  
*Date: December 20, 2025*  
*Document Status: DRAFT - Pending Review and Approval*
