# CSMS Bulk Employee Upload Guide

## For HRO (Human Resource Officers)

This guide explains how to add multiple employees to CSMS using an offline Excel/CSV file.

## Overview

Instead of manually entering each employee one-by-one through the web interface, you can:
1. Download an Excel/CSV template
2. Fill in employee details offline
3. Upload the completed file to CSMS
4. The system will process and validate all entries

---

## Step-by-Step Instructions

### Step 1: Download the Template

**Option A: Download from CSMS**
- Login to CSMS at https://csms.zanajira.go.tz
- Go to Dashboard → Add Employee → Bulk Upload
- Click "Download Template" button

**Option B: Direct Download**
- Visit: https://csms.zanajira.go.tz/templates/CSMS_Employee_Bulk_Upload_Template.csv
- Save the file to your computer

---

### Step 2: Fill in Employee Data

Open the template in Microsoft Excel, Google Sheets, or LibreOffice Calc.

#### Required Fields (Must be filled) - Marked with *

| Field Name | Format | Example | Notes |
|------------|--------|---------|-------|
| **Name*** | Text | John Doe | Full employee name |
| **Gender*** | Male/Female | Male | Only "Male" or "Female" |
| **ZanID*** | Numbers | 19901234567 | Must be unique |
| **Date of Birth*** | YYYY-MM-DD | 1990-01-15 | Format: Year-Month-Day |
| **ZSSF Number*** | Text/Numbers | ZSSF123456 | Must be unique |
| **Payroll Number*** | Text/Numbers | PR001 | Must be unique |
| **Cadre*** | Text | Nurse | Job title/position |
| **Ministry*** | Text | Ministry of Health | Full ministry name |
| **Department*** | Text | Pediatrics | Department name |
| **Employment Date*** | YYYY-MM-DD | 2018-01-10 | Date employee started |

#### Optional Fields

| Field Name | Format | Example | Notes |
|------------|--------|---------|-------|
| Place of Birth | Text | Zanzibar | City/town of birth |
| Region | Text | Unguja | Region name |
| Country of Birth | Text | Tanzania | Country name |
| Phone Number | 10 digits (0XXXXXXXXX) | 0773101012 | Must start with 0 |
| Contact Address | Text | Vuga Road Zanzibar | Full address |
| Salary Scale | Text | PGSS 6 | Pay scale |
| Appointment Type | Text | Permanent | Type of appointment |
| Contract Type | Text | Full-time | Contract details |
| Recent Title Date | YYYY-MM-DD | 2020-01-01 | Date of recent promotion |
| Current Reporting Office | Text | HR Department | Office location |
| Current Workplace | Text | Zanzibar Hospital | Workplace name |
| Confirmation Date | YYYY-MM-DD | 2019-01-10 | Date confirmed |
| Retirement Date | YYYY-MM-DD | 2055-01-15 | Expected retirement |
| Status | Text | On Probation | Options: "On Probation", "Confirmed", "Retired", "On Leave", "Suspended" |

---

### Step 3: Important Validation Rules

#### Date Format
- **MUST** use format: YYYY-MM-DD
- ✅ Correct: 1990-01-15
- ❌ Wrong: 15/01/1990, 01-15-1990, 15-Jan-1990

#### Phone Number
- **MUST** be exactly 10 digits starting with 0
- ✅ Correct: 0773101012
- ❌ Wrong: +255773101012, 773101012, 0773-101-012

#### Unique Fields (No Duplicates)
These fields must be unique across ALL employees:
- ZanID
- ZSSF Number
- Payroll Number

If any duplicates are found, those rows will be rejected.

#### Gender
- Only two values allowed: "Male" or "Female"
- Case-sensitive

#### Status
- If left blank, defaults to "On Probation"
- Valid options: "On Probation", "Confirmed", "Retired", "On Leave", "Suspended"

---

### Step 4: Sample Data

The template includes 2 sample rows to show correct formatting:

```
Row 1: John Doe - Male employee with all fields filled
Row 2: Jane Smith - Female employee with all fields filled
```

**IMPORTANT:** Delete the sample rows before adding your real employee data!

---

