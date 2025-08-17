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
CSMS Request → HRIMS API → Employee Data Response → CSMS Database → Profile Display
```

### 1.3 Key Requirements
- **Search Criteria**: ZanID OR Payroll Number + Institution Vote Number (mandatory)
- **Data Format**: JSON over HTTPS
- **Authentication**: Bearer token or API key
- **Response Time**: Maximum 30 seconds
- **Availability**: 99.5% uptime expected

---

## 2. WHAT CSMS WILL PROVIDE TO HRIMS

### 2.1 Search Request Format
CSMS will send HTTP GET requests to HRIMS with the following parameters:

**Endpoint HRIMS Should Provide:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/search
```

**Query Parameters CSMS Will Send:**
```
zanId=Z123456789                    // Optional (either this or payrollNumber)
payrollNumber=PAY001234            // Optional (either this or zanId)
institutionVoteNumber=H01          // Mandatory - Institution identifier
```

**Complete Request Example:**
```bash
GET https://hrims-api.zanzibar.go.tz/api/employee/search?zanId=Z123456789&institutionVoteNumber=H01
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
X-API-Key: your-api-key-here
```

### 2.2 Request Headers CSMS Will Send
```
Authorization: Bearer {API_TOKEN}
Content-Type: application/json
X-API-Key: {API_KEY}
User-Agent: CSMS/1.0
Accept: application/json
```

### 2.3 CSMS System Information
- **System Name**: Civil Service Management System (CSMS)
- **Base URL**: https://csms.zanajira.go.tz
- **Contact**: System Administrator
- **IP Ranges**: (To be provided for firewall configuration)

---

## 3. WHAT HRIMS ENGINEERS SHOULD PROVIDE TO CSMS

### 3.1 Required HRIMS API Endpoint

**Primary Endpoint:**
```
GET https://hrims-api.zanzibar.go.tz/api/employee/search
```

**Parameters:**
- `zanId` (string, optional): Employee's Zanzibar National ID
- `payrollNumber` (string, optional): Employee's payroll number
- `institutionVoteNumber` (string, required): Institution vote/reference number

**Validation Rules:**
- At least one of `zanId` or `payrollNumber` must be provided
- `institutionVoteNumber` is mandatory
- Employee must belong to the specified institution

### 3.2 Required Response Format from HRIMS

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
      "contactAddress": "P.O. Box 123, Stone Town, Zanzibar",
      "zssfNumber": "ZSSF123456",
      "cadre": "Administrative Officer",
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
      "institutionVoteNumber": "H01"
    },
    "documents": [
      {
        "type": "ardhilHali",
        "url": "https://hrims-files.zanzibar.go.tz/documents/ardhil-hali-123.pdf",
        "name": "Ardhil Hali Certificate"
      },
      {
        "type": "confirmationLetter",
        "url": "https://hrims-files.zanzibar.go.tz/documents/confirmation-123.pdf",
        "name": "Confirmation Letter"
      },
      {
        "type": "jobContract",
        "url": "https://hrims-files.zanzibar.go.tz/documents/contract-123.pdf",
        "name": "Employment Contract"
      },
      {
        "type": "birthCertificate",
        "url": "https://hrims-files.zanzibar.go.tz/documents/birth-cert-123.pdf",
        "name": "Birth Certificate"
      }
    ],
    "certificates": [
      {
        "type": "Bachelor Degree",
        "name": "Bachelor of Arts in Administration",
        "url": "https://hrims-files.zanzibar.go.tz/certificates/bachelor-123.pdf"
      },
      {
        "type": "Master Degree",
        "name": "Master of Public Administration",
        "url": "https://hrims-files.zanzibar.go.tz/certificates/master-123.pdf"
      },
      {
        "type": "Certificate",
        "name": "Public Administration Certificate",
        "url": "https://hrims-files.zanzibar.go.tz/certificates/cert-123.pdf"
      },
      {
        "type": "Diploma",
        "name": "Diploma in Computer Science",
        "url": "https://hrims-files.zanzibar.go.tz/certificates/diploma-123.pdf"
      }
    ]
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

**Document URLs Requirements:**
- URLs must be publicly accessible (or with proper authentication)
- URLs should be permanent and not expire
- Files should be in PDF format
- Maximum file size: 10MB per document
- HTTPS protocol required

**Example Document URLs:**
```
https://hrims-files.zanzibar.go.tz/documents/{employee_id}/{document_type}.pdf
https://hrims-files.zanzibar.go.tz/certificates/{employee_id}/{certificate_id}.pdf
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

| Metric | Requirement |
|--------|-------------|
| Response Time | < 5 seconds (typical), < 30 seconds (maximum) |
| Availability | 99.5% uptime |
| Throughput | Minimum 50 concurrent requests |
| Data Freshness | Real-time or near real-time (< 1 hour lag) |

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
- [ ] Create `/api/employee/search` endpoint
- [ ] Implement parameter validation (zanId/payrollNumber + institutionVoteNumber)
- [ ] Implement authentication mechanism (Bearer token or API key)
- [ ] Format response according to specification
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
- [x] Unit testing for API endpoints
- [x] Mock data integration testing
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

### Phase 1: API Development (2-3 weeks)
- HRIMS team creates API endpoint
- CSMS team completes integration testing with mock data
- Both teams create documentation

### Phase 2: Testing (1-2 weeks)  
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