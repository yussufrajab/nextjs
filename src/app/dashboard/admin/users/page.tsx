
'use client';
import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { ROLES } from '@/lib/constants';
import { Pencil, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { User, Role } from '@/lib/types';
import type { Institution } from '../institutions/page';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/shared/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api-client';


const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  role: z.string().min(1, "Role is required"),
  institutionId: z.string().min(1, "Institution is required."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
});

type UserFormValues = z.infer<typeof userSchema>;
type UserWithInstitutionName = User & { institution: string };

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserWithInstitutionName[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithInstitutionName | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Define role categories based on clarified requirements
  const CSC_INTERNAL_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS']; // Must be from CSC only
  const CSC_ONLY_ROLES = ['Admin']; // Must be from CSC but can see all institutions
  const INSTITUTION_BASED_ROLES = ['HRO', 'EMPLOYEE', 'HRRP']; // Can be from any institution (including CSC) but institution-based access
  
  // Find CSC institution
  const cscInstitution = institutions.find(inst => 
    inst.name === 'TUME YA UTUMISHI SERIKALINI'
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsers();
      if (!response.success) throw new Error(response.message || 'Failed to fetch users');
      const data = response.data || [];
      // Transform the data to include institution name
      const transformedUsers = data.map((user: any) => ({
        ...user,
        institution: user.institution || 'N/A'  // Backend returns institution name as string
      }));
      setUsers(transformedUsers);
    } catch (error) {
      toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchInstitutions = async () => {
    try {
      const response = await apiClient.getInstitutions();
      if (!response.success) throw new Error(response.message || 'Failed to fetch');
      setInstitutions(response.data || []);
    } catch (error) {
      toast({title: "Error", description: "Could not load institutions for dropdown.", variant: "destructive"});
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  // Handle role change and automatically set institution
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    form.setValue('role', role);
    
    // Auto-set institution for CSC-only roles (internal + admin)
    if ((CSC_INTERNAL_ROLES.includes(role) || CSC_ONLY_ROLES.includes(role)) && cscInstitution) {
      form.setValue('institutionId', cscInstitution.id);
    }
  };

  // Get available institutions based on selected role
  const getAvailableInstitutions = () => {
    if (CSC_INTERNAL_ROLES.includes(selectedRole) || CSC_ONLY_ROLES.includes(selectedRole)) {
      // CSC internal roles and Admin can only be from CSC
      return institutions.filter(inst => inst.name === 'TUME YA UTUMISHI SERIKALINI');
    } else if (INSTITUTION_BASED_ROLES.includes(selectedRole)) {
      // Institution-based roles can be from any institution (including CSC)
      return institutions;
    }
    // Default: allow any institution
    return institutions;
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);

    // Validate role-institution compatibility
    const selectedInstitution = institutions.find(inst => inst.id === data.institutionId);
    if (selectedInstitution) {
      if ((CSC_INTERNAL_ROLES.includes(data.role) || CSC_ONLY_ROLES.includes(data.role)) && selectedInstitution.name !== 'TUME YA UTUMISHI SERIKALINI') {
        toast({
          title: "Invalid Assignment",
          description: `${data.role} role must be assigned to TUME YA UTUMISHI SERIKALINI (CSC) only.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Note: Institution-based roles can now be from any institution including CSC
      // No additional validation needed for INSTITUTION_BASED_ROLES
    }

    const payload = { ...data };
    if (editingUser && !payload.password) {
      delete payload.password; // Don't send empty password for updates
    }
    
    try {
        const response = editingUser 
            ? await apiClient.updateUser(editingUser.id, payload)
            : await apiClient.createUser(payload);

        if (!response.success) {
            throw new Error(response.message || 'An error occurred');
        }

        toast({
            title: `User ${editingUser ? 'Updated' : 'Created'}`,
            description: `The user has been ${editingUser ? 'updated' : 'added'} successfully.`,
        });
        await fetchUsers();
        closeDialog();
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openEditDialog = (user: UserWithInstitutionName) => {
    setEditingUser(user);
    setSelectedRole(user.role as string); // Set selected role for editing
    form.reset({ 
      name: user.name, 
      username: user.username,
      role: user.role as string,
      institutionId: user.institutionId,
      password: '', // Password field is for changing, not displaying
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setSelectedRole(''); // Reset selected role for new user
    form.reset({ name: "", username: "", role: undefined, institutionId: undefined, password: "" });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setSelectedRole(''); // Reset selected role when closing
  };
  
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
        const response = await apiClient.updateUser(userId, { active: !currentStatus });
        if (!response.success) throw new Error(response.message || 'Failed to update status');
        toast({ title: "User Status Changed", description: "The user's status has been updated." });
        await fetchUsers();
    } catch(error) {
        toast({ title: "Error", description: "Could not update user status.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
        const response = await apiClient.deleteUser(userId);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete user');
        }
        toast({ title: "User Deleted", description: "The user has been successfully deleted.", variant: "default" });
        await fetchUsers();
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.zanId && user.zanId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Create, update, and manage user accounts and access levels."
        actions={
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Button>
        }
      />
      <div className="flex justify-end mb-4">
        <Input
          placeholder="Search users by name, username, or ZanID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
          <CardDescription>A list of all users in the system.</CardDescription>
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
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.filter((user) =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.zanId && user.zanId.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.institution || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={user.active ? 'default' : 'secondary'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Switch
                        checked={user.active}
                        onCheckedChange={() => toggleUserStatus(user.id, user.active)}
                        aria-label="Toggle user status"
                      />
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(user)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user account for {user.name}.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={users.length}
            itemsPerPage={itemsPerPage}
          />
          </>
        )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Leave password blank to keep it unchanged." : "Create a new user account with appropriate role and institution."}
            </DialogDescription>
            {!editingUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <h4 className="font-medium text-blue-800 mb-2">Role Assignment Guidelines:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>CSC Internal Roles:</strong> HHRMD, HRMO, DO, PO, CSCS - Must be from CSC only</li>
                  <li><strong>Admin:</strong> Must be from CSC but can access all institutions</li>
                  <li><strong>Institution-based Roles:</strong> HRO, EMPLOYEE, HRRP - Can be from any institution (including CSC)</li>
                </ul>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    <strong>Access Levels:</strong> Institution-based users see only their institution's data. 
                    CSC users see data from all institutions within their role permissions.
                  </p>
                </div>
              </div>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Juma Ali" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="username" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="e.g., jali" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="password" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={editingUser ? "New password (optional)" : "Enter temporary password"} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="role" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.values(ROLES).map(role => (
                        <SelectItem key={role} value={role}>
                          {role}
                          {CSC_INTERNAL_ROLES.includes(role) && (
                            <span className="text-xs text-muted-foreground ml-2">(CSC Internal)</span>
                          )}
                          {CSC_ONLY_ROLES.includes(role) && (
                            <span className="text-xs text-muted-foreground ml-2">(CSC Only)</span>
                          )}
                          {INSTITUTION_BASED_ROLES.includes(role) && (
                            <span className="text-xs text-muted-foreground ml-2">(Institution-based)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedRole && CSC_INTERNAL_ROLES.includes(selectedRole) && (
                    <p className="text-sm text-blue-600 mt-1">
                      ℹ️ This role must be from TUME YA UTUMISHI SERIKALINI (CSC)
                    </p>
                  )}
                  {selectedRole && CSC_ONLY_ROLES.includes(selectedRole) && (
                    <p className="text-sm text-orange-600 mt-1">
                      ℹ️ This role must be from CSC but can access all institutions
                    </p>
                  )}
                  {selectedRole && INSTITUTION_BASED_ROLES.includes(selectedRole) && (
                    <p className="text-sm text-green-600 mt-1">
                      ℹ️ This role can be from any institution (including CSC) with institution-based access
                    </p>
                  )}
                </FormItem>
              )}/>
              <FormField name="institutionId" control={form.control} render={({ field }) => {
                const availableInstitutions = getAvailableInstitutions();
                return (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={CSC_INTERNAL_ROLES.includes(selectedRole) || CSC_ONLY_ROLES.includes(selectedRole)}
                    >
                      <FormControl><SelectTrigger>
                        <SelectValue placeholder={
                          !selectedRole ? "Select a role first" :
                          availableInstitutions.length > 0 ? "Select an institution" : "Loading institutions..."
                        } />
                      </SelectTrigger></FormControl>
                      <SelectContent>
                        {availableInstitutions.length > 0 ? availableInstitutions.map(inst => (
                          <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                        )) : selectedRole ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          <SelectItem value="no-role" disabled>Select a role first</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {(CSC_INTERNAL_ROLES.includes(selectedRole) || CSC_ONLY_ROLES.includes(selectedRole)) && (
                      <p className="text-sm text-blue-600 mt-1">
                        ℹ️ Institution automatically set to CSC for this role
                      </p>
                    )}
                  </FormItem>
                );
              }}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
