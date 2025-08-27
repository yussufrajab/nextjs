# HRIMS Integration Specification Document

**Document Version**: 1.0  
**Date**: August 2025  
**System**: Civil Service Management System (CSMS) - Zanzibar  
**Integration Partner**: HRIMS (Human Resource Information Management System)

---

## 1. INTEGRATION OVERVIEW

### 1.1 Purpose
This document outlines the technical integration between the Civil Service Management System (CSMS) and the external Human Resource Information Management System (HRIMS). The integration enables real-time employee data synchronization and profile management.

### 1.2 Integration Flow
```
External System Request → CSMS Employee Sync API → HRIMS Employee Data API → Employee Core Data → CSMS Database → Immediate Profile Display
                                ↓
                         CSMS Background Process → HRIMS Documents API → Documents → Background Storage
                                ↓
                         CSMS Background Process → HRIMS Certificates API → Certificates → Background Storage
                                ↓
                         Complete Employee Profile Available via Search API
```

### 1.3 Key Requirements
- **Three-API Architecture**: Separate HRIMS endpoints for employee data, documents, and certificates
- **Optimized Data Reception**: Fast employee data sync with background document/certificate processing
- **Search Criteria**: ZanID OR Payroll Number + Institution Vote Number (mandatory)
- **Data Format**: JSON over HTTPS
- **Authentication**: Bearer token or API key
- **Employee Data Response Time**: Maximum 5 seconds (immediate profile availability)
- **Documents Response Time**: Maximum 15 seconds (background processing)
- **Certificates Response Time**: Maximum 15 seconds (background processing)
- **Availability**: 99.5% uptime expected
- **Background Processing**: Documents and certificates loaded asynchronously after employee data
- **Pagination**: Required for documents and certificates
- **Immediate Access**: Core employee profile available immediately while documents sync in background

---

## 2. WHAT CSMS WILL PROVIDE TO HRIMS

### 2.1 Employee Data Request Format
CSMS will send HTTP GET requests to HRIMS for employee data:

**Primary Endpoint HRIMS Should Provide:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/search
```

**Query Parameters CSMS Will Send:**
```
zanId=Z123456789                    // Optional (either this or payrollNumber)
payrollNumber=PAY001234            // Optional (either this or zanId)
institutionVoteNumber=H01          // Mandatory - Institution identifier
```

**Employee Data Request Example:**
```bash
GET https://hrims-api.zanzibar.go.tz/api/employee/search?zanId=Z123456789&institutionVoteNumber=H01
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
X-API-Key: your-api-key-here
```

### 2.2 Documents and Certificates Request Format
CSMS will send separate requests for documents and certificates:

**Documents Endpoint HRIMS Should Provide:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/documents
```

**Certificates Endpoint HRIMS Should Provide:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/certificates
```

**Query Parameters for Documents/Certificates:**
```
zanId=Z123456789                    // Optional (either this or payrollNumber)
payrollNumber=PAY001234            // Optional (either this or zanId)
institutionVoteNumber=H01          // Mandatory - Institution identifier
page=1                             // Optional - Pagination (default: 1)
limit=10                           // Optional - Items per page (max 20, default: 10)
```

**Documents Request Example:**
```bash
GET https://hrims-api.zanzibar.go.tz/api/employee/documents?zanId=Z123456789&institutionVoteNumber=H01
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
X-API-Key: your-api-key-here
```

**Certificates Request Example:**
```bash
GET https://hrims-api.zanzibar.go.tz/api/employee/certificates?zanId=Z123456789&institutionVoteNumber=H01
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
X-API-Key: your-api-key-here
```

### 2.3 Request Headers CSMS Will Send
```
Authorization: Bearer {API_TOKEN}
Content-Type: application/json
X-API-Key: {API_KEY}
User-Agent: CSMS/1.0
Accept: application/json
```

### 2.4 CSMS System Information
- **System Name**: Civil Service Management System (CSMS)
- **Base URL**: https://csms.zanajira.go.tz
- **Contact**: System Administrator
- **IP Ranges**: (To be provided for firewall configuration)

---

## 3. WHAT HRIMS ENGINEERS SHOULD PROVIDE TO CSMS

### 3.1 Required HRIMS API Endpoints

**Employee Data Endpoint:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/search
```

**Documents Endpoint:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/documents
```

**Certificates Endpoint:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/certificates
```

**Common Parameters:**
- `zanId` (string, optional): Employee's Zanzibar National ID
- `payrollNumber` (string, optional): Employee's payroll number
- `institutionVoteNumber` (string, required): Institution vote/reference number

**Additional Parameters for Documents/Certificates:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (max: 20, default: 10)

