# HRIMS Integration API Documentation

This document describes the API endpoints for integrating with the external HRIMS (Human Resource Information Management System) to fetch and sync employee data using an optimized three-endpoint architecture for maximum performance and user experience.

## Base URL
```
https://csms.zanajira.go.tz/api/hrims
```

## Architecture Overview
The integration uses an optimized three-endpoint approach for fast data reception:
1. **Employee Data Sync API**: Fast retrieval and storage of core employee information (immediate profile availability)
2. **Documents Sync API**: Background loading and processing of employee documents
3. **Certificates Sync API**: Background loading and processing of employee certificates
4. **Employee Search API**: Unified access to complete employee profiles with all data

This approach ensures users get immediate access to employee profiles while documents and certificates load in the background for enhanced performance.

## Authentication
All API endpoints require proper authentication. Include your API key in the request headers.

## API Endpoints

### 1. Sync Employee Data from HRIMS

**Endpoint:** `POST /api/hrims/sync-employee`

**Description:** Fetches employee data from external HRIMS system and stores/updates it in the local database. This endpoint only syncs core employee information for fast response.

#### Request Body
```json
{
  "zanId": "Z123456789",           // Optional (either zanId or payrollNumber required)
  "payrollNumber": "PAY001234",   // Optional (either zanId or payrollNumber required)
  "institutionVoteNumber": "H01", // Required - Institution vote number
  "syncDocuments": false,         // Optional - Default: false (documents synced separately)
  "hrimsApiUrl": "https://hrims-api.example.com", // Optional - Override default HRIMS URL
  "hrimsApiKey": "your-api-key"   // Optional - Override default HRIMS API key
}
```

