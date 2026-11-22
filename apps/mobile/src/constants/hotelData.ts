/**
 * ResortOS - Hotel Data Constants & Defaults (Indian App Edition)
 * Preserves legacy mock fixtures while exposing the primary initial datasets in INR (₹).
 */

import {
  INITIAL_HOTELS,
  INITIAL_ROOMS,
  INITIAL_BOOKINGS,
  INITIAL_STAFF,
  INITIAL_FOLIOS,
  INITIAL_EXPENSES,
} from './mockDatabase';
import {
  HotelSummary,
  DashboardKPIs,
  AttendanceSummary,
  AdvanceBookingSummary,
  BillingSummary,
  DailyExpensesSummary,
  DailySummaryData,
  OperationalModule,
} from '../types/hotel';

export {
  INITIAL_HOTELS,
  INITIAL_ROOMS,
  INITIAL_BOOKINGS,
  INITIAL_STAFF,
  INITIAL_FOLIOS,
  INITIAL_EXPENSES,
};

// Aliased exports for backwards compatibility
export const HOTELS: HotelSummary[] = INITIAL_HOTELS;

export const MOCK_KPIS: DashboardKPIs = {
  totalRooms: 120,
  availableRooms: 42,
  occupiedRooms: 78,
  cleaningRooms: 8,
  maintenanceRooms: 4,
  todayCheckIns: 18,
  todayCheckOuts: 14,
  todayBookings: 22,
  occupancyPercentage: 65,
};

export const MOCK_ATTENDANCE: AttendanceSummary = {
  totalStaff: 10,
  presentStaff: 8,
  onLeaveStaff: 1,
  absentStaff: 1,
  shift: 'Morning & Afternoon Shift',
};

export const MOCK_ADVANCE_BOOKING: AdvanceBookingSummary = {
  upcomingCount: 34,
  confirmedRevenue: '₹4,82,500',
  next7DaysArrivals: 22,
};

export const MOCK_BILLING: BillingSummary = {
  pendingInvoices: 9,
  todaySettlements: '₹2,90,280',
  outstandingBalance: '₹28,244',
};

export const MOCK_EXPENSES: DailyExpensesSummary = {
  todayTotal: '₹1,05,200',
  categories: [
    { name: 'F&B Provisions', amount: '₹48,500' },
    { name: 'Housekeeping Supplies', amount: '₹24,200' },
    { name: 'Utilities & Maintenance', amount: '₹32,500' },
  ],
};

export const MOCK_DAILY_SUMMARY: DailySummaryData = {
  grossRevenue: '₹5,75,400',
  revPar: '₹4,795.00',
  adr: '₹7,376.92',
  netOperatingIncome: '₹4,70,200',
  occupancyRate: '65.0%',
  rawGrossRevenue: 575400,
  rawNetIncome: 470200,
  rawExpenses: 105200,
};

export const OPERATIONAL_MODULES: OperationalModule[] = [
  {
    id: 'mod-attendance',
    title: 'Staff Attendance',
    subtitle: '8 of 10 staff active on duty',
    icon: 'users',
    badge: '8/10 Active',
    badgeColor: 'success',
  },
  {
    id: 'mod-advance-booking',
    title: 'Advance Booking',
    subtitle: '34 upcoming reservation requests',
    icon: 'calendar',
    badge: '34 Pending',
    badgeColor: 'info',
  },
  {
    id: 'mod-checkin-rooms',
    title: 'Check-in Rooms',
    subtitle: '18 arrivals scheduled for today',
    icon: 'key',
    badge: '18 Ready',
    badgeColor: 'warning',
  },
  {
    id: 'mod-billing',
    title: 'Billing & Folios',
    subtitle: '₹2.9 L settled today across 28 folios',
    icon: 'receipt',
    badge: '₹2.9 L',
    badgeColor: 'info',
  },
  {
    id: 'mod-daily-expenses',
    title: 'Daily Expenses',
    subtitle: '3 operational expense batches logged',
    icon: 'dollar-sign',
    badge: '₹1.05 L',
    badgeColor: 'warning',
  },
  {
    id: 'mod-daily-summary',
    title: 'Daily Summary',
    subtitle: 'Executive RevPAR, ADR, and P&L breakdown',
    icon: 'trending-up',
    badge: 'Admin Only',
    badgeColor: 'primary',
    adminOnly: true,
  },
];
