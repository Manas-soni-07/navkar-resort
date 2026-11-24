/**
 * ResortOS - Real Database API Client
 * Connects the mobile frontend directly to the TiDB Cloud Express API backend.
 * Zero mock data, zero dummy fallbacks.
 */

import {
  HotelSummary,
  Room,
  Booking,
  StaffMember,
  BillingFolio,
  ExpenseRecord,
  DashboardKPIs,
  DailySummaryData,
  BanquetEvent,
  DiningOrder,
  HousekeepingTicket,
  SpaTreatment,
  SpaBooking,
  ExcursionPackage,
  ConciergeBooking,
  ShiftHandover,
  StaffAdvance,
  ManagerUser,
  CurrentUser,
  FolioItem,
} from '../types/hotel';
import { apiConfig, NetworkConfig } from '../config/apiConfig';

export interface StoredDocument {
  id: string;
  docType: string;
  contentType: string;
  sizeBytes: number | null;
  originalName: string | null;
  createdAt: string;
  /** Private, short-lived (5 min) link to view/download the file. */
  viewUrl: string;
}

export class ApiClient {
  private baseUrl: string = apiConfig.getBaseUrl();
  private authToken: string | null = null;
  private currentUser: CurrentUser | null = null;
  private requestTimeoutMs: number = 25000;

  public setBaseUrl(url: string) {
    this.baseUrl = url;
    apiConfig.setBaseUrl(url);
  }

  public getBaseUrl(): string {
    return apiConfig.getBaseUrl();
  }

  public getNetworkConfig(): NetworkConfig {
    return apiConfig.getConfig();
  }

  public setAuth(token: string | null, user: CurrentUser | null) {
    this.authToken = token;
    this.currentUser = user;
  }

  /** Called when the server rejects the session (expired, revoked or deactivated account). */
  private unauthorizedHandler: (() => void) | null = null;

  public onUnauthorized(handler: (() => void) | null) {
    this.unauthorizedHandler = handler;
  }

  public getAuthHeaders(): Record<string, string> {
    return this.getHeaders();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    if (this.currentUser) {
      headers['x-user-role'] = this.currentUser.role;
      if (this.currentUser.hotelId) {
        headers['x-user-hotel-id'] = this.currentUser.hotelId;
      }
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {},
    retries: number = options.method && options.method !== 'GET' ? 0 : 2
  ): Promise<T> {
    const activeBaseUrl = this.getBaseUrl();
    const url = `${activeBaseUrl}${endpoint}`;
    const timeoutMs = options.timeoutMs ?? (endpoint.includes('/auth') ? 30000 : this.requestTimeoutMs);

    if (__DEV__) {
      console.log(`[API DEV LOG] 📡 Outgoing Request: ${options.method || 'GET'} ${endpoint}`);
      console.log(`[API DEV LOG]    Resolved Base URL: ${activeBaseUrl}`);
      console.log(`[API DEV LOG]    Target URL:        ${url}`);
    }

    // Fresh AbortController for each individual attempt
    const controller = new AbortController();
    let isTimeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      isTimeoutTriggered = true;
      try {
        controller.abort();
      } catch {}
    }, timeoutMs);

    // Strip incoming signal & custom options so retries never reuse an already-aborted signal
    const { signal: _callerSignal, timeoutMs: _customTimeout, ...fetchOptions } = options;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...this.getHeaders(),
          ...(fetchOptions.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      if (__DEV__) {
        console.log(`[API DEV LOG] 📥 Response Status: HTTP ${response.status} ${response.statusText} for ${endpoint}`);
      }

      if (!response.ok) {
        let backendErrorMsg = '';
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.error) {
            backendErrorMsg = errorJson.error;
          }
        } catch {}

        if (response.status === 401) {
          // A failed sign-in attempt is not an expired session.
          if (!endpoint.startsWith('/auth/login') && this.authToken) {
            this.unauthorizedHandler?.();
          }
          throw new Error(
            backendErrorMsg ||
              'Authentication failure: Invalid or expired session credentials. Please log in again.'
          );
        }

        if (response.status === 403) {
          throw new Error(
            backendErrorMsg ||
              'Authorization failure: You do not have permission to access records for this hotel.'
          );
        }

        if (response.status === 404) {
          throw new Error(
            backendErrorMsg || `Requested resource was not found on backend (${endpoint}).`
          );
        }