#### Request Validation Rules
- Either `zanId` OR `payrollNumber` must be provided (at least one is required)
- `institutionVoteNumber` is mandatory
- `syncDocuments` defaults to false for faster employee data sync
- `hrimsApiUrl` must be a valid URL if provided
- `hrimsApiKey` is optional for authentication override

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Employee data synced successfully from HRIMS",
  "data": {
    "employeeId": "emp_abc123",
    "zanId": "Z123456789",
    "name": "John Doe Mwalimu",
    "institutionId": "inst_xyz789",
    "documentsCount": 3,
    "certificatesCount": 2,
    "documentsStatus": "pending", // "pending", "syncing", "completed"
    "certificatesStatus": "pending" // "pending", "syncing", "completed"
  }
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "message": "Institution with vote number H01 not found"
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": [
    {
      "path": ["zanId", "payrollNumber"],
      "message": "Either zanId or payrollNumber must be provided"
    }
  ]
}
```

---

### 2. Sync Employee Documents from HRIMS

**Endpoint:** `POST /api/hrims/sync-documents`

**Description:** Fetches employee documents from external HRIMS system and stores/updates them in the local database. This endpoint is called separately for background processing of documents.

#### Request Body
```json
{
  "zanId": "Z123456789",           // Optional (either zanId or payrollNumber required)
  "payrollNumber": "PAY001234",   // Optional (either zanId or payrollNumber required)
  "institutionVoteNumber": "H01", // Required - Institution vote number
  "page": 1,                      // Optional - Page number (default: 1)
  "limit": 10,                    // Optional - Items per page (default: 10, max: 20)
  "hrimsApiUrl": "https://hrims-api.example.com", // Optional - Override default HRIMS URL
  "hrimsApiKey": "your-api-key"   // Optional - Override default HRIMS API key
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Employee documents synced successfully from HRIMS",
  "data": {
    "employeeId": "emp_abc123",
    "documentsProcessed": 4,
    "documentsSuccessful": 4,
    "documentsFailed": 0,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 4,
      "hasNext": false
    }
  }
}
```

---

### 3. Sync Employee Certificates from HRIMS

**Endpoint:** `POST /api/hrims/sync-certificates`

**Description:** Fetches employee certificates from external HRIMS system and stores/updates them in the local database. This endpoint is called separately for background processing of certificates.

#### Request Body
```json
{
  "zanId": "Z123456789",           // Optional (either zanId or payrollNumber required)
  "payrollNumber": "PAY001234",   // Optional (either zanId or payrollNumber required)
  "institutionVoteNumber": "H01", // Required - Institution vote number
  "page": 1,                      // Optional - Page number (default: 1)
  "limit": 10,                    // Optional - Items per page (default: 10, max: 20)
  "hrimsApiUrl": "https://hrims-api.example.com", // Optional - Override default HRIMS URL
  "hrimsApiKey": "your-api-key"   // Optional - Override default HRIMS API key
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Employee certificates synced successfully from HRIMS",
  "data": {
    "employeeId": "emp_abc123",
    "certificatesProcessed": 5,
    "certificatesSuccessful": 5,
    "certificatesFailed": 0,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "hasNext": false
    }
  }
}
```

---

### 4. Search Employee

**Endpoint:** `GET /api/hrims/search-employee` or `POST /api/hrims/search-employee`

**Description:** Searches for an employee in the local database using zanId/payrollNumber and institution vote number.

#### GET Request Parameters
```
GET /api/hrims/search-employee?zanId=Z123456789&institutionVoteNumber=H01&includeDocuments=true&includeCertificates=true
```

#### POST Request Body
```json
{
  "zanId": "Z123456789",           // Optional (either zanId or payrollNumber required)
  "payrollNumber": "PAY001234",   // Optional (either zanId or payrollNumber required)
  "institutionVoteNumber": "H01", // Required - Institution vote number
  "includeDocuments": true,       // Optional - Default: true
  "includeCertificates": true     // Optional - Default: true
}
```

#### Request Parameters
- `zanId` (string, optional): Employee's Zanzibar ID
- `payrollNumber` (string, optional): Employee's payroll number
- `institutionVoteNumber` (string, required): Institution vote number
- `includeDocuments` (boolean, optional): Include employee documents in response (default: true)
- `includeCertificates` (boolean, optional): Include employee certificates in response (default: true)

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Employee found successfully",
  "data": {
    "employee": {
      "id": "emp_abc123",
      "zanId": "Z123456789",
      "payrollNumber": "PAY001234",
      "name": "John Doe Mwalimu",
      "gender": "Male",
      "dateOfBirth": "1990-05-15",
      "placeOfBirth": "Stone Town",
      "region": "Zanzibar Urban",
      "countryOfBirth": "Tanzania",
      "phoneNumber": "+255777123456",
      "contactAddress": "P.O. Box 123, Stone Town, Zanzibar",
      "zssfNumber": "ZSSF123456",
      "profileImageUrl": "https://example.com/images/profile-123.jpg",
      "cadre": "Administrative Officer",
      "salaryScale": "PGSS 7",
      "ministry": "Ministry of Health",
      "department": "Human Resources",
      "appointmentType": "Permanent",
      "contractType": "Full-time",
      "recentTitleDate": "2023-01-01",
      "currentReportingOffice": "HR Department",
      "currentWorkplace": "Mnazi Mmoja Hospital",
      "employmentDate": "2020-03-01",
      "confirmationDate": "2021-03-01",
      "retirementDate": "2055-05-15",
      "status": "Active",
      "profileImageUrl": "https://example.com/images/profile-123.jpg",
      "institution": {
        "id": "inst_xyz789",
        "name": "WIZARA YA AFYA",
        "voteNumber": "H01",
        "email": "info@mohz.go.tz",
        "phoneNumber": "+255242231614"
      }
    },
    "documents": {
      "ardhilHali": {
        "type": "ardhilHali",
        "url": "https://example.com/documents/ardhil-hali-123.pdf",
        "name": "Ardhil Hali Certificate"
      },
      "confirmationLetter": {
        "type": "confirmationLetter",
        "url": "https://example.com/documents/confirmation-123.pdf",
        "name": "Confirmation Letter"
      },
      "jobContract": {
        "type": "jobContract",
        "url": "https://example.com/documents/contract-123.pdf",
        "name": "Employment Contract"
      },
      "birthCertificate": null
    },
    "certificates": [
      {
        "id": "cert_123",
        "type": "Bachelor Degree",
        "name": "Bachelor of Arts in Administration",
        "url": "https://example.com/certificates/bachelor-123.pdf"
      },
      {
        "id": "cert_124",
        "type": "Certificate",
        "name": "Public Administration Certificate",
        "url": "https://example.com/certificates/cert-123.pdf"
      },
      {
        "id": "cert_125",
        "type": "Advanced Diploma",
        "name": "Advanced Diploma in Management",
        "url": "https://example.com/certificates/advanced-diploma-123.pdf"
      },
      {
        "id": "cert_126",
        "type": "Master Degree",
        "name": "Master of Public Administration",
        "url": "https://example.com/certificates/master-123.pdf"
      },
      {
        "id": "cert_127",
        "type": "Diploma",
        "name": "Diploma in Computer Science",
        "url": "https://example.com/certificates/diploma-123.pdf"
      },
      {
        "id": "cert_128",
        "type": "Certificate of primary education",
        "name": "Standard VII Certificate",
        "url": "https://example.com/certificates/primary-cert-123.pdf"
      },
      {
        "id": "cert_129",
        "type": "Certificate of Secondary education (Form IV)",
        "name": "Form IV Certificate",
        "url": "https://example.com/certificates/form4-cert-123.pdf"
      },
      {
        "id": "cert_130",
        "type": "Advanced Certificate of Secondary education (Form VII)",
        "name": "Form VI Certificate",
        "url": "https://example.com/certificates/form6-cert-123.pdf"
      },
      {
        "id": "cert_131",
        "type": "PHd",
        "name": "Doctor of Philosophy in Public Administration",
        "url": "https://example.com/certificates/phd-123.pdf"
      }
    ]
  }
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "message": "Employee not found in the specified institution"
}
```

