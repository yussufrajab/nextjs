# HRIMS Integration API Documentation

This document describes the API endpoints for integrating with the external HRIMS (Human Resource Information Management System) to fetch and sync employee data.

## Base URL
```
https://csms.zanajira.go.tz/api/hrims
```

## Authentication
All API endpoints require proper authentication. Include your API key in the request headers.

## API Endpoints

### 1. Sync Employee from HRIMS

**Endpoint:** `POST /api/hrims/sync-employee`

**Description:** Fetches employee data from external HRIMS system and stores/updates it in the local database.

#### Request Body
```json
{
  "zanId": "Z123456789",           // Optional (either zanId or payrollNumber required)
  "payrollNumber": "PAY001234",   // Optional (either zanId or payrollNumber required)
  "institutionVoteNumber": "H01", // Required - Institution vote number
  "hrimsApiUrl": "https://hrims-api.example.com", // Optional - Override default HRIMS URL
  "hrimsApiKey": "your-api-key"   // Optional - Override default HRIMS API key
}
```

#### Request Validation Rules
- Either `zanId` OR `payrollNumber` must be provided (at least one is required)
- `institutionVoteNumber` is mandatory
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
    "certificatesCount": 2
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

### 2. Search Employee

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

## HRIMS External API Expected Format

When the sync endpoint calls the external HRIMS system, it expects the following JSON response format:

### Expected HRIMS Response
```json
{
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
    "institutionVoteNumber": "H01"
  },
  "documents": [
    {
      "type": "ardhilHali",
      "url": "https://hrims-files.example.com/documents/ardhil-hali-123.pdf",
      "name": "Ardhil Hali Certificate"
    },
    {
      "type": "confirmationLetter",
      "url": "https://hrims-files.example.com/documents/confirmation-123.pdf",
      "name": "Confirmation Letter"
    },
    {
      "type": "jobContract",
      "url": "https://hrims-files.example.com/documents/contract-123.pdf",
      "name": "Employment Contract"
    },
    {
      "type": "birthCertificate",
      "url": "https://hrims-files.example.com/documents/birth-cert-123.pdf",
      "name": "Birth Certificate"
    }
  ],
  "certificates": [
    {
      "type": "Bachelor Degree",
      "name": "Bachelor of Arts in Administration",
      "url": "https://hrims-files.example.com/certificates/bachelor-123.pdf"
    },
    {
      "type": "Certificate",
      "name": "Public Administration Certificate", 
      "url": "https://hrims-files.example.com/certificates/cert-123.pdf"
    }
  ]
}
```

### Document Types
- `ardhilHali`: Ardhil Hali Certificate
- `confirmationLetter`: Confirmation Letter
- `jobContract`: Employment Contract
- `birthCertificate`: Birth Certificate

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

1. **External System → CSMS**: Call `/api/hrims/sync-employee` to fetch and store employee data
2. **CSMS → HRIMS**: System fetches data from external HRIMS API
3. **Database Storage**: Employee data and documents are stored/updated in local database
4. **Profile Display**: Data becomes available in employee profile at `/dashboard/profile`
5. **Search Access**: Other systems can search stored data using `/api/hrims/search-employee`

---

## Notes

- All date fields are returned in ISO format (YYYY-MM-DD)
- Document URLs should be accessible and permanent
- The system supports partial document sets (not all employees need all documents)
- Institution vote numbers must exist in the system before syncing employees
- Mock mode is available for development and testing purposes