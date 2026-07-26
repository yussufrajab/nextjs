/**
 * API Client for Spring Boot Backend
 * Handles all communication with the Spring Boot backend APIs
 */

import { clientLogger } from '@/lib/logger-client';
import { getDeviceInfoHeader } from './device-info';
import { requestReauth } from './reauth-client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  code?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    employeeId?: string;
    institutionId: string;
    institution?: {
      id: string;
      name: string;
    };
  };
}

export interface Employee {
  id: string;
  name: string;
  zanId: string;
  gender: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  region?: string;
  countryOfBirth?: string;
  phoneNumber?: string;
  contactAddress?: string;
  zssfNumber?: string;
  payrollNumber?: string;
  cadre?: string;
  salaryScale?: string;
  ministry?: string;
  department?: string;
  appointmentType?: string;
  contractType?: string;
  currentWorkplace?: string;
  employmentDate?: string;
  confirmationDate?: string;
  retirementDate?: string;
  status?: string;
  institutionId: string;
  institution?: {
    id: string;
    name: string;
  };
}

export interface Request {
  id: string;
  status: string;
  reviewStage: string;
  documents: string[];
  rejectionReason?: string;
  employeeId: string;
  submittedById: string;
  reviewedById?: string;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  submittedBy?: {
    id: string;
    name: string;
    username: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    username: string;
  };
}

export interface ConfirmationRequest extends Request {
  decisionDate?: string;
  commissionDecisionDate?: string;
}

export interface PromotionRequest extends Request {
  proposedCadre: string;
  promotionType: string;
  studiedOutsideCountry?: boolean;
  commissionDecisionReason?: string;
}

export interface LwopRequest extends Request {
  duration: string;
  reason: string;
}

