'use client';

import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/shared/pagination';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

// TypeScript interfaces
interface Institution {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  voteNumber?: string | null;
  tinNumber?: string | null;
}

interface Employee {
  id: string;
  name: string;
  gender: string;
  zanId: string;
  payrollNumber?: string | null;
  zssfNumber?: string | null;
  cadre?: string | null;
  Institution?: {
    id: string;
    name: string;
  };
}

export default function InstitutionsPage() {
  const { user, role } = useAuth();

  // Access control - only CSC roles can access this page
  const allowedRoles = ['HHRMD', 'CSCS', 'DO', 'HRMO'];

  // State management
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [currentInstitutionPage, setCurrentInstitutionPage] = useState(1);
  const [currentEmployeePage, setCurrentEmployeePage] = useState(1);
  const [employeePagination, setEmployeePagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // Check access control
  useEffect(() => {
    if (role && !allowedRoles.includes(role)) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access this page",
        variant: 'destructive',
      });
    }
  }, [role]);

  // Fetch institutions on component mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      setIsLoadingInstitutions(true);
      try {
        const response = await fetch('/api/institutions');
        const data = await response.json();
        if (data.success) {
          setInstitutions(data.data || []);
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to load institutions',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching institutions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load institutions',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInstitutions(false);
      }
    };
    fetchInstitutions();
  }, []);

  // Fetch employees when institution selected or search/page changes
  useEffect(() => {
    if (!selectedInstitution) {
      setEmployees([]);
      return;
    }

    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const params = new URLSearchParams({
          userRole: role || '',
          userInstitutionId: user?.institutionId || '',
          institutionId: selectedInstitution.id,
          page: currentEmployeePage.toString(),
          size: '20',
        });

        // Apply search if exists
        if (employeeSearchQuery) {
          params.append('q', employeeSearchQuery);
        }

        const response = await fetch(`/api/employees?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setEmployees(data.data || []);
          setEmployeePagination({
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to load employees',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: 'Error',
          description: 'Failed to load employees',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [
    selectedInstitution,
    currentEmployeePage,
    employeeSearchQuery,
    role,
    user,
  ]);

  // Client-side institution filtering
  const filteredInstitutions = useMemo(() => {
    if (!institutionSearchQuery) return institutions;

    const query = institutionSearchQuery.toLowerCase();
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(query) ||
        inst.voteNumber?.toLowerCase().includes(query) ||
        inst.tinNumber?.toLowerCase().includes(query) ||
        inst.email?.toLowerCase().includes(query) ||
        inst.phoneNumber?.includes(query)
    );
  }, [institutions, institutionSearchQuery]);

  // Paginate institutions (client-side)
  const institutionsPerPage = 10;
  const paginatedInstitutions = useMemo(() => {
    const start = (currentInstitutionPage - 1) * institutionsPerPage;
    return filteredInstitutions.slice(start, start + institutionsPerPage);
  }, [filteredInstitutions, currentInstitutionPage]);

  // Access control check
  if (!role || !allowedRoles.includes(role)) {
    return (
      <div>
        <PageHeader
          title="Access Denied"
          description="You don't have permission to view this page"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Institutions"
        description="View institutions and their employees"
      />

      {/* Institution Search & List Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select an Institution</CardTitle>
          <CardDescription>
            Search and select an institution to view its employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-4">
            <Input
              placeholder="Search by name, vote number, TIN number, email, or phone..."
              value={institutionSearchQuery}
              onChange={(e) => {
                setInstitutionSearchQuery(e.target.value);
                setCurrentInstitutionPage(1); // Reset to first page on search
              }}
              className="max-w-lg"
            />
          </div>

          {/* Institutions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Vote Number</TableHead>
                  <TableHead>TIN Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInstitutions ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginatedInstitutions.length > 0 ? (
                  paginatedInstitutions.map((inst) => (
                    <TableRow
                      key={inst.id}
                      className={
                        selectedInstitution?.id === inst.id ? 'bg-muted' : ''
                      }
                    >
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>{inst.voteNumber || '-'}</TableCell>
                      <TableCell>{inst.tinNumber || '-'}</TableCell>
                      <TableCell>{inst.email || '-'}</TableCell>
                      <TableCell>{inst.phoneNumber || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={
                            selectedInstitution?.id === inst.id
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            setSelectedInstitution(inst);
                            setCurrentEmployeePage(1);
                            setEmployeeSearchQuery('');
                          }}
                        >
                          {selectedInstitution?.id === inst.id
                            ? 'Selected'
                            : 'Select'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {institutionSearchQuery
                        ? 'No institutions found matching your search'
                        : 'No institutions found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredInstitutions.length > institutionsPerPage && (
            <div className="mt-4">
              <Pagination
                currentPage={currentInstitutionPage}
                totalPages={Math.ceil(
                  filteredInstitutions.length / institutionsPerPage
                )}
                onPageChange={setCurrentInstitutionPage}
                totalItems={filteredInstitutions.length}
                itemsPerPage={institutionsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee List Card - Only shown when institution selected */}
      {selectedInstitution && (
        <Card>
          <CardHeader>
            <CardTitle>Employees at {selectedInstitution.name}</CardTitle>
            <CardDescription>
              {employeePagination.total > 0
                ? `${employeePagination.total} employee(s) found`
                : 'No employees found for this institution'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Employee Search */}
            <div className="mb-4">
              <Input
                placeholder="Search employees by name, ZanID, payroll number, or cadre..."
                value={employeeSearchQuery}
                onChange={(e) => {
                  setEmployeeSearchQuery(e.target.value);
                  setCurrentEmployeePage(1);
                }}
                className="max-w-lg"
              />
            </div>

            {/* Employees Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>ZanID</TableHead>
                    <TableHead>Payroll Number</TableHead>
                    <TableHead>ZSSF Number</TableHead>
                    <TableHead>Rank (Cadre)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEmployees ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : employees.length > 0 ? (
                    employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.name}
                        </TableCell>
                        <TableCell>{emp.gender || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {emp.zanId}
                        </TableCell>
                        <TableCell>{emp.payrollNumber || '-'}</TableCell>
                        <TableCell>{emp.zssfNumber || '-'}</TableCell>
                        <TableCell>{emp.cadre || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/dashboard/profile?employeeId=${emp.id}`}
                            >
                              View Profile
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        {employeeSearchQuery
                          ? 'No employees found matching your search'
                          : 'No employees found for this institution'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Employee Pagination */}
            {employees.length > 0 && employeePagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentEmployeePage}
                  totalPages={employeePagination.totalPages}
                  onPageChange={setCurrentEmployeePage}
                  totalItems={employeePagination.total}
                  itemsPerPage={20}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
