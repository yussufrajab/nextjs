
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';
import { Pencil, PlusCircle, Trash2, Loader2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
}

const institutionSchema = z.object({
  name: z.string().min(3, { message: "Institution name must be at least 3 characters long." }),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  voteNumber: z.string().optional(),
});

type InstitutionFormValues = z.infer<typeof institutionSchema>;

export default function InstitutionManagementPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      toast({ title: "Error", description: "Could not load institutions.", variant: "destructive" });
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
      name: "",
      email: "",
      phoneNumber: "",
      voteNumber: "",
    },
  });

  const onSubmit = async (data: InstitutionFormValues) => {
    setIsSubmitting(true);

    try {
      const response = editingInstitution 
        ? await apiClient.updateInstitution(editingInstitution.id, data)
        : await apiClient.createInstitution(data);

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openEditDialog = (institution: Institution) => {
    setEditingInstitution(institution);
    form.reset({ 
      name: institution.name,
      email: institution.email || "",
      phoneNumber: institution.phoneNumber || "",
      voteNumber: institution.voteNumber || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInstitution(null);
    form.reset({ 
      name: "",
      email: "",
      phoneNumber: "",
      voteNumber: "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingInstitution(null);
  };
  
  const handleDelete = async (id: string) => {
      try {
        const response = await apiClient.deleteInstitution(id);
        if (!response.success) {
          throw new Error(response.message || 'Failed to delete institution');
        }
        toast({ title: "Institution Deleted", description: "The institution has been deleted.", variant: "default" });
        await fetchInstitutions(); // Re-fetch list
      } catch (error: any) {
         toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
      }
  };

  const handleExportToPdf = () => {
    if (!filteredInstitutions || filteredInstitutions.length === 0) {
      toast({ title: "Export Error", description: "No institutions data to export.", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Institutions List', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Institutions: ${filteredInstitutions.length}`, 14, 36);

    const tableColumn = ['Institution ID', 'Institution Name', 'Email', 'Phone Number', 'Vote Number'];
    const tableRows: any[][] = [];

    filteredInstitutions.forEach(institution => {
      const rowData = [
        institution.id,
        institution.name,
        institution.email || '-',
        institution.phoneNumber || '-',
        institution.voteNumber || '-'
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
    
    doc.save(`institutions_list_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "PDF Exported", description: "Institutions list exported to PDF successfully." });
  };

  const handleExportToExcel = () => {
    if (!filteredInstitutions || filteredInstitutions.length === 0) {
      toast({ title: "Export Error", description: "No institutions data to export.", variant: "destructive" });
      return;
    }

    const wsData: any[][] = [['Institution ID', 'Institution Name', 'Email', 'Phone Number', 'Vote Number']];

    filteredInstitutions.forEach(institution => {
      const rowData = [
        institution.id,
        institution.name,
        institution.email || '',
        institution.phoneNumber || '',
        institution.voteNumber || ''
      ];
      wsData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Institutions");
    XLSX.writeFile(wb, `institutions_list_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Excel Exported", description: "Institutions list exported to Excel successfully." });
  };

  const filteredInstitutions = institutions.filter(institution => {
    const query = searchQuery.toLowerCase();
    return (
      institution.id.toLowerCase().includes(query) ||
      institution.name.toLowerCase().includes(query) ||
      (institution.email && institution.email.toLowerCase().includes(query)) ||
      (institution.phoneNumber && institution.phoneNumber.toLowerCase().includes(query)) ||
      (institution.voteNumber && institution.voteNumber.toLowerCase().includes(query))
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
                <Button variant="outline" size="sm" onClick={handleExportToPdf}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </>
            )}
          </div>
        }
      />
      <Input
        placeholder="Search by ID, name, email, phone, or vote number..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md mb-4"
      />
      <Card>
        <CardHeader>
          <CardTitle>Institutions List</CardTitle>
          <CardDescription>A list of all institutions configured in the system.</CardDescription>
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
                    <TableHead>Institution ID</TableHead>
                    <TableHead>Institution Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Vote Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstitutions.map(inst => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-mono text-sm text-gray-600">{inst.id}</TableCell>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>{inst.email || '-'}</TableCell>
                      <TableCell>{inst.phoneNumber || '-'}</TableCell>
                      <TableCell>{inst.voteNumber || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(inst)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(inst.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
            <DialogTitle>{editingInstitution ? "Edit Institution" : "Add New Institution"}</DialogTitle>
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
                      <Input placeholder="e.g., info@afya.go.tz" type="email" {...field} />
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
