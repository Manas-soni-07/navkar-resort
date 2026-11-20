import * as SecureStore from 'expo-secure-store';
import type {
  ApiResponse,
  AuthSession,
  UserProfile,
  Hotel,
  Room,
  RoomStatus,
  DashboardStats,
} from '@resortos/shared';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'resortos_auth_token';
const REQUEST_TIMEOUT_MS = 15000;

/** Error carrying the HTTP status (0 = network failure / no response). */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store secure token', error);
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove secure token', error);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      `Cannot reach the ResortOS server at ${API_BASE_URL}. Check your connection and EXPO_PUBLIC_API_URL.`,
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeout);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON body (proxy error page, server crash, wrong URL)
  }

  if (!response.ok || !json?.success) {
    const message =
      json?.error?.message || json?.message || `Request failed (HTTP ${response.status})`;
    throw new ApiError(message, response.status, json?.error?.code);
  }

  return json.data as T;
}

export type LoginPortal = 'ADMIN' | 'MANAGER';

export const api = {
  // Auth
  login: async (email: string, password: string, role?: LoginPortal): Promise<AuthSession> => {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  },

  getMe: async (): Promise<UserProfile> => {
    return request<UserProfile>('/auth/me', {
      method: 'GET',
    });
  },

  // Hotels
  getPrimaryHotel: async (): Promise<Hotel> => {
    return request<Hotel>('/hotels/primary', {
      method: 'GET',
    });
  },

  getHotelDashboard: async (hotelId: string): Promise<DashboardStats> => {
    return request<DashboardStats>(`/hotels/${encodeURIComponent(hotelId)}/dashboard`, {
      method: 'GET',
    });
  },

  // Rooms
  getRooms: async (hotelId: string, status?: RoomStatus): Promise<Room[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<Room[]>(`/hotels/${encodeURIComponent(hotelId)}/rooms${query}`, {
      method: 'GET',
    });
  },

  updateRoomStatus: async (
    roomId: string,
    status: RoomStatus,
    remarks?: string
  ): Promise<Room> => {
    return request<Room>(`/rooms/${encodeURIComponent(roomId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },
};

export default api;
