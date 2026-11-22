/**
 * ResortOS - Hotel Domain Service
 * Powered by TiDB Cloud MySQL database via ApiClient.
 * No mock data, no static arrays, no dummy fallbacks.
 */

import { apiClient } from './apiClient';
import {
  HotelSummary,
  Room,
  Booking,
  StaffMember,
  BillingFolio,
  ExpenseRecord,
  DashboardKPIs,
  DailySummaryData,
  AttendanceSummary,
  AdvanceBookingSummary,
  BillingSummary,
  DailyExpensesSummary,
  OperationalModule,
  RoomStatus,
  HousekeepingStatus,
  AttendanceStatus,
  ChargeCategory,
  BanquetEvent,
  DiningOrder,
  DiningOrderItem,
  HousekeepingTicket,
  GuestKYC,
  SpaTreatment,
  SpaBooking,
  ExcursionPackage,
  ConciergeBooking,
  ShiftHandover,
} from '../types/hotel';
import {
  formatCurrency,
  formatCurrencyDetailed,
} from '../utils/formatters';

export class HotelService {
  // ------------------------------------------------------------
  // DATE UTILITY
  // ------------------------------------------------------------
  public getTodayDateString(): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  // ------------------------------------------------------------
  // API INTEGRATIONS (READ & WRITE FROM DATABASE)
  // ------------------------------------------------------------
  public async fetchHotels(): Promise<HotelSummary[]> {
    return apiClient.getHotels();
  }

  public async fetchRooms(hotelId?: string): Promise<Room[]> {
    return apiClient.getRooms(hotelId);
  }

  public async fetchBookings(hotelId?: string): Promise<Booking[]> {
    return apiClient.getBookings(hotelId);
  }

  public async fetchStaff(hotelId?: string): Promise<StaffMember[]> {
    return apiClient.getStaff(hotelId);
  }

  public async fetchFolios(hotelId?: string): Promise<BillingFolio[]> {
    return apiClient.getFolios(hotelId);
  }

  public async fetchExpenses(hotelId?: string): Promise<ExpenseRecord[]> {
    return apiClient.getExpenses(hotelId);
  }

  public async fetchBanquets(hotelId?: string): Promise<BanquetEvent[]> {
    return apiClient.getBanquets(hotelId);
  }

  public async fetchDiningOrders(hotelId?: string): Promise<DiningOrder[]> {
    return apiClient.getDiningOrders(hotelId);
  }

  public async fetchHousekeepingTickets(hotelId?: string): Promise<HousekeepingTicket[]> {
    return apiClient.getHousekeepingTickets(hotelId);
  }

  public async fetchSpaTreatments(): Promise<SpaTreatment[]> {
    return apiClient.getSpaTreatments();
  }

  public async fetchSpaBookings(hotelId?: string): Promise<SpaBooking[]> {
    return apiClient.getSpaBookings(hotelId);
  }

  public async fetchExcursions(): Promise<ExcursionPackage[]> {
    return apiClient.getExcursions();
  }

  public async fetchConciergeBookings(hotelId?: string): Promise<ConciergeBooking[]> {
    return apiClient.getConciergeBookings(hotelId);
  }

  public async fetchShiftHandovers(hotelId?: string): Promise<ShiftHandover[]> {
    return apiClient.getShiftHandovers(hotelId);
  }