export interface Complaint {
  id: string;
  complaintType: string;
  subject: string;
  details: string;
  complainantPhoneNumber: string;
  nextOfKinPhoneNumber: string;
  attachments: string[];
  status: string;
  reviewStage: string;
  officerComments?: string;
  internalNotes?: string;
  rejectionReason?: string;
  complainantId: string;
  assignedOfficerRole: string;
  reviewedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  employeeId?: string;
  institutionId: string;
  institution?: Institution;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Client-side: relative path so requests hit Next.js API routes and the
    // HttpOnly session cookie is sent automatically (credentials: 'include').
    // Server-side: direct backend URL.
    this.baseURL =
      typeof window !== 'undefined'
        ? '/api'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _reauthed = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
    const method = options.method?.toUpperCase() || 'GET';
    const requiresCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (requiresCSRF && typeof window !== 'undefined') {
      // Get CSRF token from cookie
      // Use indexOf + substring to preserve '=' characters in base64 value
      const csrfRow = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='));
      const csrfToken = csrfRow ? csrfRow.substring(csrfRow.indexOf('=') + 1) : undefined;

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      } else {
        clientLogger.warn(
          { method, endpoint },
          'CSRF token not found for state-changing request'
        );
      }
    }

    // Add device info for audit logging on state-changing requests
    if (requiresCSRF && typeof window !== 'undefined') {
      headers['x-device-info'] = getDeviceInfoHeader();
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for session auth
      });

      // 401 on a non-auth route means the session is gone/expired — UNLESS it's
      // a step-up re-auth requirement (requireReauth on a Tier-1 endpoint),
      // in which case the body carries errorCode REAUTH_REQUIRED + the scope
      // we need to re-auth for. Handle that first: perform step-up reauth and
      // retry once, keeping the session intact.
      if (
        response.status === 401 &&
        endpoint !== '/auth/login' &&
        endpoint !== '/auth/refresh'
      ) {
        let body401: { errorCode?: string; requiredScope?: string; error?: string } | null = null;
        try {
          body401 = await response.clone().json();
        } catch {
          body401 = null;
        }

        if (
          body401 &&
          body401.errorCode === 'REAUTH_REQUIRED' &&
          body401.requiredScope
        ) {
          if (!_reauthed) {
            const ok = await requestReauth(body401.requiredScope);
            if (ok) {
              // reauth cookie is now set by the browser — retry the original request once.
              return this.request<T>(endpoint, options, true);
            }
          }
          // Reauth not available / cancelled / already retried — surface the
          // requirement without clearing the (still-valid) session.
          return {
            success: false,
            message: body401.error || 'Re-authentication required',
            code: 'REAUTH_REQUIRED',
          };
        }

        // Genuine session expiry: no refresh token in the session-cookie
        // model — clear local auth state and let the caller / route guard
        // redirect to /login.
        clientLogger.info({ endpoint }, '401 Unauthorized, clearing auth');
        this.clearToken();
        if (typeof window !== 'undefined') {
          import('@/store/auth-store').then(({ useAuthStore }) => {
            useAuthStore.getState().logout();
          });
        }
        return { success: false, message: 'Authentication failed', code: 'UNAUTHENTICATED' };
      }

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          message:
            data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || [],
          code: data.code,
        };
      }

      // Check if the backend already wrapped the response in success/data format
      if (
        data &&
        typeof data === 'object' &&
        'success' in data &&
        'data' in data
      ) {
        return {
          success: data.success,
          data: data.data,
          message: data.message,
          code: data.code,
        };
      }

      return {
        success: true,
        data,
        code: data.code,
      };
    } catch (error) {
      clientLogger.error({ err: error }, 'API Request failed');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /** No-op storage kept for API compatibility. Auth is cookie-based. */
  setToken(_token: string) {
    this.token = null;
  }

  clearToken() {
    this.token = null;
  }

  // Authentication APIs
  async login(username: string, password: string): Promise<ApiResponse<any>> {
    clientLogger.info({ username, passwordLength: password?.length }, 'ApiClient.login called');
    const requestBody = { username, password };
    clientLogger.info('Making request to /auth/login');

    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    clientLogger.info({ success: result.success }, 'ApiClient.login result');
    return result;
  }

  async forceLogoutSession(
    sessionId: string,
    userId: string
  ): Promise<ApiResponse> {
    return this.request('/auth/sessions/force-logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userId }),
    });
  }

  async logout(userId?: string, logoutAll: boolean = false): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ userId, logoutAll }),
    });
    this.clearToken();
    return result;
  }

  async refreshToken(
    _refreshToken: string
  ): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    // Session-cookie auth has no refresh token. Kept for API compatibility
    // with existing callers (e.g. auth-store); always reports failure so the
    // caller falls through to logout.
    this.clearToken();
    return { success: false, message: 'Refresh not supported in cookie auth', code: 'UNAUTHENTICATED' };
  }

  // Employee APIs
  async getEmployees(params?: {
    userRole?: string;
    userInstitutionId?: string;
    q?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<Employee[]>> {
    const queryParams = new URLSearchParams();
    if (params?.userRole) queryParams.append('userRole', params.userRole);
    if (params?.userInstitutionId)
      queryParams.append('userInstitutionId', params.userInstitutionId);
    if (params?.q) queryParams.append('q', params.q);
    if (params?.page !== undefined)
      queryParams.append('page', params.page.toString());
    if (params?.size !== undefined)
      queryParams.append('size', params.size.toString());

    return this.request<Employee[]>(`/employees?${queryParams.toString()}`);
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return this.request<Employee>(`/employees/${id}`);
  }

  async createEmployee(
    employee: Partial<Employee>
  ): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(
    id: string,
    employee: Partial<Employee>
  ): Promise<ApiResponse<Employee>> {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Confirmation Request APIs
  async getConfirmationRequests(): Promise<ApiResponse<ConfirmationRequest[]>> {
    return this.request<ConfirmationRequest[]>('/confirmation-requests');
  }

  async getConfirmationRequest(
    id: string
  ): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>(`/confirmation-requests/${id}`);
  }

  async createConfirmationRequest(
    request: Partial<ConfirmationRequest>
  ): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>('/confirmation-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateConfirmationRequest(
    id: string,
    request: Partial<ConfirmationRequest>
  ): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>(`/confirmation-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // Promotion Request APIs
  async getPromotionRequests(): Promise<ApiResponse<PromotionRequest[]>> {
    return this.request<PromotionRequest[]>('/promotion-requests');
  }

  async getPromotionRequest(
    id: string
  ): Promise<ApiResponse<PromotionRequest>> {
    return this.request<PromotionRequest>(`/promotion-requests/${id}`);
  }

  async createPromotionRequest(
    request: Partial<PromotionRequest>
  ): Promise<ApiResponse<PromotionRequest>> {
    return this.request<PromotionRequest>('/promotion-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updatePromotionRequest(
    id: string,
    request: Partial<PromotionRequest>
  ): Promise<ApiResponse<PromotionRequest>> {
    return this.request<PromotionRequest>(`/promotion-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // LWOP Request APIs
  async getLwopRequests(): Promise<ApiResponse<LwopRequest[]>> {
    return this.request<LwopRequest[]>('/lwop-requests');
  }

  async getLwopRequest(id: string): Promise<ApiResponse<LwopRequest>> {
    return this.request<LwopRequest>(`/lwop-requests/${id}`);
  }

  async createLwopRequest(
    request: Partial<LwopRequest>
  ): Promise<ApiResponse<LwopRequest>> {
    return this.request<LwopRequest>('/lwop-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateLwopRequest(
    id: string,
    request: Partial<LwopRequest>
  ): Promise<ApiResponse<LwopRequest>> {
    return this.request<LwopRequest>(`/lwop-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // Complaint APIs
  async getComplaints(): Promise<ApiResponse<Complaint[]>> {
    return this.request<Complaint[]>('/complaints');
  }

  async getComplaint(id: string): Promise<ApiResponse<Complaint>> {
    return this.request<Complaint>(`/complaints/${id}`);
  }

  async createComplaint(
    complaint: Partial<Complaint>
  ): Promise<ApiResponse<Complaint>> {
    return this.request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint),
    });
  }

  async updateComplaint(
    id: string,
    complaint: Partial<Complaint>
  ): Promise<ApiResponse<Complaint>> {
    return this.request<Complaint>(`/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(complaint),
    });
  }

  // Institution APIs
  async getInstitutions(): Promise<ApiResponse<Institution[]>> {
    return this.request<Institution[]>('/institutions');
  }

  async getInstitution(id: string): Promise<ApiResponse<Institution>> {
    return this.request<Institution>(`/institutions/${id}`);
  }

  /**
   * Download a server-generated report export (Req 12.2). Unlike `request`,
   * this returns a Blob (the binary file) on success. On failure it returns
   * the parsed JSON error body so the caller can surface the message — e.g.
   * a 429 rate-limit or a 403 role-forbidden.
   */
  async exportReport(
    body: { reportType: string; format: 'pdf' | 'xlsx'; fromDate?: string; toDate?: string; institutionId?: string }
  ): Promise<{ success: boolean; blob?: Blob; fileName?: string; message?: string; code?: string; retryAfter?: number }> {
    const url = `${this.baseURL}/reports/export`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // CSRF token (POST) — same logic as `request`.
    if (typeof window !== 'undefined') {
      const csrfRow = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='));
      const csrfToken = csrfRow ? csrfRow.substring(csrfRow.indexOf('=') + 1) : undefined;
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      headers['x-device-info'] = getDeviceInfoHeader();
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.json();
        } catch {
          errBody = null;
        }
        if (response.status === 401) {
          this.clearToken();
        }
        return {
          success: false,
          message: errBody?.error || errBody?.message || `HTTP ${response.status}`,
          code: errBody?.errorCode,
          retryAfter: errBody?.retryAfter,
        };
      }

      // Parse the filename from Content-Disposition.
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match ? match[1] : `${body.reportType}_report.${body.format}`;
      const blob = await response.blob();
      return { success: true, blob, fileName };
    } catch (error) {
      clientLogger.error({ err: error }, 'Export request failed');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async createInstitution(
    institution: Partial<Institution>
  ): Promise<ApiResponse<Institution>> {
    return this.request<Institution>('/institutions', {
      method: 'POST',
      body: JSON.stringify(institution),
    });
  }

  async updateInstitution(
    id: string,
    institution: Partial<Institution>
  ): Promise<ApiResponse<Institution>> {
    return this.request<Institution>(`/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(institution),
    });
  }

  async deleteInstitution(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/institutions/${id}`, {
      method: 'DELETE',
    });
  }

  // User APIs
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async bulkCreateUsers(
    users: Array<{
      name: string;
      username: string;
      password: string;
      email: string;
      phoneNumber: string;
      institutionName: string;
      role: string;
    }>
  ): Promise<
    ApiResponse<{
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
    }>
  > {
    return this.request('/users/bulk', {
      method: 'POST',
      body: JSON.stringify(users),
    });
  }

  async updateUser(
    id: string,
    user: Partial<User>
  ): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard APIs
  async getDashboardSummary(): Promise<ApiResponse<any>> {
    return this.request<any>('/dashboard/metrics');
  }

  // Reports APIs
  async generateReport(type: string, params?: any): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key].toString());
        }
      });
    }
    queryParams.append('type', type);

    return this.request<any>(`/reports/generate?${queryParams.toString()}`);
  }

  // File Upload
  async uploadFile(
    file: File,
    endpoint: string = '/files/upload'
  ): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{ url: string }>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let the browser set it with boundary
      },
    });
  }

  // Notifications APIs
  async getNotifications(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/notifications?userId=${userId}`);
  }

  // Generic GET method for any endpoint
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async markNotificationsAsRead(
    notificationIds: string[]
  ): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
