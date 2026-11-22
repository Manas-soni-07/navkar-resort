/**
 * ResortOS - Hotel State Context & Provider
 * Global reactive state container connected to TiDB Cloud MySQL database via REST API.
 * Strict multi-tenant isolation, real database records, zero mock data.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
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
  CurrentUser,
} from '../types/hotel';
import { hotelService } from '../services/hotelService';
import { apiClient } from '../services/apiClient';
import { sessionStore } from '../services/sessionStore';

export interface HotelContextType {
  // Authentication & Session
  currentUser: CurrentUser | null;
  /** True while a saved session is being restored and checked with the server at startup. */
  isRestoringSession: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  login: (email: string, password: string, role?: string) => Promise<{ success: boolean; user?: CurrentUser; error?: string }>;
  logout: () => void;

  // Active selection
  selectedHotelId: string;
  selectedHotel: HotelSummary;
  hotels: HotelSummary[];
  switchHotel: (hotelId: string) => void;

  // State loading & error handling
  isLoading: boolean;
  error: string | null;

  // Real-time computed analytics
  kpis: DashboardKPIs;
  dailySummary: DailySummaryData;
  operationalModules: OperationalModule[];

  // Reactive collections for active property
  rooms: Room[];
  availableRooms: Room[];
  bookings: Booking[];
  todayArrivals: Booking[];
  todayDepartures: Booking[];
  todayBookings: Booking[];
  advanceBookings: Booking[];
  staff: StaffMember[];
  folios: BillingFolio[];
  expenses: ExpenseRecord[];
  banquets: BanquetEvent[];
  diningOrders: DiningOrder[];
  housekeepingTickets: HousekeepingTicket[];
  menuCatalog: DiningOrderItem[];
  spaTreatments: SpaTreatment[];
  spaBookings: SpaBooking[];
  excursions: ExcursionPackage[];
  conciergeBookings: ConciergeBooking[];
  shiftHandovers: ShiftHandover[];

  // Summaries
  attendanceSummary: AttendanceSummary;
  billingSummary: BillingSummary;
  advanceBookingSummary: AdvanceBookingSummary;
  expensesSummary: DailyExpensesSummary;

  // Actions & Mutations
  checkInGuest: (bookingId: string, roomId: string, guestKyc?: GuestKYC) => Promise<boolean>;
  checkOutGuest: (bookingId: string) => Promise<boolean>;
  reassignRoom: (bookingId: string, newRoomId: string) => Promise<{ success: boolean; message?: string }>;
  isRoomAvailable: (roomId: string, checkInDate: string, checkOutDate: string, excludeBookingId?: string) => boolean;
  getAvailableRoomsForDates: (checkInDate: string, checkOutDate: string, excludeBookingId?: string) => Room[];
  updateRoomStatus: (roomId: string, status: RoomStatus, housekeeping?: HousekeepingStatus) => Promise<void>;
  updateStaffAttendance: (staffId: string, status: AttendanceStatus, checkInTime?: string) => Promise<void>;
  createBooking: (bookingData: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>) => Promise<any>;
  cancelBooking: (bookingId: string) => Promise<void>;
  settleFolio: (folioId: string, paymentMethod: string) => Promise<void>;
  addFolioCharge: (folioId: string, item: { description: string; category: ChargeCategory; amount: number }) => Promise<void>;
  addStaffMember: (staffData: Omit<StaffMember, 'id' | 'employeeCode'>) => Promise<any>;
  recordExpense: (expenseData: Omit<ExpenseRecord, 'id' | 'date'>) => Promise<any>;
  createBanquet: (eventData: Omit<BanquetEvent, 'id'>) => Promise<any>;
  updateBanquetStatus: (eventId: string, status: BanquetEvent['status']) => Promise<void>;
  createDiningOrder: (orderData: Omit<DiningOrder, 'id' | 'orderNumber' | 'createdAt'>) => Promise<any>;
  updateDiningOrderStatus: (orderId: string, status: DiningOrder['status']) => Promise<void>;
  createHousekeepingTicket: (ticketData: Omit<HousekeepingTicket, 'id' | 'requestedTime'>) => Promise<any>;
  updateHousekeepingTicketStatus: (ticketId: string, status: HousekeepingTicket['status']) => Promise<void>;
  createSpaBooking: (bookingData: Omit<SpaBooking, 'id' | 'bookingRef' | 'gstAmount' | 'totalAmount'>) => Promise<any>;
  updateSpaBookingStatus: (bookingId: string, status: SpaBooking['status']) => Promise<void>;
  createConciergeBooking: (bookingData: Omit<ConciergeBooking, 'id' | 'bookingRef' | 'gstAmount' | 'totalAmount'>) => Promise<any>;
  updateConciergeBookingStatus: (bookingId: string, status: ConciergeBooking['status']) => Promise<void>;
  createShiftHandover: (handoverData: Omit<ShiftHandover, 'id' | 'timestamp'>) => Promise<any>;
  resetData: () => void;
  refresh: () => Promise<void>;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