        if (response.status >= 500) {
          throw new Error(
            backendErrorMsg ||
              `Backend service error (${response.status}): The database server encountered an issue processing the request.`
          );
        }

        throw new Error(backendErrorMsg || `HTTP Error ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as Promise<T>;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (__DEV__) {
        console.error(`[API DEV LOG] ❌ Network/Request Error for ${endpoint}:`, {
          resolvedBaseUrl: activeBaseUrl,
          targetUrl: url,
          errorName: err?.name,
          errorMessage: err?.message,
          isTimeout: isTimeoutTriggered,
        });
      }

      const errMessage = (err?.message || '').toLowerCase();
      const errName = err?.name || '';
      const isAborted =
        isTimeoutTriggered ||
        controller.signal.aborted ||
        errName === 'AbortError' ||
        errMessage.includes('cancel') ||
        errMessage.includes('abort');

      // 1. Request Timeout
      if (isTimeoutTriggered) {
        if (retries > 0 && (!options.method || options.method === 'GET')) {
          await new Promise((res) => setTimeout(res, 800));
          return this.request<T>(endpoint, fetchOptions, retries - 1);
        }
        throw new Error(
          `Request timeout: Connection to backend at ${activeBaseUrl} timed out after ${
            timeoutMs / 1000
          }s. Please verify your phone and computer are on the same Wi-Fi network.`
        );
      }

      // 2. Client / Component cancellation
      if (isAborted) {
        if (retries > 0 && (!options.method || options.method === 'GET')) {
          await new Promise((res) => setTimeout(res, 800));
          return this.request<T>(endpoint, fetchOptions, retries - 1);
        }
        throw new Error(
          `Request was interrupted or cancelled while connecting to ${activeBaseUrl}. Please retry.`
        );
      }

      // 3. Network Connection Failures (Physical Android phone cannot reach IP)
      const isNetworkFailure =
        errMessage.includes('network request failed') ||
        errMessage.includes('failed to connect') ||
        errMessage.includes('connectexception') ||
        errMessage.includes('noroutetohostexception') ||
        errMessage.includes('host unreachable') ||
        errMessage.includes('no route to host') ||
        errMessage.includes('econnrefused') ||
        errMessage.includes('enotfound');

      if (isNetworkFailure) {
        if (retries > 0 && (!options.method || options.method === 'GET')) {
          await new Promise((res) => setTimeout(res, 800));
          return this.request<T>(endpoint, fetchOptions, retries - 1);
        }
        const netConfig = this.getNetworkConfig();
        throw new Error(
          `Network connection failed: Unable to reach backend server at ${activeBaseUrl} (Source: ${netConfig.source}).\n\nUnderlying Error: ${err?.message || 'Host unreachable'}\n\nPlease check your internet connection and try again.`
        );
      }

      throw err;
    }
  }

  // --- Auth ---
  public async login(email: string, password: string, role?: string): Promise<{ success: boolean; token: string; user: CurrentUser }> {
    if (__DEV__) {
      console.log(`[API DEV LOG] 🔐 Login attempt for user: "${email}" | Requested Role: "${role || 'N/A'}" (password redacted)`);
    }
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  }

  // --- Historical Guest Export (Excel) ---
  /**
   * The browser that downloads the file cannot send our Authorization header, so the server
   * issues a short-lived (5 min), single-hotel signed download link instead.
   */
  public async getGuestExportUrl(hotelId: string): Promise<string> {
    const res = await this.request<{ url: string }>(`/reports/guests/export-link?hotelId=${encodeURIComponent(hotelId)}`);
    return res.url;
  }

  public async getGuestExportSummary(hotelId: string): Promise<{
    success: boolean;
    hotelId: string;
    hotelName: string;
    totalRecords: number;
    exportedAt: string;
    records: any[];
  }> {
    return this.request(`/reports/guests/export?hotelId=${encodeURIComponent(hotelId)}&format=json`);
  }

  /** Validates the current token and returns the signed-in user as the server sees it. */
  public async me(): Promise<{ user: CurrentUser }> {
    return this.request('/auth/me');
  }

  // --- Documents (guest ID proofs, receipts) stored privately in Cloudflare R2 ---
  public async requestDocumentUpload(data: {
    entityType: 'booking' | 'expense';
    entityId: string;
    docType: string;
    contentType: string;
    sizeBytes?: number;
    fileName?: string;
  }): Promise<{ documentId: string; uploadUrl: string; contentType: string }> {
    return this.request('/documents/upload-url', { method: 'POST', body: JSON.stringify(data) });
  }

  public async completeDocumentUpload(documentId: string): Promise<{ success: boolean; sizeBytes: number }> {
    return this.request(`/documents/${encodeURIComponent(documentId)}/complete`, { method: 'POST', body: '{}' });
  }

  public async listDocuments(entityType: 'booking' | 'expense', entityId: string): Promise<StoredDocument[]> {
    return this.request(`/documents?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`);
  }

  public async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    return this.request(`/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE', body: '{}' });
  }