---

## HRIMS External API Expected Formats

The integration now uses three separate HRIMS endpoints. Each endpoint expects a specific JSON response format:

### 1. Employee Data Endpoint Response (GET https://hrims-api.zanzibar.go.tz/api/employee/search)
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
      "dateOfBirth": "1990-05-15",
      "placeOfBirth": "Stone Town",
      "region": "Zanzibar Urban", 
      "countryOfBirth": "Tanzania",
      "phoneNumber": "+255777123456",
      "contactAddress": "P.O. Box 123, Stone Town, Zanzibar",
      "zssfNumber": "ZSSF123456",
      "photo": {
        "contentType": "image/jpeg",
        "content": "base64_encoded_image_data_here...",
        "lastUpdated": "2025-08-15"
      },
      "cadre": "Administrative Officer",
      "salaryScale": "PGSS 7",
      "ministry": "Ministry of Health",
      "department": "Human Resources",
      "appointmentType": "Permanent",
      "contractType": "Full-time",
      "recentTitleDate": "2023-01-01",
      "currentReportingOffice": "HR Department",
      "currentWorkplace": "Mnazi Mmoja Hospital",
      "employmentDate": "2020-03-01",
      "confirmationDate": "2021-03-01",
      "retirementDate": "2055-05-15",
      "status": "Active",
      "institutionVoteNumber": "H01",
      "documentStats": {
        "totalDocuments": 4,
        "totalCertificates": 9
      }
    }
  }
}
```

### 2. Documents Endpoint Response (GET https://hrims-api.zanzibar.go.tz/api/employee/documents)
```json
{
  "success": true,
  "message": "Employee documents retrieved successfully",
  "data": {
    "employeeId": "Z123456789",
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

### 3. Certificates Endpoint Response (GET https://hrims-api.zanzibar.go.tz/api/employee/certificates)
```json
{
  "success": true,
  "message": "Employee certificates retrieved successfully",
  "data": {
    "employeeId": "Z123456789",
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

### Document Types
- `ardhilHali`: Ardhil Hali Certificate
- `confirmationLetter`: Confirmation Letter
- `jobContract`: Employment Contract
- `birthCertificate`: Birth Certificate

### Certificate Types
- `Certificate of primary education`: Primary education certificate (Standard VII)
- `Certificate of Secondary education (Form IV)`: Secondary education certificate (Form IV)
- `Advanced Certificate of Secondary education (Form VII)`: Advanced secondary education (Form VI)
- `Certificate`: Professional/training certificates
- `Diploma`: Diploma certificates
- `Advanced Diploma`: Advanced diploma certificates
- `Bachelor Degree`: Bachelor's degree (BA, BSc, BEd, etc.)
- `Master Degree`: Master's degree (MA, MSc, MEd, MBA, etc.)
- `PHd`: Doctorate degrees (PhD, DPhil, etc.)

### Employee Image
- `photo.content`: Employee profile photo as base64 encoded string
- `photo.contentType`: Must be image/jpeg or image/png
- Maximum file size: 2MB before encoding
- Recommended dimensions: 300x300 pixels or higher

---

## Environment Configuration

Add the following environment variables to your `.env.local` file:

```env
# HRIMS Integration Configuration
HRIMS_API_URL=https://hrims-api.zanzibar.go.tz
HRIMS_API_KEY=your-hrims-api-key-here
HRIMS_MOCK_MODE=true  # Set to false in production
```

### Environment Variables
- `HRIMS_API_URL`: Base URL for the external HRIMS API
- `HRIMS_API_KEY`: API key for authenticating with HRIMS
- `HRIMS_MOCK_MODE`: When true, uses mock data instead of calling external API (useful for development)

---

## Usage Examples

### Example 1: Sync Employee from HRIMS using zanId
```bash
curl -X POST https://csms.zanajira.go.tz/api/hrims/sync-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "zanId": "Z123456789",
    "institutionVoteNumber": "H01"
  }'
```

### Example 2: Sync Employee from HRIMS using payrollNumber
```bash
curl -X POST https://csms.zanajira.go.tz/api/hrims/sync-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "payrollNumber": "PAY001234",
    "institutionVoteNumber": "H01"
  }'
