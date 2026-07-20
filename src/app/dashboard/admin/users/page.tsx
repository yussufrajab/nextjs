'use client';
import React, { useState, useEffect } from 'react';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { ROLES } from '@/lib/constants';
import {
  Pencil,
  PlusCircle,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Upload,
  Download,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  SkipForward,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { User, Role } from '@/lib/types';
import type { Institution } from '../institutions/page';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/shared/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api-client';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import {
  validatePasswordComplexity,
  isCommonPassword,
} from '@/lib/password-utils';
import { RouteGuard } from '@/components/auth/route-guard';
import { UnlockAccountModal } from '@/components/admin/unlock-account-modal';
import { LockAccountModal } from '@/components/admin/lock-account-modal';
import { ResetPasswordModal } from '@/components/admin/reset-password-modal';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be exactly 10 digits.')
    .max(10, 'Phone number must be exactly 10 digits.')
    .regex(/^\d{10}$/, 'Phone number must contain only digits.'),
  role: z.string().min(1, 'Role is required'),
  institutionId: z.string().min(1, 'Institution is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .refine((pwd) => validatePasswordComplexity(pwd), {
      message:
        'Password must contain an uppercase letter, lowercase letter, number, and special character.',
    })
    .refine((pwd) => !isCommonPassword(pwd), {
      message:
        'This password is too common and easily guessable. Please choose a stronger password.',
    })
    .optional(),
});

const userEditSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' }),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .optional()
    .or(z.literal('')),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be exactly 10 digits.')
    .max(10, 'Phone number must be exactly 10 digits.')
    .regex(/^\d{10}$/, 'Phone number must contain only digits.'),
  role: z.string().min(1, 'Role is required'),
  institutionId: z.string().min(1, 'Institution is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .refine((pwd) => validatePasswordComplexity(pwd), {
      message:
        'Password must contain an uppercase letter, lowercase letter, number, and special character.',
    })
    .refine((pwd) => !isCommonPassword(pwd), {
      message:
        'This password is too common and easily guessable. Please choose a stronger password.',
    })
    .optional(),
});

