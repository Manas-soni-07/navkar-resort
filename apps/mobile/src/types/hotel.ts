/**
 * ResortOS - Domain Models & Data Types
 * Comprehensive data contracts for multi-resort hospitality management
 */

// ==========================================
// 1. HOTEL & PROPERTY TYPES
// ==========================================

export interface HotelSummary {
  id: string;
  name: string;
  code: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  starRating: number;
  totalRooms: number;
  contactPhone: string;
  contactEmail?: string;
  receptionPhone?: string;
  managerName: string;
  currency: string;
  tagline: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: 'active' | 'inactive';
}

// ==========================================
// 2. ROOM & INVENTORY TYPES
// ==========================================

export type RoomCategory =
  | 'Deluxe Room'
  | 'Super Deluxe Room'
  | 'Executive Suite'
  | 'Family Suite'
  | 'Standard Room'
  | 'Deluxe AC Room'
  | 'Standard Non-AC Room'
  | 'Palace Suite'
  | 'Royal Family Villa'
  | 'Heritage Palace Suite'
  | 'Royal Maharaja Villa'
  | 'Deluxe Lake View Suite'
  | 'Garden Haveli Room'
  | 'Executive Mountain Cottage'
  | 'Deluxe Ocean Suite'
  | 'Royal Penthouse'
  | 'Executive Villa'
  | 'Garden View Villa'
  | 'Classic King Suite'
  | string;

export type RoomStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'cleaning'
  | 'maintenance';

export type HousekeepingStatus =
  | 'clean'
  | 'dirty'
  | 'inspecting'
  | 'in_progress';

export interface Room {
  id: string;
  hotelId: string;
  roomNumber: string;
  floor: number;
  category: RoomCategory;
  ratePerNight: number;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  currentGuestName?: string;
  currentBookingId?: string;
  maxOccupancy: number;
  amenities: string[];
}

// ==========================================
// 3. BOOKING & RESERVATION TYPES
// ==========================================

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Booking {
  id: string;
  hotelId: string;
  bookingReference: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomCategory: RoomCategory;
  roomId?: string;
  roomNumber?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nightsCount: number;
  numberOfGuests: number;
  status: BookingStatus;
  totalAmount: number;
  depositPaid: number;
  paymentStatus: PaymentStatus;
  specialRequests?: string;
  guestKyc?: GuestKYC;
  createdAt: string;
  bookingType?: 'normal' | 'event';
  eventName?: string;
  requiredRooms?: number;
  allocatedRooms?: number;
  remainingRooms?: number;
  roomPrice?: number;
  advanceAmount?: number;
}

// ==========================================
// 4. STAFF & ATTENDANCE TYPES
// ==========================================

export type StaffDepartment =
  | 'Front Desk'
  | 'Housekeeping'
  | 'Food & Beverage'
  | 'Maintenance'
  | 'Security'
  | 'Management'
  | 'Reception';

export type StaffShift = 'Morning' | 'Afternoon' | 'Night' | 'Full Day';

export type AttendanceStatus = 'present' | 'absent' | 'on_leave' | 'late' | 'half_day';

export interface StaffMember {
  id: string;
  hotelId: string;
  employeeCode: string;
  fullName: string;
  role: string;
  department: StaffDepartment;
  shift: StaffShift;
  status: AttendanceStatus;
  employmentStatus?: 'ACTIVE' | 'INACTIVE';
  checkInTime?: string;
  phone: string;
  monthlySalary?: number;
  joinDate?: string;
}

export interface StaffAdvance {
  id: string;
  hotelId: string;
  staffId: string;
  staffName?: string;
  staffRole?: string;
  advanceDate: string;
  amount: number;
  reason: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | string;
  isDeducted: boolean;
  deductedMonth?: string;
  notes?: string;
  createdAt?: string;
}

export interface SalaryPayment {
  id: string;
  hotelId: string;
  staffId: string;
  staffName?: string;
  month: number;
  year: number;
  baseSalary: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  grossSalary: number;
  advanceDeductions: number;
  netSalary: number;
  paymentStatus: 'PAID' | 'PENDING';
  paidAt?: string;
}

export interface ManagerUser {
  id: string;
  hotelId: string;
  hotelName?: string;
  email: string;
  fullName: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER';
  hotelId: string | null;
  assignedHotel?: {
    id: string;
    name: string;
    code?: string;
    contactPhone?: string;
    address?: string;
  } | null;
}

export interface AttendanceSummary {
  totalStaff: number;
  presentStaff: number;
  onLeaveStaff: number;
  absentStaff: number;
  shift: string;
}

// ==========================================
// 5. BILLING & FOLIO TYPES
// ==========================================

export type FolioStatus = 'open' | 'settled' | 'overdue';

export type ChargeCategory =
  | 'room'
  | 'dining'
  | 'spa'
  | 'transport'
  | 'minibar'
  | 'service'
  | 'tax'
  | 'extra_bed'
  | 'food_beverage'
  | 'water'
  | 'laundry'
  | 'misc';

export interface FolioItem {
  id: string;
  description: string;
  category: ChargeCategory;
  amount: number;
  date: string;
}

export interface BillingFolio {
  id: string;
  hotelId: string;
  invoiceNumber: string;
  bookingId?: string;
  guestName: string;
  roomNumber: string;
  status: FolioStatus;
  items: FolioItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod?: string;
  createdAt: string;
  settledAt?: string;
}

export interface BillingSummary {
  pendingInvoices: number;
  todaySettlements: string;
  outstandingBalance: string;
}

// ==========================================
// 6. EXPENSES TYPES
// ==========================================