```

### Example 3: Search Employee (GET)
```bash
curl "https://csms.zanajira.go.tz/api/hrims/search-employee?zanId=Z123456789&institutionVoteNumber=H01" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Example 4: Search Employee (POST)
```bash
curl -X POST https://csms.zanajira.go.tz/api/hrims/search-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "zanId": "Z123456789",
    "institutionVoteNumber": "H01",
    "includeDocuments": true,
    "includeCertificates": true
  }'
```

---

## Error Handling

### Common Error Responses

#### 400 - Bad Request
- Invalid or missing required parameters
- Validation errors

#### 404 - Not Found
- Institution with specified vote number not found
- Employee not found in HRIMS or local database

#### 500 - Internal Server Error
- Database connection issues
- External HRIMS API unavailable
- Unexpected server errors

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional validation errors array
}
```

---

## Integration Workflow

### Optimized Three-Phase Integration Process

**Phase 1: Immediate Employee Data Sync**
1. **External System → CSMS**: Call `/api/hrims/sync-employee` to fetch core employee data
2. **CSMS → HRIMS**: System calls HRIMS employee data endpoint (`/api/employee/search`)
3. **Database Storage**: Employee core data is stored/updated in local database
4. **Immediate Response**: Employee profile becomes available with core data (photos, basic info, employment details)
5. **User Access**: Employee can immediately view and use their basic profile information

**Phase 2: Background Documents Processing**
6. **CSMS Background Process**: Automatically triggers `/api/hrims/sync-documents` in background
7. **CSMS → HRIMS**: System calls HRIMS documents endpoint (`/api/employee/documents`) with pagination
8. **Background Storage**: Documents are processed and stored asynchronously
9. **Status Updates**: Document sync status is updated in real-time

**Phase 3: Background Certificates Processing**
10. **CSMS Background Process**: Automatically triggers `/api/hrims/sync-certificates` in background
11. **CSMS → HRIMS**: System calls HRIMS certificates endpoint (`/api/employee/certificates`) with pagination
12. **Background Storage**: Certificates are processed and stored asynchronously  
13. **Status Updates**: Certificate sync status is updated in real-time

**Phase 4: Complete Profile Access**
14. **Profile Enhancement**: Documents and certificates are seamlessly added to employee profile when ready
15. **Search Access**: Complete employee data with all documents is available via `/api/hrims/search-employee`
16. **Real-time Updates**: Profile shows sync progress and completeness status

---

## Notes

- All date fields are returned in ISO format (YYYY-MM-DD)
- Document URLs should be accessible and permanent
- Employee images are optional but recommended for better user experience
- The system supports partial document sets (not all employees need all documents)
- The system supports all educational levels from primary education to doctorate
- Institution vote numbers must exist in the system before syncing employees
- Mock mode is available for development and testing purposes