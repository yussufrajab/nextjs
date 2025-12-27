/**
 * API Client for Spring Boot Backend
 * Handles all communication with the Spring Boot backend APIs
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
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
    // Use relative URLs for Next.js proxy, or frontend URL for client-side requests
    // This allows Next.js to proxy requests to the backend automatically
    this.baseURL = typeof window !== 'undefined' 
      ? '/api'  // Client-side: use relative path for Next.js proxy
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'; // Server-side: direct backend URL
    
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
      
      // Authentication is now handled properly via login endpoint
      // No need for development tokens or automatic user setting
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add JWT token if available - always get fresh token from localStorage
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : this.token;
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for session auth
      });

      // Handle 401 Unauthorized with automatic token refresh
      if (response.status === 401 && retryCount === 0 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        console.log('401 Unauthorized, attempting token refresh for endpoint:', endpoint);
        
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (refreshToken) {
          try {
            console.log('Attempting to refresh token...');
            const refreshResponse = await this.refreshToken(refreshToken);
            
            if (refreshResponse.success && refreshResponse.data) {
              console.log('Token refresh successful');
              const newAccessToken = refreshResponse.data.token;
              const newRefreshToken = refreshResponse.data.refreshToken;
              
              // Update tokens
              this.setToken(newAccessToken);
              if (typeof window !== 'undefined') {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              
              // Update auth store with new token
              if (typeof window !== 'undefined') {
                import('@/store/auth-store').then(({ useAuthStore }) => {
                  useAuthStore.getState().updateTokenFromApiClient(newAccessToken);
                });
              }
              
              // Retry the original request with new token
              console.log('Retrying original request with new token');
              return this.request<T>(endpoint, options, retryCount + 1);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
        
        // If refresh failed or no refresh token, clear auth and redirect
        console.log('Token refresh failed, clearing authentication');
        this.clearToken();
        if (typeof window !== 'undefined') {
          // Import auth store dynamically to logout user
          import('@/store/auth-store').then(({ useAuthStore }) => {
            useAuthStore.getState().logout();
          });
        }
        return { success: false, message: 'Authentication failed' };
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
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || [],
        };
      }

      // Check if the backend already wrapped the response in success/data format
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return {
          success: data.success,
          data: data.data,
          message: data.message
        };
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearToken() {
    // Clear any persisted auth state
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private setDevelopmentUser() {
    // Set the development user in auth store
    if (typeof window !== 'undefined') {
      // Import auth store dynamically to avoid circular dependencies
      import('@/store/auth-store').then(({ useAuthStore }) => {
        const user = {
          id: 'admin-backend-id', // ID for admin user
          name: 'System Administrator',
          username: 'admin',
          password: '',
          role: 'Admin' as any, // This matches ROLES.ADMIN from constants
          active: true,
          employeeId: null,
          institutionId: 'cmd059ion0000e6d85kexfukl', // Real institution ID
          institution: { 
            id: 'cmd059ion0000e6d85kexfukl', 
            name: 'TUME YA UTUMISHI SERIKALINI' 
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        useAuthStore.getState().setUserManually(user);
        console.log('Development user set in auth store:', user.name);
      });
    }
  }

  // Authentication APIs
  async login(username: string, password: string): Promise<ApiResponse<any>> {
    console.log('ApiClient.login called with:', { username, passwordLength: password?.length });
    const requestBody = { username, password };
    console.log('ApiClient.login request body:', requestBody);
    console.log('Making request to:', `${this.baseURL}/auth/login`);
    
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('ApiClient.login result:', result);
    return result;
  }

  async logout(userId?: string, sessionToken?: string | null): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ userId, sessionToken }),
    });
    this.clearToken();
    return result;
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    // Backend expects plain string, not JSON object
    return this.request<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: refreshToken, // Send as plain string
    });
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
    if (params?.userInstitutionId) queryParams.append('userInstitutionId', params.userInstitutionId);
    if (params?.q) queryParams.append('q', params.q);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    return this.request<Employee[]>(`/employees?${queryParams.toString()}`);
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return this.request<Employee>(`/employees/${id}`);
  }

  async createEmployee(employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
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

  async getConfirmationRequest(id: string): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>(`/confirmation-requests/${id}`);
  }

  async createConfirmationRequest(request: Partial<ConfirmationRequest>): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>('/confirmation-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateConfirmationRequest(id: string, request: Partial<ConfirmationRequest>): Promise<ApiResponse<ConfirmationRequest>> {
    return this.request<ConfirmationRequest>(`/confirmation-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // Promotion Request APIs
  async getPromotionRequests(): Promise<ApiResponse<PromotionRequest[]>> {
    return this.request<PromotionRequest[]>('/promotion-requests');
  }

  async getPromotionRequest(id: string): Promise<ApiResponse<PromotionRequest>> {
    return this.request<PromotionRequest>(`/promotion-requests/${id}`);
  }

  async createPromotionRequest(request: Partial<PromotionRequest>): Promise<ApiResponse<PromotionRequest>> {
    return this.request<PromotionRequest>('/promotion-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updatePromotionRequest(id: string, request: Partial<PromotionRequest>): Promise<ApiResponse<PromotionRequest>> {
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

  async createLwopRequest(request: Partial<LwopRequest>): Promise<ApiResponse<LwopRequest>> {
    return this.request<LwopRequest>('/lwop-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateLwopRequest(id: string, request: Partial<LwopRequest>): Promise<ApiResponse<LwopRequest>> {
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

  async createComplaint(complaint: Partial<Complaint>): Promise<ApiResponse<Complaint>> {
    return this.request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint),
    });
  }

  async updateComplaint(id: string, complaint: Partial<Complaint>): Promise<ApiResponse<Complaint>> {
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

  async createInstitution(institution: Partial<Institution>): Promise<ApiResponse<Institution>> {
    return this.request<Institution>('/institutions', {
      method: 'POST',
      body: JSON.stringify(institution),
    });
  }

  async updateInstitution(id: string, institution: Partial<Institution>): Promise<ApiResponse<Institution>> {
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

  async updateUser(id: string, user: Partial<User>): Promise<ApiResponse<User>> {
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
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key].toString());
        }
      });
    }
    queryParams.append('type', type);

    return this.request<any>(`/reports/generate?${queryParams.toString()}`);
  }

  // File Upload
  async uploadFile(file: File, endpoint: string = '/files/upload'): Promise<ApiResponse<{ url: string }>> {
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

  async markNotificationsAsRead(notificationIds: string[]): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse, LoginResponse, Employee, Request, Complaint, Institution, User };