  // --- Hotels ---
  public async getHotels(): Promise<HotelSummary[]> {
    return this.request<HotelSummary[]>('/hotels');
  }

  public async createHotel(hotelData: Partial<HotelSummary>): Promise<{ success: boolean; id: string }> {
    return this.request('/hotels', {
      method: 'POST',
      body: JSON.stringify(hotelData),
    });
  }

  public async updateHotel(id: string, updates: Partial<HotelSummary>): Promise<{ success: boolean; id: string }> {
    return this.request(`/hotels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Managers ---
  public async getManagers(): Promise<ManagerUser[]> {
    return this.request<ManagerUser[]>('/managers');
  }

  public async createManager(data: { fullName: string; email: string; phone: string; hotelId: string; initialPassword?: string }): Promise<{ success: boolean; id: string }> {
    return this.request('/managers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateManager(id: string, data: { fullName: string; email: string; phone: string; hotelId: string }): Promise<{ success: boolean; id: string }> {
    return this.request(`/managers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async updateManagerStatus(id: string, status: string): Promise<{ success: boolean; id: string; status: string }> {
    return this.request(`/managers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public async resetManagerPassword(id: string, newPassword: string): Promise<{ success: boolean; id: string }> {
    return this.request(`/managers/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
  }

  // --- Rooms ---
  public async getRooms(hotelId?: string, status?: string): Promise<Room[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Room[]>(`/rooms${query}`);
  }

  public async createRoom(roomData: Partial<Room>): Promise<{ success: boolean; id: string }> {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  public async updateRoomStatus(roomId: string, status: string, housekeepingStatus?: string): Promise<{ success: boolean }> {
    return this.request(`/rooms/${roomId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, housekeepingStatus }),
    });
  }

  // --- Bookings ---
  public async getBookings(hotelId?: string, type?: string): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (type) params.append('type', type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Booking[]>(`/bookings${query}`);
  }

  public async createBooking(bookingData: any): Promise<{ success: boolean; id: string; bookingReference: string }> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  public async createWalkInBooking(walkInData: any): Promise<{ success: boolean; id: string; bookingReference: string }> {
    return this.request('/bookings/walk-in', {
      method: 'POST',
      body: JSON.stringify(walkInData),
    });
  }

  public async checkInGuest(bookingId: string, roomId: string, roomNumber?: string): Promise<{ success: boolean }> {
    return this.request(`/bookings/${bookingId}/checkin`, {
      method: 'PATCH',
      body: JSON.stringify({ roomId, roomNumber }),
    });
  }

  public async checkOutGuest(bookingId: string): Promise<{ success: boolean }> {
    return this.request(`/bookings/${bookingId}/checkout`, {
      method: 'PATCH',
    });
  }

  public async reassignRoom(bookingId: string, newRoomId: string, newRoomNumber: string, newCategory?: string): Promise<{ success: boolean }> {
    return this.request(`/bookings/${bookingId}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ newRoomId, newRoomNumber, newCategory }),
    });
  }

  public async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
    });
  }

  // --- Staff & Attendance ---
  public async getStaff(hotelId?: string): Promise<StaffMember[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<StaffMember[]>(`/staff${query}`);
  }

  public async createStaff(staffData: any): Promise<{ success: boolean; id: string }> {
    return this.request('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  }

  public async updateStaff(id: string, updates: any): Promise<{ success: boolean }> {
    return this.request(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async getAttendance(hotelId?: string, date?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/attendance${query}`);
  }

  public async recordAttendance(data: { staffId: string; hotelId: string; status: string; checkInTime?: string; date?: string }): Promise<{ success: boolean }> {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Salary Advances & Payroll ---
  public async getSalaryAdvances(hotelId?: string): Promise<StaffAdvance[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<StaffAdvance[]>(`/salary-advances${query}`);
  }

  public async createSalaryAdvance(data: any): Promise<{ success: boolean; id: string }> {
    return this.request('/salary-advances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async toggleSalaryAdvanceDeducted(id: string, isDeducted: boolean, deductedMonth?: string): Promise<{ success: boolean }> {
    return this.request(`/salary-advances/${id}/toggle-deducted`, {
      method: 'PATCH',
      body: JSON.stringify({ isDeducted, deductedMonth }),
    });
  }

  public async getSalaries(hotelId?: string, month?: number, year?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/salaries${query}`);
  }

  public async paySalary(data: { staffId: string; hotelId: string; netAmount: number; month?: number; year?: number }): Promise<{ success: boolean }> {
    return this.request('/salaries/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Expenses ---
  public async getExpenses(hotelId?: string, category?: string): Promise<ExpenseRecord[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (category) params.append('category', category);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ExpenseRecord[]>(`/expenses${query}`);
  }

  public async recordExpense(expenseData: any): Promise<{ success: boolean; id: string }> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  // --- Billing & Folios ---
  public async getFolios(hotelId?: string, status?: string): Promise<BillingFolio[]> {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<BillingFolio[]>(`/folios${query}`);
  }

  public async addFolioItem(folioId: string, item: { description: string; category: string; amount: number; date?: string }): Promise<any> {
    return this.request(`/folios/${folioId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  public async settleFolio(folioId: string, paymentMethod: string): Promise<any> {
    return this.request(`/folios/${folioId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  }

  // --- Banquets, Dining, Housekeeping, Spa, Concierge, Handover ---
  public async getBanquets(hotelId?: string): Promise<BanquetEvent[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<BanquetEvent[]>(`/banquets${query}`);
  }

  public async createBanquet(data: any): Promise<{ success: boolean; id: string }> {
    return this.request('/banquets', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getDiningOrders(hotelId?: string): Promise<DiningOrder[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<DiningOrder[]>(`/dining/orders${query}`);
  }

  public async createDiningOrder(data: any): Promise<{ success: boolean; id: string; orderNumber: string }> {
    return this.request('/dining/orders', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getHousekeepingTickets(hotelId?: string): Promise<HousekeepingTicket[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<HousekeepingTicket[]>(`/housekeeping/tickets${query}`);
  }

  public async createHousekeepingTicket(data: any): Promise<{ success: boolean; id: string }> {
    return this.request('/housekeeping/tickets', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getSpaTreatments(): Promise<SpaTreatment[]> {
    return this.request<SpaTreatment[]>('/spa/treatments');
  }

  public async getSpaBookings(hotelId?: string): Promise<SpaBooking[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<SpaBooking[]>(`/spa/bookings${query}`);
  }

  public async createSpaBooking(data: any): Promise<{ success: boolean; id: string; bookingRef: string }> {
    return this.request('/spa/bookings', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getExcursions(): Promise<ExcursionPackage[]> {
    return this.request<ExcursionPackage[]>('/concierge/excursions');
  }

  public async getConciergeBookings(hotelId?: string): Promise<ConciergeBooking[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<ConciergeBooking[]>(`/concierge/bookings${query}`);
  }

  public async createConciergeBooking(data: any): Promise<{ success: boolean; id: string; bookingRef: string }> {
    return this.request('/concierge/bookings', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getShiftHandovers(hotelId?: string): Promise<ShiftHandover[]> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<ShiftHandover[]>(`/shift-handovers${query}`);
  }

  public async createShiftHandover(data: any): Promise<{ success: boolean; id: string }> {
    return this.request('/shift-handovers', { method: 'POST', body: JSON.stringify(data) });
  }

  // --- Real-time Metrics ---
  public async getKPIs(hotelId?: string): Promise<DashboardKPIs> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<DashboardKPIs>(`/dashboard/kpis${query}`);
  }

  public async getDailySummary(hotelId?: string): Promise<DailySummaryData> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<DailySummaryData>(`/dashboard/daily-summary${query}`);
  }

  public async getSyncSummary(): Promise<any> {
    return this.request('/sync/summary');
  }
}

export const apiClient = new ApiClient();
