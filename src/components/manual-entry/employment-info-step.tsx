'use client';

// v2.1 - Added validation for Cadre, Ministry, Department, Employment Date (Jan 29, 2026)

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
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface EmploymentInfoStepProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export function EmploymentInfoStep({
  data,
  onChange,
  onNext,
  onPrev,
  isSubmitting,
}: EmploymentInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Note:</span> Fields marked with{' '}
          <span className="text-red-500 font-bold">*</span> are required and must be filled before proceeding.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cadre">
            Cadre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="cadre"
            value={data.cadre || ''}
            onChange={(e) => {
              onChange('cadre', e.target.value);
              validateRequiredField('cadre', e.target.value);
            }}
            placeholder="e.g., Nurse"
            className={errors.cadre ? 'border-red-500' : ''}
          />
          {errors.cadre && (
            <p className="text-sm text-red-500">{errors.cadre}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryScale">Salary Scale</Label>
          <Input
            id="salaryScale"
            value={data.salaryScale || ''}
            onChange={(e) => onChange('salaryScale', e.target.value)}
            placeholder="e.g., PGSS 6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ministry">
            Ministry <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ministry"
            value={data.ministry || ''}
            onChange={(e) => {
              onChange('ministry', e.target.value);
              validateRequiredField('ministry', e.target.value);
            }}
            placeholder="e.g., Ministry of Health"
            className={errors.ministry ? 'border-red-500' : ''}
          />
          {errors.ministry && (
            <p className="text-sm text-red-500">{errors.ministry}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">
            Department <span className="text-red-500">*</span>
          </Label>
          <Input
            id="department"
            value={data.department || ''}
            onChange={(e) => {
              onChange('department', e.target.value);
              validateRequiredField('department', e.target.value);
            }}
            placeholder="e.g., Pediatrics"
            className={errors.department ? 'border-red-500' : ''}
          />
          {errors.department && (
            <p className="text-sm text-red-500">{errors.department}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="appointmentType">Appointment Type</Label>
          <Input
            id="appointmentType"
            value={data.appointmentType || ''}
            onChange={(e) => onChange('appointmentType', e.target.value)}
            placeholder="e.g., Permanent"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractType">Contract Type</Label>
          <Input
            id="contractType"
            value={data.contractType || ''}
            onChange={(e) => onChange('contractType', e.target.value)}
            placeholder="e.g., Full-time"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recentTitleDate">Recent Title Date</Label>
          <Input
            id="recentTitleDate"
            type="date"
            value={data.recentTitleDate || ''}
            onChange={(e) => onChange('recentTitleDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentReportingOffice">Current Reporting Office</Label>
          <Input
            id="currentReportingOffice"
            value={data.currentReportingOffice || ''}
            onChange={(e) => onChange('currentReportingOffice', e.target.value)}
            placeholder="e.g., HR Department"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentWorkplace">Current Workplace</Label>
          <Input
            id="currentWorkplace"
            value={data.currentWorkplace || ''}
            onChange={(e) => onChange('currentWorkplace', e.target.value)}
            placeholder="e.g., Zanzibar Hospital"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employmentDate">
            Employment Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="employmentDate"
            type="date"
            value={data.employmentDate || ''}
            onChange={(e) => {
              onChange('employmentDate', e.target.value);
              validateRequiredField('employmentDate', e.target.value);
            }}
            className={errors.employmentDate ? 'border-red-500' : ''}
          />
          {errors.employmentDate && (
            <p className="text-sm text-red-500">{errors.employmentDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmationDate">Confirmation Date</Label>
          <Input
            id="confirmationDate"
            type="date"
            value={data.confirmationDate || ''}
            onChange={(e) => onChange('confirmationDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="retirementDate">Retirement Date</Label>
          <Input
            id="retirementDate"
            type="date"
            value={data.retirementDate || ''}
            onChange={(e) => onChange('retirementDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={data.status || 'On Probation'} onValueChange={(value) => onChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="On Probation">On Probation</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <div className="flex-1">
          {Object.keys(errors).length > 0 && (
            <p className="text-sm text-red-500">
              Please fix {Object.keys(errors).length} error(s) before proceeding
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>
      </div>
    </div>
  );
}
