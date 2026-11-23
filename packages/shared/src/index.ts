/**
 * @resortos/shared
 * Centralized TypeScript types and utility interfaces shared between
 * Mobile (Expo/React Native) and Backend (Next.js API).
 */

// ==========================================
// User Roles & Auth Definitions
// ==========================================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'STAFF';

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  STAFF: 'STAFF',
} as const;

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  hotelId?: string | null;
  hotelName?: string | null;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

// ==========================================
// Hotel & Property Models
// ==========================================
export interface Hotel {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  code: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  starRating?: number | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  contactPhone: string;
  contactEmail: string;
  receptionPhone?: string | null;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Room Models & State Machine
// ==========================================
export type RoomType =
  | 'STANDARD'
  | 'DELUXE'
  | 'EXECUTIVE_SUITE'
  | 'PRESIDENTIAL_SUITE'
  | 'VILLA'
  | 'PENTHOUSE';

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'DIRTY'
  | 'CLEANING'
  | 'INSPECTION'
  | 'MAINTENANCE'
  | 'BLOCKED';

export interface Room {
  id: string;
  hotelId: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  basePricePerNight: number;
  maxOccupancy: number;
  bedCount: number;
  hasBalcony: boolean;
  hasOceanView: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomStatusUpdatePayload {
  status: RoomStatus;
  remarks?: string;
}

// ==========================================
// Dashboard KPIs & Analytics
// ==========================================
export interface DashboardStats {
  hotelName: string;
  hotelCode: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  dirtyRooms: number;
  occupancyRate: number;
  dailyRevenue: number;
  activeStaffCount: number;
  expectedArrivals: number;
  expectedDepartures: number;
}

// ==========================================
// Standard API Communication Interfaces
// ==========================================
export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiErrorDetail;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}

// ==========================================
// Backend Health Check Status
// ==========================================
export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  provider: string;
  latencyMs?: number;
  /** On failure: error class and code only, e.g. "PrismaClientInitializationError:P1000". */
  errorCode?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  database?: DatabaseHealth;
  uptimeSeconds: number;
  timestamp: string;
}

// ==========================================
// Validation Helpers
// ==========================================
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidRole(role: string): role is UserRole {
  return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF'].includes(role);
}
