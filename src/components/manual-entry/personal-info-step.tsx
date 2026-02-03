'use client';

// v2.1 - Duplicate validation on submit only (Jan 30, 2026)
// Removed real-time duplicate checking for better performance
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PersonalInfoStepProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onNext: () => void;
}

export function PersonalInfoStep({
  data,
  onChange,
  onNext,
}: PersonalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validatingFields, setValidatingFields] = useState<Record<string, boolean>>({});

  // Validate phone number format (10 digits starting with 0)
  const validatePhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phoneNumber;
        return newErrors;
      });
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: 'Phone number must be 10 digits starting with 0 (e.g., 0773101012)',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phoneNumber;
        return newErrors;
      });
    }
  };

  // Validate required fields in real-time
  const validateRequiredField = (fieldName: string, value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')} is required`,
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleNext = async () => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!data.name) newErrors.name = 'Name is required';
    if (!data.gender) newErrors.gender = 'Gender is required';
    if (!data.zanId) newErrors.zanId = 'ZanID is required';
    if (!data.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
    if (!data.zssfNumber) newErrors.zssfNumber = 'ZSSF Number is required';
    if (!data.payrollNumber) newErrors.payrollNumber = 'Payroll Number is required';

    // Phone number validation
    if (data.phoneNumber) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(data.phoneNumber)) {
        newErrors.phoneNumber = 'Phone number must be 10 digits starting with 0 (e.g., 0773101012)';
      }
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Show validating state
    setValidatingFields({
      zanId: true,
      zssfNumber: true,
      payrollNumber: true,
    });

    // Check for duplicates on submission
    try {
      const response = await fetch('/api/employees/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zanId: data.zanId,
          zssfNumber: data.zssfNumber,
          payrollNumber: data.payrollNumber,
        }),
      });

      const result = await response.json();

      const duplicateErrors: Record<string, string> = {};

      if (result.zanIdExists) {
        duplicateErrors.zanId = 'An employee with this ZanID already exists';
      }
      if (result.zssfNumberExists) {
        duplicateErrors.zssfNumber = 'An employee with this ZSSF Number already exists';
      }
      if (result.payrollNumberExists) {
        duplicateErrors.payrollNumber = 'An employee with this Payroll Number already exists';
      }

      if (Object.keys(duplicateErrors).length > 0) {
        setErrors(duplicateErrors);
        setValidatingFields({});
        return;
      }

      // All validations passed, proceed to next step
      setValidatingFields({});
      onNext();
    } catch (error) {
      console.error('Error validating employee data:', error);
      setErrors({
        submit: 'Failed to validate employee data. Please try again.',
      });
      setValidatingFields({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Note:</span> Fields marked with{' '}
          <span className="text-red-500 font-bold">*</span> are required. Duplicate checking
          will be performed when you click "Next".
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={data.name || ''}
            onChange={(e) => {
              onChange('name', e.target.value);
              validateRequiredField('name', e.target.value);
            }}
            placeholder="Full name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">
            Gender <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.gender || ''}
            onValueChange={(value) => {
              onChange('gender', value);
              validateRequiredField('gender', value);
            }}
          >
            <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-red-500">{errors.gender}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="zanId">
            ZanID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="zanId"
            value={data.zanId || ''}
            onChange={(e) => {
              onChange('zanId', e.target.value);
              validateRequiredField('zanId', e.target.value);
            }}
            placeholder="e.g., 19901234567"
            className={errors.zanId ? 'border-red-500' : ''}
          />
          {validatingFields.zanId && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating...
            </p>
          )}
          {errors.zanId && !validatingFields.zanId && (
            <p className="text-sm text-red-500">{errors.zanId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">
            Date of Birth <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={data.dateOfBirth || ''}
            onChange={(e) => {
              onChange('dateOfBirth', e.target.value);
              validateRequiredField('dateOfBirth', e.target.value);
            }}
            className={errors.dateOfBirth ? 'border-red-500' : ''}
          />
          {errors.dateOfBirth && (
            <p className="text-sm text-red-500">{errors.dateOfBirth}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="placeOfBirth">Place of Birth</Label>
          <Input
            id="placeOfBirth"
            value={data.placeOfBirth || ''}
            onChange={(e) => onChange('placeOfBirth', e.target.value)}
            placeholder="e.g., Zanzibar"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            value={data.region || ''}
            onChange={(e) => onChange('region', e.target.value)}
            placeholder="e.g., Unguja"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="countryOfBirth">Country of Birth</Label>
          <Input
            id="countryOfBirth"
            value={data.countryOfBirth || ''}
            onChange={(e) => onChange('countryOfBirth', e.target.value)}
            placeholder="e.g., Tanzania"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={data.phoneNumber || ''}
            onChange={(e) => {
              onChange('phoneNumber', e.target.value);
              validatePhoneNumber(e.target.value);
            }}
            onBlur={(e) => validatePhoneNumber(e.target.value)}
            placeholder="e.g., 0773101012"
            className={errors.phoneNumber ? 'border-red-500' : ''}
          />
          {errors.phoneNumber && (
            <p className="text-sm text-red-500">{errors.phoneNumber}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contactAddress">Contact Address</Label>
          <Input
            id="contactAddress"
            value={data.contactAddress || ''}
            onChange={(e) => onChange('contactAddress', e.target.value)}
            placeholder="Full contact address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zssfNumber">
            ZSSF Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="zssfNumber"
            value={data.zssfNumber || ''}
            onChange={(e) => {
              onChange('zssfNumber', e.target.value);
              validateRequiredField('zssfNumber', e.target.value);
            }}
            placeholder="ZSSF membership number"
            className={errors.zssfNumber ? 'border-red-500' : ''}
          />
          {validatingFields.zssfNumber && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating...
            </p>
          )}
          {errors.zssfNumber && !validatingFields.zssfNumber && (
            <p className="text-sm text-red-500">{errors.zssfNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payrollNumber">
            Payroll Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="payrollNumber"
            value={data.payrollNumber || ''}
            onChange={(e) => {
              onChange('payrollNumber', e.target.value);
              validateRequiredField('payrollNumber', e.target.value);
            }}
            placeholder="Employee payroll number"
            className={errors.payrollNumber ? 'border-red-500' : ''}
          />
          {validatingFields.payrollNumber && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating...
            </p>
          )}
          {errors.payrollNumber && !validatingFields.payrollNumber && (
            <p className="text-sm text-red-500">{errors.payrollNumber}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        {Object.keys(errors).length > 0 && !validatingFields.zanId && (
          <p className="text-sm text-red-500">
            Please fix {Object.keys(errors).length} error(s) before proceeding
          </p>
        )}
        {(validatingFields.zanId || validatingFields.payrollNumber || validatingFields.zssfNumber) && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Validating for duplicates...
          </p>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleNext}
            disabled={
              validatingFields.zanId ||
              validatingFields.payrollNumber ||
              validatingFields.zssfNumber
            }
          >
            {(validatingFields.zanId || validatingFields.payrollNumber || validatingFields.zssfNumber) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