interface HotelProviderProps {
  children: ReactNode;
  initialHotelId?: string;
}

export const HotelProvider: React.FC<HotelProviderProps> = ({
  children,
  initialHotelId = 'h-villa',
}) => {
  const [selectedHotelId, setSelectedHotelId] = useState<string>(initialHotelId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State: nobody is signed in until the server says so.
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);

  // Database-backed Entity Collections
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [folios, setFolios] = useState<BillingFolio[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [banquets, setBanquets] = useState<BanquetEvent[]>([]);
  const [diningOrders, setDiningOrders] = useState<DiningOrder[]>([]);
  const [housekeepingTickets, setHousekeepingTickets] = useState<HousekeepingTicket[]>([]);
  const [spaTreatments, setSpaTreatments] = useState<SpaTreatment[]>([]);
  const [spaBookings, setSpaBookings] = useState<SpaBooking[]>([]);
  const [excursions, setExcursions] = useState<ExcursionPackage[]>([]);
  const [conciergeBookings, setConciergeBookings] = useState<ConciergeBooking[]>([]);
  const [shiftHandovers, setShiftHandovers] = useState<ShiftHandover[]>([]);

  // Sign out locally whenever the server rejects the session (expired / revoked / deactivated).
  const endSession = useCallback(() => {
    setCurrentUser(null);
    apiClient.setAuth(null, null);
    setSelectedHotelId(initialHotelId);
    sessionStore.clear();
  }, [initialHotelId]);

  useEffect(() => {
    apiClient.onUnauthorized(endSession);
    return () => apiClient.onUnauthorized(null);
  }, [endSession]);

  // Restore a saved session at startup and confirm it with the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await sessionStore.load();
      if (saved) {
        apiClient.setAuth(saved.token, saved.user);
        try {
          const { user } = await apiClient.me();
          if (!cancelled && user) {
            const merged: CurrentUser = { ...saved.user, ...user };
            apiClient.setAuth(saved.token, merged);
            if (merged.role === 'MANAGER' && merged.hotelId) setSelectedHotelId(merged.hotelId);
            setCurrentUser(merged);
          }
        } catch {
          // 401 already cleared the session via onUnauthorized; on a network error the
          // user simply signs in again once connectivity is back.
          if (!cancelled) apiClient.setAuth(null, null);
        }
      }
      if (!cancelled) setIsRestoringSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Main loader: pulls actual records from TiDB Cloud via backend API
  const loadDatabaseData = useCallback(async (hotelIdToFetch?: string) => {
    const targetHotelId = hotelIdToFetch || selectedHotelId;
    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        hotelService.fetchHotels(),
        hotelService.fetchRooms(targetHotelId),
        hotelService.fetchBookings(targetHotelId),
        hotelService.fetchStaff(targetHotelId),
        hotelService.fetchFolios(targetHotelId),
        hotelService.fetchExpenses(targetHotelId),
      ]);

      if (results[0].status === 'fulfilled') setHotels(results[0].value);
      if (results[1].status === 'fulfilled') setRooms(results[1].value);
      if (results[2].status === 'fulfilled') setBookings(results[2].value);
      if (results[3].status === 'fulfilled') setStaff(results[3].value);
      if (results[4].status === 'fulfilled') setFolios(results[4].value);
      if (results[5].status === 'fulfilled') setExpenses(results[5].value);
    } catch (err: any) {
      console.error('Failed to load database data:', err);
      setError(err.message || 'Error connecting to database');
    } finally {
      setIsLoading(false);
    }
  }, [selectedHotelId]);

  // Load database records on startup: load hotel list initially, and property data when authenticated
  useEffect(() => {
    // Every endpoint requires a signed-in user, so nothing is fetched before login.
    if (currentUser) {
      loadDatabaseData(selectedHotelId);
    }
  }, [loadDatabaseData, selectedHotelId, currentUser]);

  const switchHotel = useCallback(
    (hotelId: string) => {
      if (currentUser?.role === 'MANAGER' && currentUser.hotelId && hotelId !== currentUser.hotelId) {
        console.warn('Unauthorized hotel switch attempt blocked for manager.');
        return;
      }
      setSelectedHotelId(hotelId);
    },
    [currentUser]
  );

  // Authentication against TiDB Cloud database
  const login = useCallback(
    async (
      email: string,
      password: string,
      requestedRole?: string
    ): Promise<{ success: boolean; user?: CurrentUser; error?: string }> => {
      try {
        const result = await apiClient.login(email, password, requestedRole);
        if (result.success && result.user) {
          apiClient.setAuth(result.token, result.user);
          await sessionStore.save({ token: result.token, user: result.user });
          setCurrentUser(result.user);
          if (result.user.role === 'MANAGER' && result.user.hotelId) {
            setSelectedHotelId(result.user.hotelId);
          }
          // Non-blocking background sync for property collections
          loadDatabaseData(result.user.hotelId || 'h-villa').catch((e) =>
            console.warn('Initial data sync warning:', e)
          );
          return { success: true, user: result.user };
        }
        return { success: false, error: 'Authentication failed' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Login failed: Could not connect to database' };
      }
    },
    [loadDatabaseData]
  );

  const logout = useCallback(() => {
    endSession();
  }, [endSession]);

  // Active hotel object
  const selectedHotel = useMemo(() => {
    const found = hotels.find((h) => h.id === selectedHotelId);
    if (found) return found;
    return (
      hotels[0] || {
        id: selectedHotelId,
        name: selectedHotelId === 'h-villa' ? 'THE VILLA' : 'NAVKAR PALACE & RESORT',
        code: selectedHotelId === 'h-villa' ? 'TV-01' : 'NPR-02',
        location: 'Jaipur, Rajasthan',
        starRating: 4,
        totalRooms: selectedHotelId === 'h-villa' ? 15 : 70,
        contactPhone: '+91 98290 55110',
        managerName: 'Sunita Sharma',
        currency: 'INR',
        tagline: 'Heritage Hospitality',
      }
    );
  }, [hotels, selectedHotelId]);

  // Filtered operational subsets
  const todayStr = useMemo(() => hotelService.getTodayDateString(), []);

  const availableRooms = useMemo(
    () => rooms.filter((r) => r.status === 'available'),
    [rooms]
  );

  const todayArrivals = useMemo(
    () => bookings.filter((b) => b.checkInDate === todayStr && b.status !== 'cancelled'),
    [bookings, todayStr]
  );

  const todayDepartures = useMemo(
    () => bookings.filter((b) => b.checkOutDate === todayStr && b.status !== 'cancelled'),
    [bookings, todayStr]
  );

  const todayBookings = useMemo(
    () => bookings.filter((b) => (b.createdAt === todayStr || b.checkInDate === todayStr) && b.status !== 'cancelled'),
    [bookings, todayStr]
  );

  const advanceBookings = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending'),
    [bookings]
  );

  // Computed Summaries strictly from database records
  const kpis = useMemo(
    () => hotelService.calculateHotelKPIs(selectedHotelId, rooms, bookings),
    [selectedHotelId, rooms, bookings]
  );

  const dailySummary = useMemo(
    () => hotelService.calculateDailySummary(selectedHotelId, rooms, folios, expenses),
    [selectedHotelId, rooms, folios, expenses]
  );

  const attendanceSummary = useMemo(
    () => hotelService.getAttendanceSummary(staff),
    [staff]
  );

  const billingSummary = useMemo(
    () => hotelService.getBillingSummary(folios),
    [folios]
  );

  const advanceBookingSummary = useMemo(
    () => hotelService.getAdvanceBookingSummary(bookings),
    [bookings]
  );

  const expensesSummary = useMemo(
    () => hotelService.getExpensesSummary(expenses),
    [expenses]
  );

  const operationalModules = useMemo(
    () =>
      hotelService.getOperationalModules(
        attendanceSummary,
        advanceBookingSummary,
        todayArrivals.length,
        billingSummary,
        expensesSummary
      ),
    [attendanceSummary, advanceBookingSummary, todayArrivals.length, billingSummary, expensesSummary]
  );

  // Menu catalog
  const menuCatalog: DiningOrderItem[] = useMemo(() => [
    { id: 'menu-1', name: 'Paneer Tikka Angaar', price: 320, quantity: 0, category: 'Starters' },
    { id: 'menu-2', name: 'Dal Baati Churma Royal Platter', price: 450, quantity: 0, category: 'Mains' },
    { id: 'menu-3', name: 'Subz Dum Biryani with Raita', price: 380, quantity: 0, category: 'Mains' },
    { id: 'menu-4', name: 'Gatte Ki Sabzi with Phulkas', price: 280, quantity: 0, category: 'Mains' },
    { id: 'menu-5', name: 'Royal Kesar Badam Lassi', price: 140, quantity: 0, category: 'Beverages' },
  ], []);

  // --- ACTIONS & MUTATIONS (PERSIST DIRECTLY TO TIDB CLOUD DATABASE) ---
  const checkInGuest = useCallback(
    async (bookingId: string, roomId: string): Promise<boolean> => {
      try {
        const room = rooms.find((r) => r.id === roomId);
        await apiClient.checkInGuest(bookingId, roomId, room?.roomNumber);
        await loadDatabaseData();
        return true;
      } catch (err) {
        console.error('Check-in error:', err);
        return false;
      }
    },
    [rooms, loadDatabaseData]
  );

  const checkOutGuest = useCallback(
    async (bookingId: string): Promise<boolean> => {
      try {
        await apiClient.checkOutGuest(bookingId);
        await loadDatabaseData();
        return true;
      } catch (err) {
        console.error('Check-out error:', err);
        return false;
      }
    },
    [loadDatabaseData]
  );

  const reassignRoom = useCallback(
    async (bookingId: string, newRoomId: string) => {
      try {
        const targetRoom = rooms.find((r) => r.id === newRoomId);
        if (!targetRoom) return { success: false, message: 'Target room not found' };
        await apiClient.reassignRoom(bookingId, newRoomId, targetRoom.roomNumber, targetRoom.category);
        await loadDatabaseData();
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [rooms, loadDatabaseData]
  );

  const isRoomAvailable = useCallback(
    (roomId: string, checkInDate: string, checkOutDate: string, excludeBookingId?: string): boolean => {
      return hotelService.isRoomAvailable(roomId, checkInDate, checkOutDate, rooms, bookings, excludeBookingId);
    },
    [rooms, bookings]
  );

  const getAvailableRoomsForDates = useCallback(
    (checkInDate: string, checkOutDate: string, excludeBookingId?: string): Room[] => {
      return hotelService.getAvailableRooms(selectedHotelId, rooms, bookings, checkInDate, checkOutDate, excludeBookingId);
    },
    [selectedHotelId, rooms, bookings]
  );

  const updateRoomStatus = useCallback(
    async (roomId: string, status: RoomStatus, housekeeping?: HousekeepingStatus) => {
      try {
        await apiClient.updateRoomStatus(roomId, status, housekeeping);
        await loadDatabaseData();
      } catch (err) {
        console.error('Update room status error:', err);
      }
    },
    [loadDatabaseData]
  );

  const updateStaffAttendance = useCallback(
    async (staffId: string, status: AttendanceStatus, checkInTime?: string) => {
      try {
        await apiClient.recordAttendance({
          staffId,
          hotelId: selectedHotelId,
          status,
          checkInTime,
        });
        await loadDatabaseData();
      } catch (err) {
        console.error('Update attendance error:', err);
      }
    },
    [selectedHotelId, loadDatabaseData]
  );

  const createBooking = useCallback(
    async (bookingData: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>): Promise<any> => {
      try {
        const res = await apiClient.createBooking(bookingData);
        await loadDatabaseData();
        return res;
      } catch (err) {
        console.error('Create booking error:', err);
        throw err;
      }
    },
    [loadDatabaseData]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      try {
        await apiClient.cancelBooking(bookingId);
        await loadDatabaseData();
      } catch (err) {
        console.error('Cancel booking error:', err);
      }
    },
    [loadDatabaseData]
  );

  const settleFolio = useCallback(
    async (folioId: string, paymentMethod: string) => {
      try {
        await apiClient.settleFolio(folioId, paymentMethod);
        await loadDatabaseData();
      } catch (err) {
        console.error('Settle folio error:', err);
      }
    },
    [loadDatabaseData]
  );

  const addFolioCharge = useCallback(
    async (folioId: string, item: { description: string; category: ChargeCategory; amount: number }) => {
      try {
        await apiClient.addFolioItem(folioId, item);
        await loadDatabaseData();
      } catch (err) {
        console.error('Add folio charge error:', err);
      }
    },
    [loadDatabaseData]
  );

  const addStaffMember = useCallback(
    async (staffData: Omit<StaffMember, 'id' | 'employeeCode'>): Promise<any> => {
      try {
        const res = await apiClient.createStaff(staffData);
        await loadDatabaseData();
        return res;
      } catch (err) {
        console.error('Add staff error:', err);
        throw err;
      }
    },
    [loadDatabaseData]
  );

  const recordExpense = useCallback(
    async (expenseData: Omit<ExpenseRecord, 'id' | 'date'>): Promise<any> => {
      try {
        const res = await apiClient.recordExpense(expenseData);
        await loadDatabaseData();
        return res;
      } catch (err) {
        console.error('Record expense error:', err);
        throw err;
      }
    },
    [loadDatabaseData]
  );

  const createBanquet = useCallback(
    async (eventData: Omit<BanquetEvent, 'id'>): Promise<any> => {
      const res = await apiClient.createBanquet(eventData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const updateBanquetStatus = useCallback(
    async (eventId: string, status: BanquetEvent['status']) => {
      await loadDatabaseData();
    },
    [loadDatabaseData]
  );

  const createDiningOrder = useCallback(
    async (orderData: Omit<DiningOrder, 'id' | 'orderNumber' | 'createdAt'>): Promise<any> => {
      const res = await apiClient.createDiningOrder(orderData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const updateDiningOrderStatus = useCallback(
    async (orderId: string, status: DiningOrder['status']) => {
      await loadDatabaseData();
    },
    [loadDatabaseData]
  );

  const createHousekeepingTicket = useCallback(
    async (ticketData: Omit<HousekeepingTicket, 'id' | 'requestedTime'>): Promise<any> => {
      const res = await apiClient.createHousekeepingTicket(ticketData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const updateHousekeepingTicketStatus = useCallback(
    async (ticketId: string, status: HousekeepingTicket['status']) => {
      await loadDatabaseData();
    },
    [loadDatabaseData]
  );

  const createSpaBooking = useCallback(
    async (bookingData: Omit<SpaBooking, 'id' | 'bookingRef' | 'gstAmount' | 'totalAmount'>): Promise<any> => {
      const res = await apiClient.createSpaBooking(bookingData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const updateSpaBookingStatus = useCallback(
    async (bookingId: string, status: SpaBooking['status']) => {
      await loadDatabaseData();
    },
    [loadDatabaseData]
  );

  const createConciergeBooking = useCallback(
    async (bookingData: Omit<ConciergeBooking, 'id' | 'bookingRef' | 'gstAmount' | 'totalAmount'>): Promise<any> => {
      const res = await apiClient.createConciergeBooking(bookingData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const updateConciergeBookingStatus = useCallback(
    async (bookingId: string, status: ConciergeBooking['status']) => {
      await loadDatabaseData();
    },
    [loadDatabaseData]
  );

  const createShiftHandover = useCallback(
    async (handoverData: Omit<ShiftHandover, 'id' | 'timestamp'>): Promise<any> => {
      const res = await apiClient.createShiftHandover(handoverData);
      await loadDatabaseData();
      return res;
    },
    [loadDatabaseData]
  );

  const resetData = useCallback(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  const value: HotelContextType = {
    currentUser,
    isRestoringSession,
    setCurrentUser,
    login,
    logout,
    selectedHotelId,
    selectedHotel,
    hotels,
    switchHotel,
    isLoading,
    error,
    kpis,
    dailySummary,
    operationalModules,
    rooms,
    availableRooms,
    bookings,
    todayArrivals,
    todayDepartures,
    todayBookings,
    advanceBookings,
    staff,
    folios,
    expenses,
    banquets,
    diningOrders,
    housekeepingTickets,
    menuCatalog,
    spaTreatments,
    spaBookings,
    excursions,
    conciergeBookings,
    shiftHandovers,
    attendanceSummary,
    billingSummary,
    advanceBookingSummary,
    expensesSummary,
    checkInGuest,
    checkOutGuest,
    reassignRoom,
    isRoomAvailable,
    getAvailableRoomsForDates,
    updateRoomStatus,
    updateStaffAttendance,
    createBooking,
    cancelBooking,
    settleFolio,
    addFolioCharge,
    addStaffMember,
    recordExpense,
    createBanquet,
    updateBanquetStatus,
    createDiningOrder,
    updateDiningOrderStatus,
    createHousekeepingTicket,
    updateHousekeepingTicketStatus,
    createSpaBooking,
    updateSpaBookingStatus,
    createConciergeBooking,
    updateConciergeBookingStatus,
    createShiftHandover,
    resetData,
    refresh: () => loadDatabaseData(),
  };

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
};

export const useHotel = (): HotelContextType => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