type UserFormValues = z.infer<typeof userSchema>;
type UserEditFormValues = z.infer<typeof userEditSchema>;
type UserWithInstitutionName = User & {
  institution: string;
  isMockPhoneNumber?: boolean;
  isMockEmail?: boolean;
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithInstitutionName[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] =
    useState<UserWithInstitutionName | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Lockout management modals
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<UserWithInstitutionName | null>(null);

  // GAP-H9: one-time display of a server-auto-generated initial password. The
  // password is never retrievable again after this dialog closes, so the user
  // must copy it now.
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [createdUsername, setCreatedUsername] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  // Bulk upload state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<
    Array<{
      name: string;
      username: string;
      password: string;
      email: string;
      phoneNumber: string;
      institutionName: string;
      role: string;
    }>
  >([]);
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    created: number;
    skipped: number;
    failed: number;
    results: Array<{
      index: number;
      name: string;
      username: string;
      status: 'created' | 'skipped' | 'error';
      error?: string;
    }>;
  } | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkUploadStep, setBulkUploadStep] = useState<
    'upload' | 'preview' | 'results'
  >('upload');

  // Define role categories based on clarified requirements
  const CSC_INTERNAL_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS']; // Must be from CSC only
  const CSC_ONLY_ROLES = ['Admin']; // Must be from CSC but can see all institutions
  const INSTITUTION_BASED_ROLES = ['HRO', 'EMPLOYEE', 'HRRP']; // Can be from any institution (including CSC) but institution-based access

  // Find CSC institution
  const cscInstitution = institutions.find(
    (inst) => inst.name === 'TUME YA UTUMISHI SERIKALINI'
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsers();
      if (!response.success)
        throw new Error(response.message || 'Failed to fetch users');
      const data = response.data || [];
      // Transform the data to include institution name
      const transformedUsers = data.map((user: any) => ({
        ...user,
        institution: user.Institution || 'N/A', // Backend returns Institution (capital I) as string
      }));
      setUsers(transformedUsers);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not load users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await apiClient.getInstitutions();
      if (!response.success)
        throw new Error(response.message || 'Failed to fetch');
      setInstitutions(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not load institutions for dropdown.',
        variant: 'destructive',
      });
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
    if (
      (CSC_INTERNAL_ROLES.includes(role) || CSC_ONLY_ROLES.includes(role)) &&
      cscInstitution
    ) {
      form.setValue('institutionId', cscInstitution.id);
    }
  };

  // Get available institutions based on selected role
  const getAvailableInstitutions = () => {
    if (
      CSC_INTERNAL_ROLES.includes(selectedRole) ||
      CSC_ONLY_ROLES.includes(selectedRole)
    ) {
      // CSC internal roles and Admin can only be from CSC
      return institutions.filter(
        (inst) => inst.name === 'TUME YA UTUMISHI SERIKALINI'
      );
    } else if (INSTITUTION_BASED_ROLES.includes(selectedRole)) {
      // Institution-based roles can be from any institution (including CSC)
      return institutions;
    }
    // Default: allow any institution
    return institutions;
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);

    // For new users, email is required
    if (!editingUser && !data.email) {
      toast({
        title: 'Email Required',
        description: 'Email address is required for new user registration.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Validate role-institution compatibility
    const selectedInstitution = institutions.find(
      (inst) => inst.id === data.institutionId
    );
    if (selectedInstitution) {
      if (
        (CSC_INTERNAL_ROLES.includes(data.role) ||
          CSC_ONLY_ROLES.includes(data.role)) &&
        selectedInstitution.name !== 'TUME YA UTUMISHI SERIKALINI'
      ) {
        toast({
          title: 'Invalid Assignment',
          description: `${data.role} role must be assigned to TUME YA UTUMISHI SERIKALINI (CSC) only.`,
          variant: 'destructive',
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

      // GAP-H9: if the server auto-generated an initial password (admin did
      // not supply one), surface it ONCE in a copy-to-clipboard dialog. The
      // plaintext is never retrievable again, so it must be copied now and
      // communicated securely to the new user.
      if (!editingUser) {
        const generated = (response as any)?.data?.initialPassword as
          | string
          | undefined;
        if (generated) {
          setCreatedUsername((response as any)?.data?.username || data.username);
          setInitialPassword(generated);
          setHasCopied(false);
        }
      }
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

  const openEditDialog = (user: UserWithInstitutionName) => {
    setEditingUser(user);
    setSelectedRole(user.role as string);
    form.reset({
      name: user.name,
      username: user.username,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role as string,
      institutionId: user.institutionId,
      password: '',
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setSelectedRole(''); // Reset selected role for new user
    form.reset({
      name: '',
      username: '',
      email: '',
      phoneNumber: '',
      role: undefined,
      institutionId: undefined,
      password: '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setSelectedRole(''); // Reset selected role when closing
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await apiClient.updateUser(userId, {
        active: !currentStatus,
      });
      if (!response.success)
        throw new Error(response.message || 'Failed to update status');
      toast({
        title: 'User Status Changed',
        description: "The user's status has been updated.",
      });
      await fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not update user status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await apiClient.deleteUser(userId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete user');
      }
      toast({
        title: 'User Deleted',
        description: 'The user has been successfully deleted.',
        variant: 'default',
      });
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Lockout management handlers
  const handleOpenUnlockModal = (user: UserWithInstitutionName) => {
    setSelectedUser(user);
    setUnlockModalOpen(true);
  };

  const handleOpenLockModal = (user: UserWithInstitutionName) => {
    setSelectedUser(user);
    setLockModalOpen(true);
  };

  const handleOpenResetPasswordModal = (user: UserWithInstitutionName) => {
    setSelectedUser(user);
    setResetPasswordModalOpen(true);
  };

  const handleModalSuccess = async () => {
    await fetchUsers();
  };

  // ---- Bulk Upload Parser ----
  const parseMdFile = (file: File): Promise<typeof bulkPreview> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = parseMdTable(text);
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  };

  const parseMdTable = (
    text: string
  ): {
    name: string;
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    institutionName: string;
    role: string;
  }[] => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Find the header row (first row containing "Full Name" or "name")
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes('Full Name') ||
        lines[i].includes('| Name |') ||
        lines[i].includes('|name|')
      ) {
        headerIdx = i;
        break;
      }
      // Also match a generic table header: | Timestamp | Full Name | ...
      if (
        lines[i].startsWith('|') &&
        lines[i].toLowerCase().includes('name') &&
        lines[i].toLowerCase().includes('username')
      ) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      throw new Error(
        'Could not find table header. Expected columns: Timestamp, Full Name, Username, Password, Email, Phone, Institution, Role, Status'
      );
    }

    // Parse header to find column indices
    const headerCells = lines[headerIdx]
      .split('|')
      .map((c) => c.trim().toLowerCase());

    const colName = headerCells.findIndex(
      (c) => c === 'full name' || c === 'name'
    );
    const colUsername = headerCells.findIndex(
      (c) => c === 'username'
    );
    const colPassword = headerCells.findIndex(
      (c) => c === 'password'
    );
    const colEmail = headerCells.findIndex((c) => c === 'email');
    const colPhone = headerCells.findIndex(
      (c) => c === 'phone' || c === 'phone number'
    );
    const colInstitution = headerCells.findIndex(
      (c) => c === 'institution'
    );
    const colRole = headerCells.findIndex((c) => c === 'role');

    if (colName === -1 || colUsername === -1 || colPassword === -1) {
      throw new Error(
        'Table must have at least "Full Name", "Username", and "Password" columns.'
      );
    }

    // Skip header row and separator row (---|---|---)
    const dataStart = headerIdx + 1;
    const dataLines: string[] = [];
    for (let i = dataStart; i < lines.length; i++) {
      // Skip separator lines (contain only dashes and pipes)
      if (/^[\|\s\-:]+$/.test(lines[i])) continue;
      if (lines[i].startsWith('|')) {
        dataLines.push(lines[i]);
      }
    }

    return dataLines.map((line) => {
      const cells = line.split('|').map((c) => c.trim());
      return {
        name: cells[colName] || '',
        username: cells[colUsername] || '',
        password: cells[colPassword] || '',
        email: colEmail >= 0 ? (cells[colEmail] || '') : '',
        phoneNumber: colPhone >= 0 ? (cells[colPhone] || '') : '',
        institutionName: colInstitution >= 0 ? (cells[colInstitution] || '') : '',
        role: colRole >= 0 ? (cells[colRole] || '') : '',
      };
    }).filter((row) => row.name && row.username);
  };

  // Handle file selection
  const handleBulkFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);

    try {
      const parsed = await parseMdFile(file);
      setBulkPreview(parsed);
      setBulkUploadStep('preview');
    } catch (err: any) {
      toast({
        title: 'Parse Error',
        description: err.message || 'Could not parse the .md file.',
        variant: 'destructive',
      });
    }
  };

  // Submit bulk users
  const handleBulkSubmit = async () => {
    if (bulkPreview.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      const response = await apiClient.bulkCreateUsers(bulkPreview);
      if (!response.success) {
        throw new Error(response.message || 'Bulk creation failed');
      }
      setBulkResults(response.data!);
      setBulkUploadStep('results');
      await fetchUsers();
    } catch (err: any) {
      toast({
        title: 'Bulk Upload Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Download all users as .md file
  const handleDownloadMd = () => {
    const header =
      '| Full Name | Username | Password | Email | Phone | Institution | Role |';
    const separator =
      '|---|---|---|---|---|---|---|';
    const rows = users
      .filter((u) => u.name && u.username)
      .map((u) => {
        const passwordPlaceholder = 'ChangeMe@123';
        return `| ${u.name} | ${u.username} | ${passwordPlaceholder} | ${u.email || ''} | ${u.phoneNumber || ''} | ${u.institution || ''} | ${u.role || ''} |`;
      });
    const content = [header, separator, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Download Complete',
      description: `${users.length} users exported to users-export.md`,
    });
  };

  // Reset bulk upload
  const resetBulkUpload = () => {
    setBulkFile(null);
    setBulkPreview([]);
    setBulkResults(null);
    setBulkUploadStep('upload');
    setIsBulkUploadOpen(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.zanId &&
        user.zanId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.role &&
        user.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phoneNumber && user.phoneNumber.includes(searchQuery)) ||
      (user.institution &&
        user.institution.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <RouteGuard>
      <div>
        <PageHeader
          title="User Management"
          description="Create, update, and manage user accounts and access levels."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadMd}>
                <Download className="mr-2 h-4 w-4" /> Download .md
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetBulkUpload();
                  setIsBulkUploadOpen(true);
                }}
              >
                <Upload className="mr-2 h-4 w-4" /> Bulk Upload
              </Button>
              <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </div>
          }
        />
        <div className="flex justify-end mb-4">
          <Input
            placeholder="Search by name, username, email, ZanID, role, institution, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Users List</CardTitle>
            <CardDescription>
              A list of all users in the system.
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
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => {
                      // Determine if account is locked
                      const isLocked =
                        !user.active &&
                        (user.isManuallyLocked || user.loginLockedUntil);
                      const lockType = user.isManuallyLocked
                        ? 'Manual'
                        : user.loginLockoutType === 'security'
                          ? 'Security'
                          : 'Standard';

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            {user.email || 'N/A'}
                            {user.isMockEmail && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (mock)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{user.institution || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.active ? 'default' : 'secondary'}
                            >
                              {user.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isLocked ? (
                              <Badge variant="destructive" className="gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                Locked ({lockType})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Unlock className="h-3 w-3" />
                                Unlocked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Switch
                                checked={user.active}
                                onCheckedChange={() =>
                                  toggleUserStatus(user.id, user.active)
                                }
                                aria-label="Toggle user status"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleOpenResetPasswordModal(user)
                                }
                                title="Reset password"
                              >
                                <KeyRound className="h-4 w-4" />
                                <span className="sr-only">Reset Password</span>
                              </Button>
                              {isLocked ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenUnlockModal(user)}
                                  title="Unlock account"
                                >
                                  <Unlock className="h-4 w-4 text-green-600" />
                                  <span className="sr-only">
                                    Unlock Account
                                  </span>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenLockModal(user)}
                                  title="Lock account"
                                >
                                  <Lock className="h-4 w-4 text-orange-600" />
                                  <span className="sr-only">Lock Account</span>
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the user account for{' '}
                                      {user.name}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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
                  totalItems={filteredUsers.length}
                  itemsPerPage={itemsPerPage}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Leave password blank to keep it unchanged.'
                  : 'Create a new user account with appropriate role and institution.'}
              </DialogDescription>
              {!editingUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Role Assignment Guidelines:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      <strong>CSC Internal Roles:</strong> HHRMD, HRMO, DO, PO,
                      CSCS - Must be from CSC only
                    </li>
                    <li>
                      <strong>Admin:</strong> Must be from CSC but can access
                      all institutions
                    </li>
                    <li>
                      <strong>Institution-based Roles:</strong> HRO, EMPLOYEE,
                      HRRP - Can be from any institution (including CSC)
                    </li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-600">
                      <strong>Access Levels:</strong> Institution-based users
                      see only their institution's data. CSC users see data from
                      all institutions within their role permissions.
                    </p>
                  </div>
                </div>
              )}
            </DialogHeader>
            <Form {...form}>
              <div className="flex-1 overflow-y-auto pr-2">
                <form
                  id="user-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Juma Ali" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="username"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., jali" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email Address{' '}
                        {!editingUser && (
                          <span className="text-red-500">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="e.g., jali@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {!editingUser && (
                        <p className="text-sm text-muted-foreground">
                          Required for new user registration
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  name="phoneNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 0777123456"
                          maxLength={10}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {editingUser
                          ? 'Password (Optional)'
                          : 'Temporary Password'}
                        {!editingUser && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={
                            editingUser
                              ? 'New password (optional)'
                              : 'Enter temporary password'
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <PasswordStrengthMeter
                          password={field.value}
                          showRequirements
                        />
                      )}
                      {!editingUser && (
                        <p className="text-sm text-muted-foreground mt-1">
                          User must change this password on first login.
                          Password expires in 7 days.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  name="role"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={handleRoleChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(ROLES)
                            .filter((role) => role !== null)
                            .map((role) => (
                              <SelectItem key={role!} value={role!}>
                                {role}
                                {CSC_INTERNAL_ROLES.includes(role) && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (CSC Internal)
                                  </span>
                                )}
                                {CSC_ONLY_ROLES.includes(role) && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (CSC Only)
                                  </span>
                                )}
                                {INSTITUTION_BASED_ROLES.includes(role) && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Institution-based)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {selectedRole &&
                        CSC_INTERNAL_ROLES.includes(selectedRole) && (
                          <p className="text-sm text-blue-600 mt-1">
                            ℹ️ This role must be from TUME YA UTUMISHI
                            SERIKALINI (CSC)
                          </p>
                        )}
                      {selectedRole &&
                        CSC_ONLY_ROLES.includes(selectedRole) && (
                          <p className="text-sm text-orange-600 mt-1">
                            ℹ️ This role must be from CSC but can access all
                            institutions
                          </p>
                        )}
                      {selectedRole &&
                        INSTITUTION_BASED_ROLES.includes(selectedRole) && (
                          <p className="text-sm text-green-600 mt-1">
                            ℹ️ This role can be from any institution (including
                            CSC) with institution-based access
                          </p>
                        )}
                    </FormItem>
                  )}
                />
                <FormField
                  name="institutionId"
                  control={form.control}
                  render={({ field }) => {
                    const availableInstitutions = getAvailableInstitutions();
                    return (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={
                            CSC_INTERNAL_ROLES.includes(selectedRole) ||
                            CSC_ONLY_ROLES.includes(selectedRole)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !selectedRole
                                    ? 'Select a role first'
                                    : availableInstitutions.length > 0
                                      ? 'Select an institution'
                                      : 'Loading institutions...'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableInstitutions.length > 0 ? (
                              availableInstitutions.map((inst) => (
                                <SelectItem key={inst.id} value={inst.id}>
                                  {inst.name}
                                </SelectItem>
                              ))
                            ) : selectedRole ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              <SelectItem value="no-role" disabled>
                                Select a role first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {(CSC_INTERNAL_ROLES.includes(selectedRole) ||
                          CSC_ONLY_ROLES.includes(selectedRole)) && (
                          <p className="text-sm text-blue-600 mt-1">
                            ℹ️ Institution automatically set to CSC for this
                            role
                          </p>
                        )}
                      </FormItem>
                    );
                  }}
                />
                </form>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" form="user-form" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save User
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Lockout Management Modals */}
        {selectedUser && currentUser && (
          <>
            <UnlockAccountModal
              isOpen={unlockModalOpen}
              onClose={() => setUnlockModalOpen(false)}
              userId={selectedUser.id}
              username={selectedUser.username}
              adminId={currentUser.id}
              onSuccess={handleModalSuccess}
            />

            <LockAccountModal
              isOpen={lockModalOpen}
              onClose={() => setLockModalOpen(false)}
              userId={selectedUser.id}
              username={selectedUser.username}
              userRole={selectedUser.role as string}
              adminId={currentUser.id}
              onSuccess={handleModalSuccess}
            />

            <ResetPasswordModal
              isOpen={resetPasswordModalOpen}
              onClose={() => setResetPasswordModalOpen(false)}
              userId={selectedUser.id}
              username={selectedUser.username}
              adminId={currentUser.id}
              onSuccess={handleModalSuccess}
            />
          </>
        )}

        {/* GAP-H9: one-time display of a server-auto-generated initial password */}
        <Dialog
          open={initialPassword !== null}
          onOpenChange={(open) => {
            if (!open) {
              setInitialPassword(null);
              setHasCopied(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Initial Password Generated</DialogTitle>
              <DialogDescription>
                A strong random password was generated for{' '}
                <span className="font-medium">{createdUsername || 'the new user'}</span>.
                Copy it now — it cannot be retrieved again after this dialog
                closes. Communicate it securely to the user, who will be required
                to change it on first login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={initialPassword || ''}
                  className="font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(initialPassword || '');
                      setHasCopied(true);
                      toast({ title: 'Copied', description: 'Password copied to clipboard.' });
                    } catch {
                      toast({
                        title: 'Copy failed',
                        description: 'Select the field and copy manually.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  {hasCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Store this securely. The user must change it on first login.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setInitialPassword(null);
                  setHasCopied(false);
                }}
              >
                I&apos;ve copied it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Bulk Upload Users</DialogTitle>
              <DialogDescription>
                Upload a .md file containing user data in table format.
              </DialogDescription>
            </DialogHeader>

            {bulkUploadStep === 'upload' && (
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    Upload a .md file
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    The file must contain a markdown table with columns:{' '}
                    <strong>Full Name, Username, Password, Email, Phone,
                    Institution, Role</strong> (Timestamp and Status are
                    optional).
                  </p>
                  <div className="mt-4 flex justify-center">
                    <label
                      htmlFor="bulk-md-upload"
                      className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Upload className="inline-block mr-2 h-4 w-4" />
                      Choose File
                      <input
                        id="bulk-md-upload"
                        type="file"
                        accept=".md,.markdown"
                        className="sr-only"
                        onChange={handleBulkFileChange}
                      />
                    </label>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Required Format:</p>
                  <code className="text-xs block whitespace-pre">
{`| Full Name | Username | Password | Email | Phone | Institution | Role |
|---|---|---|---|---|---|---|
| Juma Ali | jali | Temp@123 | jali@smz.go.tz | 0777123456 | WIZARA YA AFYA | HRO |`}
                  </code>
                </div>
              </div>
            )}

            {bulkUploadStep === 'preview' && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between flex-shrink-0">
                  <p className="text-sm text-gray-600">
                    {bulkPreview.length} user(s) found in{' '}
                    <strong>{bulkFile?.name}</strong>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkUploadStep('upload');
                      setBulkFile(null);
                      setBulkPreview([]);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Change file
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.phoneNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.institutionName}>
                            {row.institutionName}
                          </TableCell>
                          <TableCell>{row.role}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {bulkUploadStep === 'results' && bulkResults && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {bulkResults.created}
                    </p>
                    <p className="text-xs text-green-600">Created</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <SkipForward className="mx-auto h-8 w-8 text-yellow-600" />
                    <p className="mt-1 text-2xl font-bold text-yellow-700">
                      {bulkResults.skipped}
                    </p>
                    <p className="text-xs text-yellow-600">Skipped</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {bulkResults.failed}
                    </p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                </div>
                {bulkResults.results.filter(
                  (r) => r.status !== 'created'
                ).length > 0 && (
                  <div className="flex-1 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkResults.results
                          .filter((r) => r.status !== 'created')
                          .map((r) => (
                            <TableRow key={r.index}>
                              <TableCell>{r.name}</TableCell>
                              <TableCell>{r.username}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    r.status === 'skipped'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  {r.status === 'skipped'
                                    ? 'Skipped'
                                    : 'Error'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {r.error}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              {bulkUploadStep === 'upload' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkUploadOpen(false)}
                >
                  Cancel
                </Button>
              )}
              {bulkUploadStep === 'preview' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBulkUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={isBulkSubmitting}
                  >
                    {isBulkSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create {bulkPreview.length} User(s)
                  </Button>
                </>
              )}
              {bulkUploadStep === 'results' && (
                <Button type="button" onClick={resetBulkUpload}>
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
