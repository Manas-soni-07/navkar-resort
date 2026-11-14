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

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    const errorMessage = json.error?.message || json.message || 'Request failed';
    throw new Error(errorMessage);
  }

  return json.data as T;
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<AuthSession> => {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    return request<DashboardStats>(`/hotels/${hotelId}/dashboard`, {
      method: 'GET',
    });
  },

  // Rooms
  getRooms: async (hotelId: string, status?: RoomStatus): Promise<Room[]> => {
    const query = status ? `?status=${status}` : '';
    return request<Room[]>(`/hotels/${hotelId}/rooms${query}`, {
      method: 'GET',
    });
  },

  updateRoomStatus: async (
    roomId: string,
    status: RoomStatus,
    remarks?: string
  ): Promise<Room> => {
    return request<Room>(`/rooms/${roomId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },
};

export default api;