**Validation Rules:**
- At least one of `zanId` or `payrollNumber` must be provided
- `institutionVoteNumber` is mandatory
- Employee must belong to the specified institution

### 3.2 Required Response Formats from HRIMS

#### 3.2.1 Employee Data Response (GET /api/employee/search)

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Employee found successfully",
  "data": {
    "employee": {
      "zanId": "Z123456789",
      "payrollNumber": "PAY001234",
      "name": "John Doe Mwalimu",
      "gender": "Male",
      "dateOfBirth": "1990-05-15",           // Format: YYYY-MM-DD
      "placeOfBirth": "Stone Town",
      "region": "Zanzibar Urban",
      "countryOfBirth": "Tanzania",
      "phoneNumber": "+255777123456",
      "alternativePhone": "+255712345678",
      "emergencyContacts": [
        {
          "name": "Jane Doe",
          "relationship": "Spouse",
          "phoneNumber": "+255799887766"
        },
        {
          "name": "John Smith",
          "relationship": "Parent",
          "phoneNumber": "+255766554433"
        },
        {
          "name": "Mary Johnson",
          "relationship": "Sibling",
          "phoneNumber": "+255788990011"
        }
      ],
      "contactAddress": "P.O. Box 123, Stone Town, Zanzibar",
      "zssfNumber": "ZSSF123456",
      "cadre": "Environmental Health Officer",
      "salaryScale": "PGSS 7",
      "ministry": "Ministry of Health",
      "department": "Human Resources",
      "appointmentType": "Permanent",
      "contractType": "Full-time",
      "recentTitleDate": "2023-01-01",       // Format: YYYY-MM-DD
      "currentReportingOffice": "HR Department",
      "currentWorkplace": "Mnazi Mmoja Hospital",
      "employmentDate": "2020-03-01",       // Format: YYYY-MM-DD
      "confirmationDate": "2021-03-01",     // Format: YYYY-MM-DD
      "retirementDate": "2055-05-15",       // Format: YYYY-MM-DD
      "status": "Active",
      "institutionVoteNumber": "H01",
      "photo": {
        "contentType": "image/jpeg",
        "content": "base64_encoded_string_here...",
        "lastUpdated": "2025-08-15"   // Optional
      },
      "documentStats": {
        "totalDocuments": 4,
        "totalCertificates": 3
      },
      "careerProgression": {
        "currentCadre": {
          "name": "Environmental Health Officer",
          "grade": "PGSS 11",
          "startDate": "2024-01-15",
          "institutionVoteNumber": "H01"
        },
        "history": [
          {
            "cadre": "Nurse",
            "grade": "PGSS 7",
            "startDate": "2015-06-01",
            "endDate": "2018-05-30",
            "institutionVoteNumber": "H01",
            "reason": "Career Development",
            "referenceNumber": "PRO/2015/123"
          },
          {
            "cadre": "Clinical Officer",
            "grade": "PGSS 9",
            "startDate": "2018-06-01",
            "endDate": "2021-12-31",
            "institutionVoteNumber": "H01",
            "reason": "Professional Advancement",
            "referenceNumber": "PRO/2018/456"
          },
          {
            "cadre": "Pharmacist",
            "grade": "PGSS 10",
            "startDate": "2022-01-01",
            "endDate": "2024-01-14",
            "institutionVoteNumber": "H01",
            "reason": "Further Studies",
            "referenceNumber": "PRO/2022/789"
          }
        ]
      }
    }
  }
}
```

#### 3.2.2 Documents Response (GET /api/employee/documents)

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Employee documents retrieved successfully",
  "data": {
    "employeeId": "Z123456789",
    "institutionVoteNumber": "H01",
    "documents": [
      {
        "id": "doc_001",
        "type": "ardhilHali",
        "name": "Ardhil Hali Certificate",
        "contentType": "application/pdf",
        "content": "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDI...",
        "size": 245760,
        "lastUpdated": "2025-01-15"
      },
      {
        "id": "doc_002",
        "type": "confirmationLetter",
        "name": "Employment Confirmation Letter",
        "contentType": "application/pdf",
        "content": "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDI...",
        "size": 189432,
        "lastUpdated": "2025-02-20"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 4,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 3.2.3 Certificates Response (GET /api/employee/certificates)

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Employee certificates retrieved successfully",
  "data": {
    "employeeId": "Z123456789",
    "institutionVoteNumber": "H01",
    "certificates": [
      {
        "id": "cert_001",
        "type": "Bachelor Degree",
        "name": "Bachelor of Science in Nursing",
        "contentType": "application/pdf",
        "content": "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDI...",
        "size": 312567,
        "lastUpdated": "2025-01-10",
        "institutionAwarded": "University of Dodoma",
        "yearAwarded": "2015"
      },
      {
        "id": "cert_002",
        "type": "Master Degree",
        "name": "Master of Public Health",
        "contentType": "application/pdf",
        "content": "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDI...",
        "size": 289134,
        "lastUpdated": "2025-01-10",
        "institutionAwarded": "Muhimbili University of Health Sciences",
        "yearAwarded": "2019"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 3,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```


