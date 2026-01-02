export type Role =
  | 'HRO'
  | 'HHRMD'
  | 'HRMO'
  | 'DO'
  | 'EMPLOYEE'
  | 'CSCS'
  | 'HRRP'
  | 'PO'
  | 'Admin'
  | null;

export interface User {
  id: string;
  username: string;
  name: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  role: Role;
  employeeId?: string | null;
  institutionId: string;
  institution?: { name: string } | string;
  zanId?: string; // Optional: for users who are also employees and have a ZanID
  active: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Password Policy Fields
  passwordHistory?: string[];
  isTemporaryPassword?: boolean;
  temporaryPasswordExpiry?: Date | string | null;
  mustChangePassword?: boolean;
  lastPasswordChange?: Date | string | null;
  failedPasswordChangeAttempts?: number;
  passwordChangeLockoutUntil?: Date | string | null;

  // Password Expiration Fields
  passwordExpiresAt?: Date | string | null;
  lastExpirationWarningLevel?: number;
  gracePeriodStartedAt?: Date | string | null;

  // Account Lockout Fields
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | string | null;
  loginLockoutReason?: string | null;
  loginLockoutType?: string | null;
  isManuallyLocked?: boolean;
  lockedBy?: string | null;
  lockedAt?: Date | string | null;
  lockoutNotes?: string | null;

  // Session Inactivity Fields
  lastActivity?: Date | string | null;
}

export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  location?: string | null;
  createdAt: Date | string;
  lastActivity: Date | string;
  expiresAt: Date | string;
  isSuspicious: boolean;
}

export interface EmployeeCertificate {
  id: string;
  type:
    | 'Certificate'
    | 'Diploma'
    | 'Advanced Diploma'
    | 'Bachelor Degree'
    | 'Master Degree'
    | 'PhD'
    | 'Other';
  name: string;
  url: string;
  employeeId: string;
}

export interface Employee {
  id: string;
  employeeEntityId?: string | null;
  name: string;
  gender: 'Male' | 'Female' | 'N/A';
  profileImageUrl?: string | null;
  dateOfBirth?: string | Date | null;
  placeOfBirth?: string | null;
  region?: string | null;
  countryOfBirth?: string | null;
  zanId: string;
  phoneNumber?: string | null;
  contactAddress?: string | null;
  zssfNumber?: string | null;
  payrollNumber?: string | null;

  cadre?: string | null;
  salaryScale?: string | null;
  ministry?: string | null;
  institutionId?: string;
  institution?: string | { name: string };
  department?: string | null;
  appointmentType?: string | null;
  contractType?: string | null;
  recentTitleDate?: string | Date | null;
  currentReportingOffice?: string | null;
  currentWorkplace?: string | null;
  employmentDate?: string | Date | null;
  confirmationDate?: string | Date | null;
  retirementDate?: string | Date | null;
  status?: string | null;

  ardhilHaliUrl?: string | null;
  confirmationLetterUrl?: string | null;
  jobContractUrl?: string | null;
  birthCertificateUrl?: string | null;
  certificates?: EmployeeCertificate[];
}

export type RequestType =
  | 'Employee Confirmation'
  | 'Leave Without Pay (LWOP)'
  | 'Promotion'
  | 'Complaints'
  | 'Change of Cadre'
  | 'Retirement'
  | 'Resignation (Employee)'
  | 'Service Extension'
  | 'Termination'
  | 'Dismissal';

export interface Request {
  id: string;
  type: RequestType;
  employeeId: string;
  submittedBy: string;
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved';
  details: Record<string, any>;
  documents?: File[];
  reviewHistory?: Array<{
    reviewerId: string;
    decision: 'Approved' | 'Rejected' | 'Resolved';
    reason?: string;
    date: string;
  }>;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
  roles: Role[];
  children?: NavItem[];
}

export interface ComplaintFormValues {
  complaintText: string;
  category?: string;
  evidence?: File[];
}

export interface RequestFormValues {
  employeeId: string;
  details: string;
  documents?: File[];
}
