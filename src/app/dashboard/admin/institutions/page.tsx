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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';
import { Pencil, PlusCircle, Trash2, Loader2, FileDown } from 'lucide-react';
import { loadPdfExporter, loadExcelExporter } from '@/lib/export-utils';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { apiClient } from '@/lib/api-client';

// Augment jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface Institution {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  voteNumber?: string;
  tinNumber?: string;
  manualEntryEnabled?: boolean;
  manualEntryStartDate?: Date | string | null;
  manualEntryEndDate?: Date | string | null;
}

const institutionSchema = z.object({
  name: z.string().min(3, {
    message: 'Institution name must be at least 3 characters long.',
  }),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  voteNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  manualEntryEnabled: z.boolean().optional(),
  manualEntryStartDate: z.string().optional().or(z.literal('')),
  manualEntryEndDate: z.string().optional().or(z.literal('')),
});

type InstitutionFormValues = z.infer<typeof institutionSchema>;

export default function InstitutionManagementPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] =
    useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] =
    useState<Institution | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getInstitutions();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch institutions');
      }
      setInstitutions(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not load institutions.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [searchQuery]);

  const form = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      voteNumber: '',
      tinNumber: '',
      manualEntryEnabled: false,
      manualEntryStartDate: '',
      manualEntryEndDate: '',
    },
  });

  const onSubmit = async (data: InstitutionFormValues) => {
    setIsSubmitting(true);

    try {
      // Format the data for API
      const formattedData = {
        ...data,
        manualEntryStartDate: data.manualEntryStartDate
          ? new Date(data.manualEntryStartDate).toISOString()
          : null,
        manualEntryEndDate: data.manualEntryEndDate
          ? new Date(data.manualEntryEndDate).toISOString()
          : null,
      };

      const response = editingInstitution
        ? await apiClient.updateInstitution(editingInstitution.id, formattedData)
        : await apiClient.createInstitution(formattedData);

      if (!response.success) {
        throw new Error(response.message || 'An error occurred');
      }

      toast({
        title: `Institution ${editingInstitution ? 'Updated' : 'Created'}`,
        description: `The institution has been ${editingInstitution ? 'updated' : 'added'} successfully.`,
      });
      await fetchInstitutions(); // Re-fetch the list
      closeDialog();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (institution: Institution) => {
    setEditingInstitution(institution);

    // Format dates for datetime-local input
    const formatDateForInput = (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    };

    form.reset({
      name: institution.name,
      email: institution.email || '',
      phoneNumber: institution.phoneNumber || '',
      voteNumber: institution.voteNumber || '',
      tinNumber: institution.tinNumber || '',
      manualEntryEnabled: institution.manualEntryEnabled || false,
      manualEntryStartDate: formatDateForInput(institution.manualEntryStartDate),
      manualEntryEndDate: formatDateForInput(institution.manualEntryEndDate),
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInstitution(null);
    form.reset({
      name: '',
      email: '',
      phoneNumber: '',
      voteNumber: '',
      tinNumber: '',
      manualEntryEnabled: false,
      manualEntryStartDate: '',
      manualEntryEndDate: '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingInstitution(null);
  };

  const openDeleteDialog = (institution: Institution) => {
    setInstitutionToDelete(institution);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setInstitutionToDelete(null);
  };

  const handleDelete = async () => {
    if (!institutionToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiClient.deleteInstitution(institutionToDelete.id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete institution');
      }
      toast({
        title: 'Institution Deleted',
        description: 'The institution has been deleted.',
        variant: 'default',
      });
      await fetchInstitutions(); // Re-fetch list
      closeDeleteDialog();
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportToPdf = async () => {
    if (!filteredInstitutions || filteredInstitutions.length === 0) {
      toast({
        title: 'Export Error',
        description: 'No institutions data to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Dynamically load jsPDF library (lazy loading)
      const jsPDF = await loadPdfExporter();

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(18);
      doc.text('Institutions List', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Total Institutions: ${filteredInstitutions.length}`, 14, 36);

      const tableColumn = [
        'Institution Name',
        'Email',
        'Phone Number',
        'Tin Number',
        'Vote Number',
        'Manual Entry',
      ];
      const tableRows: any[][] = [];

      filteredInstitutions.forEach((institution) => {
        const manualEntryStatus = institution.manualEntryEnabled
          ? 'Enabled'
          : 'Disabled';
        const rowData = [
          institution.name,
          institution.email || '-',
          institution.phoneNumber || '-',
          institution.tinNumber || '-',
          institution.voteNumber || '-',
          manualEntryStatus,
        ];
        tableRows.push(rowData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 'auto' } },
      });

      doc.save(
        `institutions_list_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast({
        title: 'PDF Exported',
        description: 'Institutions list exported to PDF successfully.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!filteredInstitutions || filteredInstitutions.length === 0) {
      toast({
        title: 'Export Error',
        description: 'No institutions data to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Dynamically load XLSX library (lazy loading)
      const XLSX = await loadExcelExporter();

      const wsData: any[][] = [
        [
          'Institution Name',
          'Email',
          'Phone Number',
          'Tin Number',
          'Vote Number',
          'Manual Entry',
        ],
      ];

      filteredInstitutions.forEach((institution) => {
        const manualEntryStatus = institution.manualEntryEnabled
          ? 'Enabled'
          : 'Disabled';
        const rowData = [
          institution.name,
          institution.email || '',
          institution.phoneNumber || '',
          institution.tinNumber || '',
          institution.voteNumber || '',
          manualEntryStatus,
        ];
        wsData.push(rowData);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Institutions');
      XLSX.writeFile(
        wb,
        `institutions_list_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      toast({
        title: 'Excel Exported',
        description: 'Institutions list exported to Excel successfully.',
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export Excel. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredInstitutions = institutions.filter((institution) => {
    const query = searchQuery.toLowerCase();
    return (
      institution.name.toLowerCase().includes(query) ||
      (institution.email && institution.email.toLowerCase().includes(query)) ||
      (institution.phoneNumber &&
        institution.phoneNumber.toLowerCase().includes(query)) ||
      (institution.voteNumber &&
        institution.voteNumber.toLowerCase().includes(query)) ||
      (institution.tinNumber &&
        institution.tinNumber.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage);
  const paginatedInstitutions = filteredInstitutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <PageHeader
        title="Institution Management"
        description="Create, update, and manage institutions in the system."
        actions={
          <div className="flex space-x-2">
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Institution
            </Button>
            {filteredInstitutions.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToPdf}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Export Excel
                </Button>
              </>
            )}
          </div>
        }
      />
      <Input
        placeholder="Search by name, email, phone, vote number, or tin number..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md mb-4"
      />
      <Card>
        <CardHeader>
          <CardTitle>Institutions List</CardTitle>
          <CardDescription>
            A list of all institutions configured in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Tin Number</TableHead>
                    <TableHead>Vote Number</TableHead>
                    <TableHead>Manual Entry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstitutions.map((inst) => {
                    const isEnabled = inst.manualEntryEnabled || false;
                    const now = new Date();
                    const startDate = inst.manualEntryStartDate
                      ? new Date(inst.manualEntryStartDate)
                      : null;
                    const endDate = inst.manualEntryEndDate
                      ? new Date(inst.manualEntryEndDate)
                      : null;
                    const isActive =
                      isEnabled &&
                      startDate &&
                      endDate &&
                      now >= startDate &&
                      now <= endDate;

                    return (
                      <TableRow key={inst.id}>
                        <TableCell className="font-medium">
                          {inst.name}
                        </TableCell>
                        <TableCell>{inst.email || '-'}</TableCell>
                        <TableCell>{inst.phoneNumber || '-'}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {inst.tinNumber || '-'}
                        </TableCell>
                        <TableCell>{inst.voteNumber || '-'}</TableCell>
                        <TableCell>
                          {isEnabled ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {isActive ? '🟢 Active' : '🟡 Enabled'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                              ❌ Disabled
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(inst)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => openDeleteDialog(inst)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={institutions.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstitution ? 'Edit Institution' : 'Add New Institution'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wizara ya Afya" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., info@afya.go.tz"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +255 24 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="voteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vote Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tinNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tin Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123-456-789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold">Manual Employee Entry Permission</h3>
                <FormField
                  control={form.control}
                  name="manualEntryEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Manual Entry</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow HRO users from this institution to manually add employees
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('manualEntryEnabled') && (
                  <>
                    <FormField
                      control={form.control}
                      name="manualEntryStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              className="block w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manualEntryEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              className="block w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Institution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {institutionToDelete?.name}
              </span>
              ? This action cannot be undone. All associated data may be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