  // ------------------------------------------------------------
  // ROOM AVAILABILITY ENGINE (COMPUTED ON REAL DATABASE RECORDS)
  // ------------------------------------------------------------
  public isRoomAvailable(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    rooms: Room[],
    bookings: Booking[],
    excludeBookingId?: string
  ): boolean {
    const room = rooms.find((r) => r.id === roomId || r.roomNumber === roomId);
    if (!room) return false;
    if (room.status === 'maintenance') return false;

    const today = this.getTodayDateString();
    if (checkInDate <= today && (room.status === 'occupied' || room.status === 'cleaning')) {
      return false;
    }

    const conflicting = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.roomId !== room.id && b.roomNumber !== room.roomNumber) return false;
      return checkInDate < b.checkOutDate && checkOutDate > b.checkInDate;
    });

    return conflicting.length === 0;
  }

  public getAvailableRooms(
    hotelId: string,
    rooms: Room[],
    bookings: Booking[],
    checkInDate?: string,
    checkOutDate?: string,
    excludeBookingId?: string
  ): Room[] {
    const targetRooms = hotelId && hotelId !== 'all' ? rooms.filter((r) => r.hotelId === hotelId) : rooms;
    if (!checkInDate || !checkOutDate) {
      return targetRooms.filter((r) => r.status === 'available');
    }
    return targetRooms.filter((r) => this.isRoomAvailable(r.id, checkInDate, checkOutDate, targetRooms, bookings, excludeBookingId));
  }

  // ------------------------------------------------------------
  // DYNAMIC COMPUTED KPIS ENGINE (REAL SQL/RECORDS DATA ONLY)
  // ------------------------------------------------------------
  public calculateHotelKPIs(
    hotelId: string,
    rooms: Room[],
    bookings: Booking[]
  ): DashboardKPIs {
    const targetRooms = hotelId && hotelId !== 'all' ? rooms.filter((r) => r.hotelId === hotelId) : rooms;
    const targetBookings = hotelId && hotelId !== 'all' ? bookings.filter((b) => b.hotelId === hotelId) : bookings;

    const totalRooms = targetRooms.length;
    const occupiedRooms = targetRooms.filter((r) => r.status === 'occupied').length;
    const cleaningRooms = targetRooms.filter((r) => r.status === 'cleaning').length;
    const maintenanceRooms = targetRooms.filter((r) => r.status === 'maintenance').length;
    const availableRooms = Math.max(0, totalRooms - (occupiedRooms + cleaningRooms + maintenanceRooms));

    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const today = this.getTodayDateString();

    const todayCheckIns = targetBookings.filter(
      (b) => b.checkInDate === today && b.status !== 'cancelled'
    ).length;

    const todayCheckOuts = targetBookings.filter(
      (b) => b.checkOutDate === today && b.status !== 'cancelled'
    ).length;

    const todayBookings = targetBookings.filter(
      (b) => (b.createdAt === today || b.checkInDate === today) && b.status !== 'cancelled'
    ).length;

    return {
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      todayCheckIns,
      todayCheckOuts,
      todayBookings,
      occupancyPercentage,
    };
  }

  public calculateDailySummary(
    hotelId: string,
    rooms: Room[],
    folios: BillingFolio[],
    expenses: ExpenseRecord[]
  ): DailySummaryData {
    const targetRooms = hotelId && hotelId !== 'all' ? rooms.filter((r) => r.hotelId === hotelId) : rooms;
    const targetFolios = hotelId && hotelId !== 'all' ? folios.filter((f) => f.hotelId === hotelId) : folios;
    const targetExpenses = hotelId && hotelId !== 'all' ? expenses.filter((e) => e.hotelId === hotelId) : expenses;

    const occupiedRooms = targetRooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = targetRooms.length;

    const roomRevenue = targetRooms
      .filter((r) => r.status === 'occupied')
      .reduce((sum, r) => sum + r.ratePerNight, 0);

    const settledRevenue = targetFolios
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.totalAmount, 0);

    const grossRevenueRaw = roomRevenue + settledRevenue;
    const adrRaw = occupiedRooms > 0 ? grossRevenueRaw / occupiedRooms : 0;
    const revParRaw = totalRooms > 0 ? grossRevenueRaw / totalRooms : 0;
    const rawExpenses = targetExpenses.reduce((sum, e) => sum + e.amount, 0);
    const rawNetIncome = Math.max(0, grossRevenueRaw - rawExpenses);

    const occupancyRatePercent =
      totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) + '%' : '0.0%';

    return {
      grossRevenue: formatCurrency(grossRevenueRaw),
      revPar: formatCurrencyDetailed(revParRaw),
      adr: formatCurrencyDetailed(adrRaw),
      netOperatingIncome: formatCurrency(rawNetIncome),
      occupancyRate: occupancyRatePercent,
      rawGrossRevenue: grossRevenueRaw,
      rawNetIncome,
      rawExpenses,
    };
  }

  // ------------------------------------------------------------
  // SUMMARIES
  // ------------------------------------------------------------
  public getAttendanceSummary(staffList: StaffMember[]): AttendanceSummary {
    const totalStaff = staffList.length;
    const presentStaff = staffList.filter((s) => s.status === 'present' || s.status === 'late').length;
    const onLeaveStaff = staffList.filter((s) => s.status === 'on_leave').length;
    const absentStaff = staffList.filter((s) => s.status === 'absent').length;

    return {
      totalStaff,
      presentStaff,
      onLeaveStaff,
      absentStaff,
      shift: 'Active Morning & Afternoon Shift',
    };
  }

  public getBillingSummary(folios: BillingFolio[]): BillingSummary {
    const pendingInvoices = folios.filter((f) => f.status === 'open').length;

    const settledTotal = folios
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.paidAmount, 0);

    const outstandingTotal = folios
      .filter((f) => f.status === 'open')
      .reduce((sum, f) => sum + f.balanceDue, 0);

    return {
      pendingInvoices,
      todaySettlements: formatCurrency(settledTotal),
      outstandingBalance: formatCurrency(outstandingTotal),
    };
  }

  public getExpensesSummary(expenses: ExpenseRecord[]): DailyExpensesSummary {
    const todayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap: { [cat: string]: number } = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const categories = Object.keys(categoryMap).map((name) => ({
      name,
      amount: formatCurrency(categoryMap[name]),
    }));

    return {
      todayTotal: formatCurrency(todayTotal),
      categories,
    };
  }

  public getAdvanceBookingSummary(bookings: Booking[]): AdvanceBookingSummary {
    const upcoming = bookings.filter((b) => b.status === 'confirmed');
    const upcomingCount = upcoming.length;
    const confirmedRevenue = upcoming.reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      upcomingCount,
      confirmedRevenue: formatCurrency(confirmedRevenue),
      next7DaysArrivals: upcomingCount,
    };
  }

  // ------------------------------------------------------------
  // DYNAMIC OPERATIONAL MODULES
  // ------------------------------------------------------------
  public getOperationalModules(
    staffSummary: AttendanceSummary,
    advanceSummary: AdvanceBookingSummary,
    arrivalsCount: number,
    billingSummary: BillingSummary,
    expensesSummary: DailyExpensesSummary
  ): OperationalModule[] {
    return [
      {
        id: 'mod-attendance',
        title: 'Staff Daily Attendance',
        subtitle: `${staffSummary.presentStaff} of ${staffSummary.totalStaff} staff active on duty`,
        icon: 'users',
        badge: `${staffSummary.presentStaff}/${staffSummary.totalStaff} Active`,
        badgeColor: 'success',
      },
      {
        id: 'mod-advance-booking',
        title: 'Advance Booking',
        subtitle: `${advanceSummary.upcomingCount} reservations in advance pipeline`,
        icon: 'calendar',
        badge: `${advanceSummary.upcomingCount} Pending`,
        badgeColor: 'info',
      },
      {
        id: 'mod-checkin-rooms',
        title: 'Check-in / Check-out',
        subtitle: `${arrivalsCount} guest arrivals scheduled today`,
        icon: 'key',
        badge: `${arrivalsCount} Ready`,
        badgeColor: 'warning',
      },
      {
        id: 'mod-billing',
        title: 'Billing & Folios',
        subtitle: `${billingSummary.todaySettlements} settled, ${billingSummary.pendingInvoices} folios pending`,
        icon: 'receipt',
        badge: billingSummary.todaySettlements,
        badgeColor: 'info',
      },
      {
        id: 'mod-daily-expenses',
        title: 'Other Expenses',
        subtitle: `${expensesSummary.todayTotal} operational disbursements logged`,
        icon: 'dollar-sign',
        badge: expensesSummary.todayTotal,
        badgeColor: 'warning',
      },
      {
        id: 'mod-cloud-sync',
        title: 'TiDB Cloud Sync Manager',
        subtitle: 'MySQL distributed cloud tables audit',
        icon: 'refresh-cw',
        badge: 'AWS Tokyo',
        badgeColor: 'success',
      },
      {
        id: 'mod-daily-summary',
        title: 'Daily Summary Reports',
        subtitle: 'Executive revenue, collections, and net profit audit',
        icon: 'trending-up',
        badge: 'Admin Only',
        badgeColor: 'primary',
        adminOnly: true,
      },
    ];
  }
}

export const hotelService = new HotelService();