### Step 5: Upload to CSMS

1. Save your completed Excel/CSV file
2. Login to CSMS at https://csms.zanajira.go.tz
3. Go to Dashboard → Add Employee → Bulk Upload
4. Click "Choose File" and select your CSV file
5. Click "Upload and Validate"
6. Review the validation results:
   - ✅ Valid rows will be highlighted in green
   - ❌ Invalid rows will be highlighted in red with error messages
7. If all validations pass, click "Confirm and Submit"

---

## Upload Process

### What Happens During Upload?

1. **File Validation**
   - Check if file is CSV format
   - Verify all required columns exist
   - Check for empty required fields

2. **Data Validation** (for each row)
   - Required fields are filled
   - Date formats are correct
   - Phone numbers are valid format
   - No duplicate ZanID, ZSSF, or Payroll numbers
   - Gender values are valid
   - Status values are valid

3. **Database Check**
   - Check if ZanID already exists in system
   - Check if ZSSF Number already exists in system
   - Check if Payroll Number already exists in system

4. **Bulk Insert**
   - All valid employees are created
   - Invalid rows are reported with specific error messages

---

## Error Messages and Solutions

### Common Errors

| Error Message | Solution |
|--------------|----------|
| "ZanID is required" | Fill in the ZanID column |
| "An employee with this ZanID already exists" | Use a different ZanID (this one is taken) |
| "Phone number must be 10 digits starting with 0" | Fix format: 0XXXXXXXXX |
| "Invalid date format" | Use YYYY-MM-DD format |
| "Gender must be Male or Female" | Check spelling and capitalization |
| "Cadre is required" | Fill in the Cadre (job title) |
| "Employment Date is required" | Fill in the employment start date |

---

## Tips for Success

### Before Upload
1. ✅ Remove sample data rows
2. ✅ Double-check all required fields have values
3. ✅ Verify date formats (YYYY-MM-DD)
4. ✅ Verify phone numbers start with 0
5. ✅ Check for duplicate ZanIDs, ZSSF Numbers, Payroll Numbers
6. ✅ Save file as CSV (Comma-separated values)

### During Data Entry
1. Copy-paste from existing databases when possible
2. Use Excel's data validation features to prevent errors
3. Sort by ZanID to easily spot duplicates
4. Keep a backup copy of your original data

### After Upload
1. Review the success/error report carefully
2. For failed rows, fix the errors and re-upload
3. Verify employees appear in the employee list
4. Check that employee profiles are correct

---

## File Format Requirements

### Supported Formats
- CSV (Comma-separated values) - **Recommended**
- Excel files (.xlsx, .xls) may need to be saved as CSV

### Encoding
- UTF-8 encoding (default for most modern applications)

### Size Limits
- Maximum 1000 employees per upload
- Maximum file size: 5MB

---

## Security Notes

- Only HRO (Human Resource Officers) with manual entry permission can upload
- Your institution must have manual entry enabled
- Upload must be within the permitted time window
- All uploads are logged and audited
- Employees created via bulk upload will have dataSource: "MANUAL_ENTRY"

---

## Support

If you encounter issues:
1. Check this guide first
2. Verify your CSV file format
3. Contact your CSMS administrator
4. Email: support@csms.zanajira.go.tz

---

## Version History

- **v1.0** (2026-01-30) - Initial bulk upload feature
- Template location: `/public/templates/CSMS_Employee_Bulk_Upload_Template.csv`
- API endpoint: `/api/employees/bulk-upload`

---

## Appendix: Excel Tips

### How to Save as CSV in Excel
1. File → Save As
2. Choose "CSV (Comma delimited) (*.csv)"
3. Click Save
4. If prompted about features, click "Yes" to keep CSV format

### How to Check for Duplicates in Excel
1. Select the ZanID column
2. Home → Conditional Formatting → Highlight Cell Rules → Duplicate Values
3. Duplicates will be highlighted in red
4. Repeat for ZSSF Number and Payroll Number columns

### How to Format Dates in Excel
1. Select date columns
2. Right-click → Format Cells
3. Choose "Custom"
4. Enter format: yyyy-mm-dd
5. Click OK
