'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Download, Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  validEmployees: any[];
  invalidEmployees: any[];
}

export function BulkUpload({ onComplete }: { onComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file type
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
        return;
      }

      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      setValidationResult(null);
      setUploadComplete(false);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/employees/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Validation failed');
      }

      setValidationResult(result.data);

      if (result.data.invalidRows > 0) {
        toast({
          title: 'Validation Complete',
          description: `${result.data.validRows} valid, ${result.data.invalidRows} invalid rows found`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Validation Successful',
          description: `All ${result.data.validRows} rows are valid and ready to upload`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validationResult || validationResult.validRows === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/employees/bulk-upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: validationResult.validEmployees,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Upload Successful',
        description: `${result.data.created} employee(s) created successfully`,
      });

      setUploadComplete(true);

      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setUploadComplete(false);
  };

  return (
    <div className="space-y-6">
      {/* Download Template Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Step 1: Download Template
          </CardTitle>
          <CardDescription>
            Download the CSV template, fill in employee data offline, and upload it back
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Template Instructions</AlertTitle>
              <AlertDescription>
                The template includes:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>All required and optional fields</li>
                  <li>Sample data rows (delete before using)</li>
                  <li>Field format examples</li>
                  <li>Validation rules in comments</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button asChild variant="outline" className="flex-1">
                <a href="/templates/CSMS_Employee_Bulk_Upload_Template.csv" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="/dashboard/docs/bulk-upload" target="_blank">
                  <FileText className="mr-2 h-4 w-4" />
                  View Full Guide
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload File Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 2: Upload Completed File
          </CardTitle>
          <CardDescription>
            Select your completed CSV file to validate and upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90
                  cursor-pointer"
                disabled={isValidating || isSubmitting || uploadComplete}
              />
            </div>

            {file && !uploadComplete && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      onClick={handleValidate}
                      disabled={isValidating || !!validationResult}
                    >
                      {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {validationResult ? 'Validated' : 'Validate File'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isValidating && (
              <div className="space-y-2">
                <Progress value={undefined} className="animate-pulse" />
                <p className="text-sm text-center text-gray-500">
                  Validating file... This may take a moment for large files.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && !uploadComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.invalidRows === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              Step 3: Review Validation Results
            </CardTitle>
            <CardDescription>
              {validationResult.validRows} valid row(s), {validationResult.invalidRows} invalid row(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{validationResult.totalRows}</p>
                      <p className="text-sm text-gray-500">Total Rows</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {validationResult.validRows}
                      </p>
                      <p className="text-sm text-gray-500">Valid Rows</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">
                        {validationResult.invalidRows}
                      </p>
                      <p className="text-sm text-gray-500">Invalid Rows</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Invalid Rows Table */}
              {validationResult.invalidRows > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-red-600">
                    Invalid Rows - Please Fix These
                  </h3>
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row #</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>ZanID</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.invalidEmployees.map((emp) => (
                          <TableRow key={emp.rowNumber}>
                            <TableCell>{emp.rowNumber}</TableCell>
                            <TableCell>{emp.name || 'N/A'}</TableCell>
                            <TableCell>{emp.zanId || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {emp.errors.map((error: string, idx: number) => (
                                  <Badge key={idx} variant="destructive" className="mr-1">
                                    {error}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                      Please fix the errors in your CSV file and re-upload. Only valid rows will be
                      uploaded to the system.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Valid Rows Preview */}
              {validationResult.validRows > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-green-600">
                    Valid Rows - Ready to Upload ({validationResult.validRows})
                  </h3>
                  <div className="border rounded-lg overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row #</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>ZanID</TableHead>
                          <TableHead>Cadre</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.validEmployees.slice(0, 10).map((emp) => (
                          <TableRow key={emp.rowNumber}>
                            <TableCell>{emp.rowNumber}</TableCell>
                            <TableCell>{emp.name}</TableCell>
                            <TableCell>{emp.gender}</TableCell>
                            <TableCell>{emp.zanId}</TableCell>
                            <TableCell>{emp.cadre}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{emp.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {validationResult.validRows > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 10 of {validationResult.validRows} valid rows
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
                  Start Over
                </Button>
                {validationResult.validRows > 0 && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload {validationResult.validRows} Employee(s)
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {uploadComplete && (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-2xl font-bold">Upload Complete!</h3>
              <p className="text-gray-600">
                All valid employees have been successfully added to the system.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button onClick={handleReset}>Upload Another File</Button>
                {onComplete && (
                  <Button variant="outline" onClick={onComplete}>
                    View Employees
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