export type ExpenseCategory =
  | 'Electricity'
  | 'Water'
  | 'Maintenance'
  | 'Repair'
  | 'Supplies'
  | 'Misc'
  | 'F&B Provisions'
  | 'Housekeeping Supplies'
  | 'Utilities & Maintenance'
  | 'Staff Payroll'
  | 'Marketing'
  | 'Operations'
  | string;

export interface ExpenseRecord {
  id: string;
  hotelId: string;
  hotelName?: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendor: string;
  recordedBy: string;
  paymentMethod: string;
  description?: string;
}

export interface DailyExpensesSummary {
  todayTotal: string;
  categories: {
    name: string;
    amount: string;
  }[];
}

// ==========================================
// 7. EXECUTIVE & OPERATIONAL ANALYTICS
// ==========================================

export interface DashboardKPIs {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  todayBookings: number;
  occupancyPercentage: number;
}

export interface DailySummaryData {
  grossRevenue: string;
  revPar: string;
  adr: string;
  netOperatingIncome: string;
  occupancyRate: string;
  rawGrossRevenue: number;
  rawNetIncome: number;
  rawExpenses: number;
}

export interface AdvanceBookingSummary {
  upcomingCount: number;
  confirmedRevenue: string;
  next7DaysArrivals: number;
}

export interface OperationalModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gold' | 'neutral';
  adminOnly?: boolean;
}

// ==========================================
// 8. INDIAN HOSPITALITY OPERATIONS (PHASE 5)
// ==========================================

export type IdProofType = 'Aadhaar Card' | 'Passport' | 'Driving License' | 'Voter ID';

export interface GuestKYC {
  idType: IdProofType;
  idNumber: string;
  cityOfOrigin: string;
  verificationStatus: 'verified' | 'pending';
}

export type BanquetEventType =
  | 'Destination Wedding'
  | 'Sangeet & Reception'
  | 'Corporate Conclave'
  | 'Royal Anniversary Gala'
  | 'Sundowner Pool Party';

export interface BanquetEvent {
  id: string;
  hotelId: string;
  eventName: string;
  eventType: BanquetEventType;
  clientName: string;
  clientPhone: string;
  venueName: string;
  eventDate: string;
  guestCount: number;
  perPlateRate: number;
  cateringType: 'Pure Vegetarian Jain' | 'Royal Mewari Buffet' | 'Multi-Cuisine Grand Feast';
  totalAmount: number;
  depositPaid: number;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  decorPackage: string;
}

export interface DiningOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: 'Mains' | 'Starters' | 'Breads & Rice' | 'Beverages' | 'Royal Desserts';
}

export interface DiningOrder {
  id: string;
  hotelId: string;
  orderNumber: string;
  roomNumber: string;
  guestName: string;
  items: DiningOrderItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: 'received' | 'in_kitchen' | 'out_for_delivery' | 'delivered';
  dietaryNote?: string;
  createdAt: string;
}

export type TicketPriority = 'urgent' | 'high' | 'normal';

export type TicketType =
  | 'Turnover Cleaning'
  | 'Deep Sanitization'
  | 'Turndown & Aroma Service'
  | 'Extra Towels & Linens'
  | 'Ayurvedic Toiletries Restock'
  | 'AC & Chiller Maintenance';

export interface HousekeepingTicket {
  id: string;
  hotelId: string;
  roomNumber: string;
  ticketType: TicketType;
  priority: TicketPriority;
  assignedStaffName: string;
  status: 'pending' | 'in_progress' | 'completed';
  requestedTime: string;
  notes?: string;
}

// ==========================================
// 9. AYURVEDIC SPA, CONCIERGE & SHIFT AUDIT (PHASE 6)
// ==========================================

export interface SpaTreatment {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category: 'Ayurvedic Therapy' | 'Royal Body Polish' | 'Facial & Glow' | 'Yoga & Meditation';
  description: string;
  herbalIngredients: string;
}

export interface SpaBooking {
  id: string;
  hotelId: string;
  bookingRef: string;
  roomNumber: string;
  guestName: string;
  treatmentName: string;
  therapistName: string;
  treatmentRoom: string;
  timeSlot: string;
  date: string;
  price: number;
  gstAmount: number;
  totalAmount: number;
  status: 'scheduled' | 'in_session' | 'completed' | 'cancelled';
  healthNotes?: string;
}

export interface ExcursionPackage {
  id: string;
  title: string;
  duration: string;
  pricePerPerson: number;
  category: 'Airport Transfer' | 'Heritage Excursion' | 'Nature & Safari' | 'Private Yacht Charter';
  description: string;
  includedHighlights: string[];
}

export interface ConciergeBooking {
  id: string;
  hotelId: string;
  bookingRef: string;
  roomNumber: string;
  guestName: string;
  serviceTitle: string;
  category: 'Airport Transfer' | 'Heritage Excursion' | 'Nature & Safari' | 'Private Yacht Charter';
  driverOrGuideName: string;
  vehicleOrVesselNumber: string;
  pickupTime: string;
  date: string;
  numberOfGuests: number;
  totalAmount: number;
  gstAmount: number;
  status: 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
}

export interface ShiftHandover {
  id: string;
  hotelId: string;
  outgoingManagerName: string;
  incomingManagerName: string;
  shiftFrom: 'Morning' | 'Afternoon' | 'Night';
  shiftTo: 'Morning' | 'Afternoon' | 'Night';
  timestamp: string;
  frontDeskCashCollected: number;
  upiSettlementsCount: number;
  upiSettlementsAmount: number;
  pendingGuestRequestsCount: number;
  vipGuestsInHouse: string[];
  keyHandoversNotes: string;
  status: 'completed' | 'pending_acknowledgment';
}
