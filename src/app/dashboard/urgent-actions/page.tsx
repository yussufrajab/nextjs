
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { differenceInMonths, parseISO, format } from 'date-fns';
import type { Employee } from '@/lib/types';
import { Pagination } from '@/components/shared/pagination';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Helper function to calculate precise age
const calculateAge = (dob: string) => {
  if (!dob) return 'N/A';
  try {
    const birthDate = parseISO(dob);
    const ageInMilliseconds = new Date().getTime() - birthDate.getTime();
    return (ageInMilliseconds / 31557600000).toFixed(1); // 31557600000 = 1000 * 60 * 60 * 24 * 365.25
  } catch {
    return 'N/A';
  }
};

export default function UrgentActionsPage() {
  const { user, role } = useAuth();
  
  const [currentPageProbation, setCurrentPageProbation] = useState(1);
  const [currentPageRetirement, setCurrentPageRetirement] = useState(1);
  const itemsPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);

  const [probationOverdue, setProbationOverdue] = useState<Employee[]>([]);
  const [nearingRetirement, setNearingRetirement] = useState<Employee[]>([]);

  const isAuthorized = role === ROLES.HRO || role === ROLES.HRRP;

  useEffect(() => {
    if (!isAuthorized || !user?.institutionId) {
        setIsLoading(false);
        return;
    }
    
    const fetchUrgentActions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/employees/urgent-actions?userInstitutionId=${user.institutionId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch urgent actions data");
            }
            const result = await response.json();
            if (result.success && result.data) {
                setProbationOverdue(result.data.probationOverdue || []);
                setNearingRetirement(result.data.nearingRetirement || []);
            } else {
                setProbationOverdue([]);
                setNearingRetirement([]);
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not load urgent actions.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    fetchUrgentActions();
  }, [isAuthorized, user?.institutionId]);

  const totalProbationPages = Math.ceil((probationOverdue?.length || 0) / itemsPerPage);
  const paginatedProbation = probationOverdue?.slice(
    (currentPageProbation - 1) * itemsPerPage,
    currentPageProbation * itemsPerPage
  ) || [];

  const totalRetirementPages = Math.ceil((nearingRetirement?.length || 0) / itemsPerPage);
  const paginatedRetirement = nearingRetirement?.slice(
    (currentPageRetirement - 1) * itemsPerPage,
    currentPageRetirement * itemsPerPage
  ) || [];

  if (!isAuthorized) {
    return (
      <div>
        <PageHeader title="Access Denied" />
        <Card>
          <CardContent className="pt-6">
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
        <div>
            <PageHeader title="Urgent Actions" description="Loading urgent items for your institution..."/>
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        </div>
    )
  }

  return (
    <div>
      <PageHeader title="Urgent Actions" description={`Urgent items for your institution.`} />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Confirmations</CardTitle>
            <CardDescription>Employees on probation for 12 or more months who need confirmation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ZanID</TableHead>
                  <TableHead>Employment Date</TableHead>
                  <TableHead>Months on Probation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProbation.length > 0 ? (
                  paginatedProbation.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.zanId}</TableCell>
                      <TableCell>{emp.employmentDate ? format(parseISO(emp.employmentDate.toString()), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{emp.employmentDate ? differenceInMonths(new Date(), parseISO(emp.employmentDate.toString())) : 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No employees with overdue confirmations.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPageProbation}
              totalPages={totalProbationPages}
              onPageChange={setCurrentPageProbation}
              totalItems={probationOverdue?.length || 0}
              itemsPerPage={itemsPerPage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees Nearing Retirement</CardTitle>
            <CardDescription>Employees aged 59.5 years or older who need to begin the retirement process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ZanID</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Current Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRetirement.length > 0 ? (
                  paginatedRetirement.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.zanId}</TableCell>
                      <TableCell>{emp.dateOfBirth ? format(parseISO(emp.dateOfBirth.toString()), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{calculateAge(emp.dateOfBirth as string)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No employees nearing retirement.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPageRetirement}
              totalPages={totalRetirementPages}
              onPageChange={setCurrentPageRetirement}
              totalItems={nearingRetirement?.length || 0}
              itemsPerPage={itemsPerPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