**Error Response (HTTP 404):**
```json
{
  "success": false,
  "message": "Employee not found in the specified institution",
  "error_code": "EMPLOYEE_NOT_FOUND"
}
```

**Error Response (HTTP 400):**
```json
{
  "success": false,
  "message": "Invalid request parameters",
  "errors": [
    {
      "field": "institutionVoteNumber",
      "message": "Institution vote number is required"
    }
  ],
  "error_code": "INVALID_PARAMETERS"
}
```

**Error Response (HTTP 500):**
```json
{
  "success": false,
  "message": "Internal server error",
  "error_code": "INTERNAL_ERROR"
}
```

### 3.3 Required Document Types

HRIMS should provide URLs for these document types (when available):

| Document Type | Description | Required |
|---------------|-------------|----------|
| `ardhilHali` | Ardhil Hali Certificate | Optional |
| `confirmationLetter` | Employment Confirmation Letter | Optional |
| `jobContract` | Employment Contract | Optional |
| `birthCertificate` | Birth Certificate | Optional |

### 3.4 Required Certificate Types

HRIMS should support these certificate types (when available):

| Certificate Type | Description | Examples |
|------------------|-------------|----------|
| `Bachelor Degree` | Bachelor's degree | BA, BSc, BEd, etc. |
| `Master Degree` | Master's degree | MA, MSc, MEd, MBA, etc. |
| `Diploma` | Diploma certificates | Various diplomas |
| `Certificate` | Professional certificates | Training certificates |
| `PhD` | Doctorate degrees | PhD, DPhil, etc. |

### 3.5 Required File Storage

**Document Requirements:**
- All documents and certificates must be encoded in base64 format
- Original files should be in PDF format
- Maximum file size: 10MB per document before encoding
- Files must be encoded using standard base64 encoding
- The `contentType` field should specify the original file type
- Base64 content should be provided in the `content` field

**Example Base64 Document:**
```json
{
  "type": "birthCertificate",
  "name": "Birth Certificate",
  "contentType": "application/pdf",
  "content": "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDI..."
}
```

---

## 4. AUTHENTICATION & SECURITY

### 4.1 Authentication Methods

HRIMS engineers should provide **ONE** of the following authentication methods:

**Option A: Bearer Token Authentication**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option B: API Key Authentication**
```
X-API-Key: your-api-key-here
```

**Option C: Combined Authentication**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

### 4.2 Security Requirements

1. **HTTPS Only**: All communications must use HTTPS
2. **Rate Limiting**: Implement reasonable rate limits (suggested: 100 requests/minute)
3. **IP Whitelisting**: CSMS will provide IP ranges for whitelisting
4. **Token Management**: API tokens should have reasonable expiration (suggested: 1 year)
5. **Audit Logging**: Log all API access attempts for security monitoring

### 4.3 CSMS IP Ranges for Whitelisting
```
Production: [To be provided]
Development: [To be provided]
```

---

## 5. TECHNICAL REQUIREMENTS FOR HRIMS

### 5.1 Performance Requirements

| Metric | Employee Data API | Documents/Certificates API |
|--------|------------------|---------------------------|
| Response Time | < 5 seconds | < 15 seconds |
| Batch Size | N/A | 5-10 items per request |
| Maximum Concurrent Requests | 100 per minute | 50 per minute |
| Availability | 99.5% uptime | 99.5% uptime |
| Throughput | Minimum 50 concurrent requests | Minimum 25 concurrent requests |
| Data Freshness | Real-time or near real-time (< 1 hour lag) | Real-time or near real-time (< 1 hour lag) |
| File Size Limit | Profile photo: 2MB | Documents/Certificates: 10MB each |

### 5.2 API Standards

1. **HTTP Methods**: GET only for search operations
2. **Content Type**: `application/json`
3. **Character Encoding**: UTF-8
4. **Date Format**: ISO 8601 (YYYY-MM-DD)
5. **HTTP Status Codes**: Standard codes (200, 400, 404, 500, etc.)

### 5.3 Error Handling

HRIMS should return appropriate HTTP status codes:

| Status Code | Description | When to Use |
|-------------|-------------|-------------|
| 200 | Success | Employee found and data returned |
| 400 | Bad Request | Invalid parameters or missing required fields |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Employee not found in specified institution |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary service disruption |

### 5.4 Data Validation Rules

**Employee Data Requirements:**
- `zanId`: Must be valid Zanzibar National ID format
- `name`: Required, non-empty string
- `institutionVoteNumber`: Must match the request parameter
- Dates: ISO format (YYYY-MM-DD), null if not available
- URLs: Valid HTTPS URLs, accessible files
- `photo`: Required
  - `contentType`: Must be image/jpeg or image/png
  - `content`: Valid base64 encoded string
  - Maximum image size: 2MB before encoding
  - Recommended dimensions: 400x400 pixels
  - Last updated date in ISO format
- `careerProgression`: Required for employees with cadre changes
  - `currentCadre`: Required
    - `name`: Required, non-empty string
    - `grade`: Required, valid PGSS grade
    - `startDate`: Required, ISO date format
  - `history`: Array of previous positions
    - Sorted by date (newest first)
    - No date gaps between positions
    - No overlapping dates
    - Valid reference numbers
- `emergencyContacts`: Array, minimum 1 contact required
  - `name`: Required, non-empty string
  - `relationship`: Required, valid relationship type
  - `phoneNumber`: Required, valid phone format
  - Maximum 5 emergency contacts allowed

### 5.5 Optimization Guidelines

1. **Progressive Loading:**
   - Initial response contains only essential employee data
   - Documents and certificates loaded on-demand
   - Implement document pagination (10 items per page)

2. **Caching Strategy:**
   - Cache employee basic details for 1 hour
   - Cache document metadata for 24 hours
   - Cache document content for 7 days

3. **Response Size Management:**
   - Compress responses using gzip
   - Maximum response size: 10MB
   - Document batching required for large collections

4. **Connection Optimization:**
   - Keep-alive connections enabled
   - Connection pooling recommended
   - Request timeout: 30 seconds

---

## 6. TESTING & VALIDATION

### 6.1 Test Data Requirements

HRIMS engineers should provide test data for the following scenarios:

**Test Employee Records:**
```json
{
  "test_employees": [
    {
      "zanId": "Z123456789",
      "payrollNumber": "TEST001",
      "institutionVoteNumber": "H01",
      "name": "Test Employee 1",
      "status": "Active",
      "has_all_documents": true,
      "has_certificates": true
    },
    {
      "zanId": "Z987654321",
      "payrollNumber": "TEST002", 
      "institutionVoteNumber": "K01",
      "name": "Test Employee 2",
      "status": "Active",
      "has_some_documents": true,
      "has_no_certificates": false
    },
    {
      "zanId": "Z555666777",
      "payrollNumber": "TEST003",
      "institutionVoteNumber": "N03",
      "name": "Test Employee 3",
      "status": "Inactive",
      "has_no_documents": true,
      "has_certificates": true
    }
  ]
}
```

### 6.2 Test Scenarios

1. **Valid Employee Search**: Employee exists with all data
2. **Partial Data**: Employee exists but missing some documents/certificates  
3. **Employee Not Found**: Valid institution but employee doesn't exist
4. **Invalid Institution**: Institution vote number doesn't exist
5. **Missing Parameters**: Request without required parameters
6. **Authentication Failure**: Invalid or missing API credentials
7. **Performance Test**: Multiple concurrent requests

### 6.3 Testing Environment

**HRIMS Test Environment:**
- URL: `https://hrims-test-api.zanzibar.go.tz`
- Test API credentials
- Test employee data
- Test document files

---

## 7. IMPLEMENTATION CHECKLIST

### 7.1 For HRIMS Engineers

**API Development:**
- [ ] Create `/api/employee/search` endpoint (employee data only)
- [ ] Create `/api/employee/documents` endpoint (documents only)
- [ ] Create `/api/employee/certificates` endpoint (certificates only)
- [ ] Implement parameter validation (zanId/payrollNumber + institutionVoteNumber)
- [ ] Implement pagination for documents and certificates
- [ ] Implement authentication mechanism (Bearer token or API key)
- [ ] Format response according to specification for all three endpoints
- [ ] Handle error cases with proper HTTP status codes
- [ ] Implement rate limiting and security measures

**Data Preparation:**
- [ ] Ensure employee data is accessible via the API
- [ ] Prepare document URLs (PDF files, HTTPS accessible)
- [ ] Prepare certificate URLs (PDF files, HTTPS accessible)
- [ ] Validate data quality and completeness
- [ ] Set up file storage infrastructure

