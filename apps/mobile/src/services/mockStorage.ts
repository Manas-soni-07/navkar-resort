/**
 * ResortOS - Mock Storage Repository
 * In-memory reactive state holding all managed resort entities.
 */

import {
  HotelSummary,
  Room,
  Booking,
  StaffMember,
  BillingFolio,
  ExpenseRecord,
  BanquetEvent,
  DiningOrder,
  DiningOrderItem,
  HousekeepingTicket,
  SpaTreatment,
  SpaBooking,
  ExcursionPackage,
  ConciergeBooking,
  ShiftHandover,
} from '../types/hotel';
import {
  INITIAL_HOTELS,
  INITIAL_ROOMS,
  INITIAL_BOOKINGS,
  INITIAL_STAFF,
  INITIAL_FOLIOS,
  INITIAL_EXPENSES,
  INITIAL_BANQUETS,
  INITIAL_DINING_ORDERS,
  INITIAL_MENU_CATALOG,
  INITIAL_HOUSEKEEPING_TICKETS,
  INITIAL_SPA_TREATMENTS,
  INITIAL_SPA_BOOKINGS,
  INITIAL_EXCURSION_PACKAGES,
  INITIAL_CONCIERGE_BOOKINGS,
  INITIAL_SHIFT_HANDOVERS,
} from '../constants/mockDatabase';

class MockStorage {
  private hotels: HotelSummary[] = [];
  private rooms: Room[] = [];
  private bookings: Booking[] = [];
  private staff: StaffMember[] = [];
  private folios: BillingFolio[] = [];
  private expenses: ExpenseRecord[] = [];
  private banquets: BanquetEvent[] = [];
  private diningOrders: DiningOrder[] = [];
  private housekeepingTickets: HousekeepingTicket[] = [];
  private menuCatalog: DiningOrderItem[] = [];
  private spaTreatments: SpaTreatment[] = [];
  private spaBookings: SpaBooking[] = [];
  private excursions: ExcursionPackage[] = [];
  private conciergeBookings: ConciergeBooking[] = [];
  private shiftHandovers: ShiftHandover[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    // Deep clone to ensure mutation safety across tests and resets
    this.hotels = JSON.parse(JSON.stringify(INITIAL_HOTELS));
    this.rooms = JSON.parse(JSON.stringify(INITIAL_ROOMS));
    this.bookings = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
    this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
    this.folios = JSON.parse(JSON.stringify(INITIAL_FOLIOS));
    this.expenses = JSON.parse(JSON.stringify(INITIAL_EXPENSES));
    this.banquets = JSON.parse(JSON.stringify(INITIAL_BANQUETS));
    this.diningOrders = JSON.parse(JSON.stringify(INITIAL_DINING_ORDERS));
    this.housekeepingTickets = JSON.parse(JSON.stringify(INITIAL_HOUSEKEEPING_TICKETS));
    this.menuCatalog = JSON.parse(JSON.stringify(INITIAL_MENU_CATALOG));
    this.spaTreatments = JSON.parse(JSON.stringify(INITIAL_SPA_TREATMENTS));
    this.spaBookings = JSON.parse(JSON.stringify(INITIAL_SPA_BOOKINGS));
    this.excursions = JSON.parse(JSON.stringify(INITIAL_EXCURSION_PACKAGES));
    this.conciergeBookings = JSON.parse(JSON.stringify(INITIAL_CONCIERGE_BOOKINGS));
    this.shiftHandovers = JSON.parse(JSON.stringify(INITIAL_SHIFT_HANDOVERS));
  }

  // --- Hotels ---
  public getHotels(): HotelSummary[] {
    return [...this.hotels];
  }

  public getHotel(id: string): HotelSummary | undefined {
    return this.hotels.find((h) => h.id === id);
  }

  // --- Rooms ---
  public getRooms(hotelId?: string): Room[] {
    if (hotelId) {
      return this.rooms.filter((r) => r.hotelId === hotelId);
    }
    return [...this.rooms];
  }

  public getRoom(id: string): Room | undefined {
    return this.rooms.find((r) => r.id === id);
  }

