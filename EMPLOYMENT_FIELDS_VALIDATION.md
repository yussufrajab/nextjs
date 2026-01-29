# Employment Fields Validation - Add Employee Form

## Summary
Added required field validation for Cadre, Ministry, Department, and Employment Date in Step 2 (Employment Details) of the manual employee entry form.

## Changes Made

### File Modified
`src/components/manual-entry/employment-info-step.tsx`

### New Required Fields (with red asterisk *)
1. **Cadre** - Employee's job cadre (e.g., Nurse, Teacher, Engineer)
2. **Ministry** - The ministry the employee belongs to
3. **Department** - The specific department within the institution
4. **Employment Date** - Date when the employee was hired

## Implementation Details

### 1. Added Validation State
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});
```

### 2. Real-Time Validation Function
```typescript
const validateRequiredField = (fieldName: string, value: any) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: `${fieldName} is required`,
    }));
  } else {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
};
```

### 3. Submit Validation
```typescript
const handleNext = () => {
  const newErrors: Record<string, string> = {};

  // Required field validation
  if (!data.cadre) newErrors.cadre = 'Cadre is required';
  if (!data.ministry) newErrors.ministry = 'Ministry is required';
  if (!data.department) newErrors.department = 'Department is required';
  if (!data.employmentDate) newErrors.employmentDate = 'Employment Date is required';

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  onNext();
};
```

### 4. UI Enhancements
- **Red asterisk (*)** next to required field labels
- **Red border** on fields with errors
- **Error messages** displayed below each invalid field
- **Error count** displayed at the bottom
- **Disabled submit button** when there are validation errors
- **Information banner** at the top explaining required fields

## User Experience

### Visual Indicators
1. **Label with asterisk**: `Cadre *`
2. **Red border**: Input field turns red when empty after user interaction
3. **Error message**: "Cadre is required" appears below the field
4. **Submit prevention**: "Create Employee" button is disabled if errors exist

### Validation Flow
1. User enters Step 2 (Employment Details)
2. Required fields show red asterisk (*)
3. As user types, validation occurs in real-time
4. If user leaves a required field empty, error message appears
5. Error count shows at bottom: "Please fix 2 error(s) before proceeding"
6. Submit button disabled until all required fields are filled

## Complete Required Fields List

### Step 1: Personal Information
- Name *
- Gender *
- ZanID * (with duplicate check)
- Date of Birth *
- ZSSF Number * (with duplicate check)
- Payroll Number * (with duplicate check)

### Step 2: Employment Details (NEW)
- **Cadre *** (NEW)
- **Ministry *** (NEW)
- **Department *** (NEW)
- **Employment Date *** (NEW)

### Step 3: Documents
- Optional document uploads

## Testing Checklist

### Test Case 1: Empty Fields Validation
1. Navigate to Step 2 (Employment Details)
2. Leave all required fields empty
3. Click "Create Employee"
4. **Expected**: Error messages appear for all 4 required fields
5. **Expected**: Submit button is disabled
6. **Expected**: Error count shows "Please fix 4 error(s)"

### Test Case 2: Partial Completion
1. Fill only Cadre and Ministry
2. Leave Department and Employment Date empty
3. Click "Create Employee"
4. **Expected**: Error messages for Department and Employment Date
5. **Expected**: Error count shows "Please fix 2 error(s)"

### Test Case 3: Complete All Fields
1. Fill all required fields:
   - Cadre: "Nurse"
   - Ministry: "Ministry of Health"
   - Department: "Pediatrics"
   - Employment Date: "2024-01-15"
2. Click "Create Employee"
3. **Expected**: Form submits successfully
4. **Expected**: Employee is created in database

### Test Case 4: Real-Time Validation
1. Start typing in Cadre field
2. Delete all text
3. Move to next field (blur event)
4. **Expected**: Red border appears on Cadre field
5. **Expected**: Error message "Cadre is required" appears
6. Type in Cadre field again
7. **Expected**: Error clears immediately

### Test Case 5: Navigation
1. Fill Step 1 completely
2. Navigate to Step 2
3. Click "Previous" button
4. **Expected**: Can navigate back without validation errors
5. **Expected**: Data is preserved when returning to Step 2

## Database Schema

These fields map to the Employee table:

```prisma
model Employee {
  id              String    @id @default(cuid())
  cadre           String?   // Now required in form
  ministry        String?   // Now required in form
  department      String?   // Now required in form
  employmentDate  DateTime? // Now required in form
  // ... other fields
}
```

**Note**: Database schema allows null values for backward compatibility, but the form enforces these as required for new manual entries.

## Error Messages

All error messages follow the format:
- "Cadre is required"
- "Ministry is required"
- "Department is required"
- "Employment Date is required"

## Consistency with Step 1

The validation implementation matches the style and behavior of Step 1 (PersonalInfoStep):
- Same error state management
- Same real-time validation approach
- Same UI/UX patterns
- Same error display style

## Deployment

After making this change, deploy using:
```bash
cd /www/wwwroot/nextjspro
./scripts/force-fresh-deployment.sh
```

Then hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## Rollback

If issues occur, revert the change:
```bash
git log --oneline src/components/manual-entry/employment-info-step.tsx
git checkout <previous-commit> src/components/manual-entry/employment-info-step.tsx
npm run build
pm2 restart all
```

## Future Enhancements

Potential improvements:
1. Add field-specific validation (e.g., validate date is not in future)
2. Add autocomplete for Ministry from a predefined list
3. Add autocomplete for Department based on selected Ministry
4. Add validation to ensure Employment Date is before current date
5. Add cadre selection from a dropdown of valid cadres

## Related Files

- `src/components/manual-entry/personal-info-step.tsx` - Step 1 with similar validation
- `src/app/dashboard/add-employee/page.tsx` - Main form container
- `src/components/manual-entry/documents-step.tsx` - Step 3 (documents)
- `src/app/api/employees/manual-entry/route.ts` - Backend API endpoint

## Version History

- **v2.1** (Jan 29, 2026) - Added validation for Cadre, Ministry, Department, Employment Date
- **v2.0** (Jan 28, 2026) - Initial implementation with PersonalInfoStep validation
- **v1.0** - Original implementation without validation