**Testing:**
- [ ] Set up test environment
- [ ] Create test employee records
- [ ] Create test document/certificate files
- [ ] Provide test API credentials
- [ ] Conduct internal API testing

**Documentation:**
- [ ] API documentation for internal team
- [ ] Error handling documentation
- [ ] Authentication setup guide
- [ ] File storage architecture documentation

**Security & Deployment:**
- [ ] Configure HTTPS certificates
- [ ] Set up firewall rules for CSMS IP ranges
- [ ] Implement logging and monitoring
- [ ] Configure backup and disaster recovery
- [ ] Set up production environment

### 7.2 For CSMS Team

**Integration Development:**
- [x] Create HRIMS sync API endpoint
- [x] Create employee search API endpoint  
- [x] Implement data validation and transformation
- [x] Create database storage logic
- [x] Handle document and certificate management
- [x] Implement error handling and logging
- [x] Create API documentation

**Testing:**
- [ ] Unit testing for API endpoints
- [ ] Mock data integration testing
- [ ] End-to-end testing with HRIMS test environment
- [ ] Performance and load testing
- [ ] Security testing

**Deployment:**
- [ ] Production environment setup
- [ ] Configure HRIMS API credentials
- [ ] Set up monitoring and alerting
- [ ] Deploy to production servers

---

## 8. INTEGRATION TIMELINE

### Phase 1: API Development (3 days)
- HRIMS team creates API endpoint
- CSMS team completes integration testing with mock data
- Both teams create documentation

### Phase 2: Testing (3 days)  
- HRIMS provides test environment and credentials
- End-to-end integration testing
- Performance and security testing
- Bug fixes and optimization

### Phase 3: Production Deployment (1 week)
- Production environment setup
- Credentials exchange
- Go-live and monitoring
- Post-deployment validation

### Phase 4: Support & Maintenance (Ongoing)
- Monitor system performance
- Handle support requests
- Implement enhancements as needed

---

## 9. SUPPORT & CONTACT INFORMATION

### 9.1 CSMS Team Contacts
- **Technical Lead**: [Name, Email, Phone]
- **System Administrator**: [Name, Email, Phone]  
- **Project Manager**: [Name, Email, Phone]

### 9.2 HRIMS Team Contacts (To be provided)
- **Technical Lead**: [Name, Email, Phone]
- **API Developer**: [Name, Email, Phone]
- **System Administrator**: [Name, Email, Phone]

### 9.3 Escalation Matrix
- **Level 1**: Technical teams communicate directly
- **Level 2**: Team leads involvement
- **Level 3**: Project managers and stakeholders

---

## 10. APPENDICES

### Appendix A: Institution Vote Numbers Reference
```
H01 - WIZARA YA AFYA
K01 - WIZARA YA ELIMU NA MAFUNZO YA AMALI  
N03 - WIZARA YA MAJI NISHATI NA MADINI
G03 - AFISI YA MWANASHERIA MKUU
G04 - AFISI YA MKURUGENZI WA MASHTAKA
E08 - TUME YA UTUMISHI SERIKALINI
... (Full list of 44 institutions available)
```

### Appendix B: Sample Curl Commands

**Search by ZanID:**
```bash
curl -X GET "https://hrims-api.zanzibar.go.tz/api/employee/search?zanId=Z123456789&institutionVoteNumber=H01" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

**Search by Payroll Number:**
```bash
curl -X GET "https://hrims-api.zanzibar.go.tz/api/employee/search?payrollNumber=PAY001234&institutionVoteNumber=H01" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json"
```

### Appendix C: JSON Schema Validation

**Employee Response Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "message": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "employee": {
          "type": "object",
          "required": ["zanId", "name", "institutionVoteNumber"],
          "properties": {
            "zanId": {"type": "string"},
            "payrollNumber": {"type": "string"},
            "name": {"type": "string"},
            "gender": {"type": "string"},
            "dateOfBirth": {"type": "string", "format": "date"},
            "institutionVoteNumber": {"type": "string"}
          }
        },
        "documents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {"type": "string", "enum": ["ardhilHali", "confirmationLetter", "jobContract", "birthCertificate"]},
              "url": {"type": "string", "format": "uri"},
              "name": {"type": "string"}
            }
          }
        },
        "certificates": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {"type": "string"},
              "name": {"type": "string"},
              "url": {"type": "string", "format": "uri"}
            }
          }
        }
      }
    }
  }
}
```

---

**Document Control:**
- **Created**: August 2025
- **Last Modified**: August 2025
- **Version**: 1.0
- **Approved By**: [To be signed]
- **Next Review**: [Date]

---

*This document serves as the official integration specification between CSMS and HRIMS systems. Any changes require approval from both technical teams.*