  public updateRoom(id: string, updates: Partial<Room>): Room | undefined {
    const index = this.rooms.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.rooms[index] = { ...this.rooms[index], ...updates };
      return this.rooms[index];
    }
    return undefined;
  }

  // --- Bookings ---
  public getBookings(hotelId?: string): Booking[] {
    if (hotelId) {
      return this.bookings.filter((b) => b.hotelId === hotelId);
    }
    return [...this.bookings];
  }

  public getBooking(id: string): Booking | undefined {
    return this.bookings.find((b) => b.id === id);
  }

  public addBooking(booking: Booking): Booking {
    this.bookings.unshift(booking);
    return booking;
  }

  public updateBooking(id: string, updates: Partial<Booking>): Booking | undefined {
    const index = this.bookings.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.bookings[index] = { ...this.bookings[index], ...updates };
      return this.bookings[index];
    }
    return undefined;
  }

  // --- Staff ---
  public getStaff(hotelId?: string): StaffMember[] {
    if (hotelId) {
      return this.staff.filter((s) => s.hotelId === hotelId);
    }
    return [...this.staff];
  }

  public addStaff(staffMember: StaffMember): StaffMember {
    this.staff.unshift(staffMember);
    return staffMember;
  }

  public updateStaff(id: string, updates: Partial<StaffMember>): StaffMember | undefined {
    const index = this.staff.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.staff[index] = { ...this.staff[index], ...updates };
      return this.staff[index];
    }
    return undefined;
  }

  // --- Folios ---
  public getFolios(hotelId?: string): BillingFolio[] {
    if (hotelId) {
      return this.folios.filter((f) => f.hotelId === hotelId);
    }
    return [...this.folios];
  }

  public getFolio(id: string): BillingFolio | undefined {
    return this.folios.find((f) => f.id === id);
  }

  public addFolio(folio: BillingFolio): BillingFolio {
    this.folios.unshift(folio);
    return folio;
  }

  public updateFolio(id: string, updates: Partial<BillingFolio>): BillingFolio | undefined {
    const index = this.folios.findIndex((f) => f.id === id);
    if (index !== -1) {
      this.folios[index] = { ...this.folios[index], ...updates };
      return this.folios[index];
    }
    return undefined;
  }

  // --- Expenses ---
  public getExpenses(hotelId?: string): ExpenseRecord[] {
    if (hotelId) {
      return this.expenses.filter((e) => e.hotelId === hotelId);
    }
    return [...this.expenses];
  }

  public addExpense(expense: ExpenseRecord): ExpenseRecord {
    this.expenses.unshift(expense);
    return expense;
  }

  // --- Banquets & Events ---
  public getBanquets(hotelId?: string): BanquetEvent[] {
    if (hotelId) {
      return this.banquets.filter((e) => e.hotelId === hotelId);
    }
    return [...this.banquets];
  }

  public addBanquet(event: BanquetEvent): BanquetEvent {
    this.banquets.unshift(event);
    return event;
  }

  public updateBanquet(id: string, updates: Partial<BanquetEvent>): BanquetEvent | undefined {
    const index = this.banquets.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.banquets[index] = { ...this.banquets[index], ...updates };
      return this.banquets[index];
    }
    return undefined;
  }

  // --- In-Room Dining & KOT ---
  public getDiningOrders(hotelId?: string): DiningOrder[] {
    if (hotelId) {
      return this.diningOrders.filter((o) => o.hotelId === hotelId);
    }
    return [...this.diningOrders];
  }

  public addDiningOrder(order: DiningOrder): DiningOrder {
    this.diningOrders.unshift(order);
    return order;
  }

  public updateDiningOrder(id: string, updates: Partial<DiningOrder>): DiningOrder | undefined {
    const index = this.diningOrders.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.diningOrders[index] = { ...this.diningOrders[index], ...updates };
      return this.diningOrders[index];
    }
    return undefined;
  }

  public getMenuCatalog(): DiningOrderItem[] {
    return [...this.menuCatalog];
  }

  // --- Housekeeping & Maintenance Tickets ---
  public getHousekeepingTickets(hotelId?: string): HousekeepingTicket[] {
    if (hotelId) {
      return this.housekeepingTickets.filter((t) => t.hotelId === hotelId);
    }
    return [...this.housekeepingTickets];
  }

  public addHousekeepingTicket(ticket: HousekeepingTicket): HousekeepingTicket {
    this.housekeepingTickets.unshift(ticket);
    return ticket;
  }

  public updateHousekeepingTicket(id: string, updates: Partial<HousekeepingTicket>): HousekeepingTicket | undefined {
    const index = this.housekeepingTickets.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.housekeepingTickets[index] = { ...this.housekeepingTickets[index], ...updates };
      return this.housekeepingTickets[index];
    }
    return undefined;
  }

  // --- Phase 6: Ayurvedic Spa & Wellness Retreat ---
  public getSpaTreatments(): SpaTreatment[] {
    return [...this.spaTreatments];
  }

  public getSpaBookings(hotelId?: string): SpaBooking[] {
    if (hotelId) {
      return this.spaBookings.filter((b) => b.hotelId === hotelId);
    }
    return [...this.spaBookings];
  }

  public addSpaBooking(booking: SpaBooking): SpaBooking {
    this.spaBookings.unshift(booking);
    return booking;
  }

  public updateSpaBooking(id: string, updates: Partial<SpaBooking>): SpaBooking | undefined {
    const index = this.spaBookings.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.spaBookings[index] = { ...this.spaBookings[index], ...updates };
      return this.spaBookings[index];
    }
    return undefined;
  }

  // --- Phase 6: Royal Concierge & Excursions ---
  public getExcursions(): ExcursionPackage[] {
    return [...this.excursions];
  }

  public getConciergeBookings(hotelId?: string): ConciergeBooking[] {
    if (hotelId) {
      return this.conciergeBookings.filter((b) => b.hotelId === hotelId);
    }
    return [...this.conciergeBookings];
  }

  public addConciergeBooking(booking: ConciergeBooking): ConciergeBooking {
    this.conciergeBookings.unshift(booking);
    return booking;
  }

  public updateConciergeBooking(id: string, updates: Partial<ConciergeBooking>): ConciergeBooking | undefined {
    const index = this.conciergeBookings.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.conciergeBookings[index] = { ...this.conciergeBookings[index], ...updates };
      return this.conciergeBookings[index];
    }
    return undefined;
  }

  // --- Phase 6: Shift Handover & Audit Logs ---
  public getShiftHandovers(hotelId?: string): ShiftHandover[] {
    if (hotelId) {
      return this.shiftHandovers.filter((s) => s.hotelId === hotelId);
    }
    return [...this.shiftHandovers];
  }

  public addShiftHandover(handover: ShiftHandover): ShiftHandover {
    this.shiftHandovers.unshift(handover);
    return handover;
  }
}

// Global Singleton Instance
export const mockStorage = new MockStorage();
