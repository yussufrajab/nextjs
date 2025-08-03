
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
import { Pencil, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { apiClient } from '@/lib/api-client';

export interface Institution {
  id: string;
  name: string;
}

const institutionSchema = z.object({
  name: z.string().min(3, { message: "Institution name must be at least 3 characters long." }),
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
    form.reset({ name: institution.name });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInstitution(null);
    form.reset({ name: "" });
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

  const filteredInstitutions = institutions.filter(institution =>
    institution.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Institution
          </Button>
        }
      />
      <Input
        placeholder="Search institutions by name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm mb-4"
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
                    <TableHead>Institution Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstitutions.map(inst => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
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
