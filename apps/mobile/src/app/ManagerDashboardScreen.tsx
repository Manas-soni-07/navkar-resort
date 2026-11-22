/**
 * ResortOS - Property Manager Console
 * Single-hotel operational console with strict property isolation.
 * Displays 6 Core Operational Metrics, Interactive Dashboard Calendar, and 7 Management Modules.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Icon, IconName } from '../components/common/Icon';
import { KPICard } from '../components/dashboard/KPICard';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { formatCurrency } from '../utils/formatters';

export const ManagerDashboardScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const {
    selectedHotelId,
    selectedHotel,
    rooms,
    bookings,
    folios,
    currentUser,
    logout,
  } = useHotel();

  // Enforce single-hotel data isolation
  const hotelId = currentUser?.hotelId || selectedHotelId || 'h-villa';
  const assignedHotelName =
    currentUser?.assignedHotel?.name || selectedHotel?.name || (hotelId === 'h-villa' ? 'THE VILLA' : 'NAVKAR PALACE & RESORT');
  const assignedHotelCode =
    currentUser?.assignedHotel?.code || selectedHotel?.code || (hotelId === 'h-villa' ? 'TV-01' : 'NPR-02');

  const [activeBottomTab, setActiveBottomTab] = useState<'checkins' | 'checkouts' | 'recent'>('checkins');

  // Indian standard date
  const todayStr = useMemo(() => {
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
  }, []);

  // Filter isolated data strictly for assigned hotel
  const hotelRooms = useMemo(() => rooms.filter((r) => r.hotelId === hotelId), [rooms, hotelId]);
  const hotelBookings = useMemo(() => bookings.filter((b) => b.hotelId === hotelId), [bookings, hotelId]);
  const hotelFolios = useMemo(() => folios.filter((f) => f.hotelId === hotelId), [folios, hotelId]);

  // Compute 6 core operational metrics for this assigned hotel only
  const kpis = useMemo(() => {
    // 70 for Navkar Palace, 15 for The Villa
    const totalRooms = hotelRooms.length;
    const occupiedRooms = hotelRooms.filter((r) => r.status === 'occupied').length;
    const cleaningRooms = hotelRooms.filter((r) => r.status === 'cleaning').length;
    const maintenanceRooms = hotelRooms.filter((r) => r.status === 'maintenance').length;
    const availableRooms = Math.max(0, totalRooms - (occupiedRooms + cleaningRooms + maintenanceRooms));

    // Today's Check-ins: Actual check-in events scheduled/performed for today's date
    const todayCheckIns = hotelBookings.filter(
      (b) => b.checkInDate === todayStr && b.status !== 'cancelled'
    ).length;

    // Today's Check-outs: Actual check-out events scheduled/performed for today's date
    const todayCheckOuts = hotelBookings.filter(
      (b) => b.checkOutDate === todayStr && b.status !== 'cancelled'
    ).length;

    // Today's Bookings: Bookings created or arriving today
    const todayBookings = hotelBookings.filter(
      (b) => (b.createdAt === todayStr || b.checkInDate === todayStr) && b.status !== 'cancelled'
    ).length;

    // Collections & Pending for this hotel only
    const todayCollections = hotelFolios
      .filter((f) => f.status === 'settled' || (f.paidAmount && f.paidAmount > 0))
      .reduce((acc, f) => acc + (f.paidAmount || 0), 0);
    const pendingPayments = hotelFolios
      .filter((f) => f.status === 'open' && f.balanceDue > 0)
      .reduce((acc, f) => acc + (f.balanceDue || 0), 0);

    return {
      totalRooms,
      availableRooms,
      occupiedRooms,
      todayCheckIns,
      todayCheckOuts,
      todayBookings,
      todayCollections,
      pendingPayments,
    };
  }, [hotelRooms, hotelBookings, hotelFolios, todayStr]);

  // Filtered operational lists for bottom section
  const todayCheckInList = useMemo(() => {
    return hotelBookings.filter(
      (b) => b.checkInDate === todayStr && b.status !== 'cancelled'
    );
  }, [hotelBookings, todayStr]);

  const todayCheckOutList = useMemo(() => {
    return hotelBookings.filter(
      (b) => b.checkOutDate === todayStr && b.status !== 'cancelled'
    );
  }, [hotelBookings, todayStr]);

  const recentBookingsList = useMemo(() => {
    return [...hotelBookings]
      .filter((b) => b.status !== 'cancelled')
      .slice(0, 5);
  }, [hotelBookings]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Log out of property manager console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: () => {
          logout();
          navigate('login');
        },
      },
    ]);
  };

  // 8 Core Manager Operations Modules
  const managerModules: { id: string; title: string; subtitle: string; icon: IconName; screen: any; color: string }[] = [
    {
      id: 'mod-rooms',
      title: '1. Room Management',
      subtitle: 'Live room status: Available, Cleaning, Maintenance, Occupied',
      icon: 'grid',
      screen: 'rooms',
      color: '#0284C7',
    },
    {
      id: 'mod-advance-booking',
      title: '2. Advance Booking',
      subtitle: 'Room reservations & advance booking pipeline',
      icon: 'calendar',
      screen: 'advance-booking',
      color: '#7C3AED',
    },
    {
      id: 'mod-checkin-checkout',
      title: '3. Check-In & Check-Out',
      subtitle: 'Fast walk-in arrivals & checkout folio settlement',
      icon: 'log-in',
      screen: 'checkin-rooms',
      color: '#059669',
    },
    {
      id: 'mod-billing',
      title: '4. Billing & Cash Desk',
      subtitle: 'Record guest payments (Cash, UPI, Card) & invoices',
      icon: 'credit-card',
      screen: 'billing',
      color: '#16A34A',
    },
    {
      id: 'mod-attendance',
      title: '5. Staff Attendance',
      subtitle: 'Mark daily roster: Present, Half Day, Absent',
      icon: 'user-check',
      screen: 'attendance',
      color: '#2563EB',
    },
    {
      id: 'mod-salary-advances',
      title: '6. Salary Advances',
      subtitle: 'Staff advance loan requests & approvals',
      icon: 'dollar-sign',
      screen: 'salary-advances',
      color: '#0D9488',
    },
    {
      id: 'mod-expenses',
      title: '7. Daily Expenses',
      subtitle: 'Record daily property expenses (Supplies, repairs, bills)',
      icon: 'trending-down',
      screen: 'daily-expenses',
      color: '#DC2626',
    },
    {
      id: 'mod-reports',
      title: '8. Daily Summary Report',
      subtitle: 'Daily hotel occupancy, collections & room audit',
      icon: 'bar-chart-2',
      screen: 'daily-summary',
      color: '#3B82F6',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Manager Console"
        subtitle={assignedHotelName}
        hotelBadge={assignedHotelCode}
        rightAction={
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Icon name="log-out" size={16} color={colors.textSecondary} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Isolated Hotel Banner */}
        <View style={styles.assignedBanner}>
          <View style={styles.bannerIconBlock}>
            <Icon name="hotel" size={22} color="#047857" />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTag}>ASSIGNED PROPERTY CONSOLE</Text>
            <Text style={styles.bannerTitle}>{assignedHotelName}</Text>
            <Text style={styles.managerNotice}>
              Logged in as Property Manager • Locked to {kpis.totalRooms} Rooms
            </Text>
          </View>
          <Badge label={`${kpis.totalRooms} ROOMS`} variant="success" size="sm" />
        </View>

        {/* ============================================================== */}
        {/* UPPER SECTION: OPERATIONAL METRICS (LEFT) + CALENDAR (RIGHT)   */}
        {/* ============================================================== */}
        <View style={[styles.mainSectionLayout, isDesktop && styles.mainDesktopLayout]}>
          {/* Left Column: Today's 6 Operational Metrics */}
          <View style={[styles.metricsCol, isDesktop && styles.metricsDesktopCol]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeader}>Today's Operational Metrics</Text>
                <Text style={styles.sectionSubtitle}>
                  Dynamic property stats for {todayStr}
                </Text>
              </View>
            </View>

            {/* 6 Independent Operational Metric Cards */}
            <View style={styles.kpiGrid}>
              {/* 1. Total Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Total Rooms"
                  value={kpis.totalRooms.toString()}
                  icon="grid"
                  accentColor={colors.primaryNavy}
                  subtitle={hotelId === 'h-navkar' ? '70 Active Rooms' : '15 Active Rooms'}
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* 2. Available Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Available Rooms"
                  value={kpis.availableRooms.toString()}
                  icon="check-circle"
                  accentColor={colors.success}
                  subtitle="Vacant & Ready"
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* 3. Occupied Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Occupied Rooms"
                  value={kpis.occupiedRooms.toString()}
                  icon="user-check"
                  accentColor="#0284C7"
                  subtitle="Active In-House"
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* 4. Today's Check-ins */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Check-ins"
                  value={kpis.todayCheckIns.toString()}
                  icon="log-in"
                  accentColor="#059669"
                  subtitle="Scheduled Arrivals"
                  onPress={() => navigate('checkin-rooms')}
                />
              </View>

              {/* 5. Today's Check-outs */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Check-outs"
                  value={kpis.todayCheckOuts.toString()}
                  icon="log-out"
                  accentColor="#D97706"
                  subtitle="Scheduled Departures"
                  onPress={() => navigate('checkin-rooms')}
                />
              </View>

              {/* 6. Today's Bookings */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Bookings"
                  value={kpis.todayBookings.toString()}
                  icon="calendar"
                  accentColor="#7C3AED"
                  subtitle="Created / Arriving Today"
                  onPress={() => navigate('advance-booking')}
                />
              </View>
            </View>

            {/* Financial Overview Cards */}
            <View style={styles.financialRow}>
              <View style={styles.finCol}>
                <KPICard
                  title="Collections"
                  value={formatCurrency(kpis.todayCollections)}
                  icon="credit-card"
                  accentColor="#16A34A"
                  subtitle="Settled Revenue"
                  onPress={() => navigate('billing')}
                />
              </View>
              <View style={styles.finCol}>
                <KPICard
                  title="Pending Due"
                  value={formatCurrency(kpis.pendingPayments)}
                  icon="alert-circle"
                  accentColor="#DC2626"
                  subtitle="Guest Balances"
                  onPress={() => navigate('billing')}
                />
              </View>
            </View>
          </View>

          {/* Right Column: Modern Interactive Dashboard Calendar */}
          <View style={[styles.calendarCol, isDesktop && styles.calendarDesktopCol]}>
            <DashboardCalendar
              hotelId={hotelId}
              hotelName={assignedHotelName}
              bookings={hotelBookings}
              rooms={hotelRooms}
              onSelectBooking={(b) => navigate('checkin-rooms')}
              onSelectRoom={(r) => navigate('rooms')}
            />
          </View>
        </View>

        {/* ============================================================== */}
        {/* BELOW SECTION: RECENT BOOKINGS / TODAY'S CHECK-INS & CHECK-OUTS*/}
        {/* ============================================================== */}
        <View style={styles.operationsSection}>
          <View style={styles.opsTabRow}>
            <TouchableOpacity
              style={[styles.opsTab, activeBottomTab === 'checkins' && styles.opsTabActive]}
              onPress={() => setActiveBottomTab('checkins')}
            >
              <Text style={[styles.opsTabText, activeBottomTab === 'checkins' && styles.opsTabTextActive]}>
                Today's Check-ins ({todayCheckInList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opsTab, activeBottomTab === 'checkouts' && styles.opsTabActive]}
              onPress={() => setActiveBottomTab('checkouts')}
            >
              <Text style={[styles.opsTabText, activeBottomTab === 'checkouts' && styles.opsTabTextActive]}>
                Today's Check-outs ({todayCheckOutList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opsTab, activeBottomTab === 'recent' && styles.opsTabActive]}
              onPress={() => setActiveBottomTab('recent')}
            >
              <Text style={[styles.opsTabText, activeBottomTab === 'recent' && styles.opsTabTextActive]}>
                Recent Bookings ({recentBookingsList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content List */}
          <View style={styles.opsContentCard}>
            {activeBottomTab === 'checkins' && (
              todayCheckInList.length === 0 ? (
                <Text style={styles.opsEmptyText}>No check-ins scheduled for today.</Text>
              ) : (
                todayCheckInList.map((item) => (
                  <View key={item.id} style={styles.opsListItem}>
                    <View style={styles.opsIconCircle}>
                      <Icon name="log-in" size={16} color="#059669" />
                    </View>
                    <View style={styles.opsItemInfo}>
                      <Text style={styles.opsItemTitle}>{item.guestName}</Text>
                      <Text style={styles.opsItemSub}>
                        Room {item.roomNumber || 'TBD'} • {item.guestPhone} • {item.numberOfGuests} Guests
                      </Text>
                    </View>
                    <Badge label={item.status.toUpperCase()} variant="success" size="sm" />
                  </View>
                ))
              )
            )}

            {activeBottomTab === 'checkouts' && (
              todayCheckOutList.length === 0 ? (
                <Text style={styles.opsEmptyText}>No check-outs scheduled for today.</Text>
              ) : (
                todayCheckOutList.map((item) => (
                  <View key={item.id} style={styles.opsListItem}>
                    <View style={[styles.opsIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Icon name="log-out" size={16} color="#D97706" />
                    </View>
                    <View style={styles.opsItemInfo}>
                      <Text style={styles.opsItemTitle}>{item.guestName}</Text>
                      <Text style={styles.opsItemSub}>
                        Room {item.roomNumber || 'TBD'} • {item.guestPhone} • Total ₹{item.totalAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Badge label={item.paymentStatus === 'paid' ? 'PAID' : 'DUE'} variant={item.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm" />
                  </View>
                ))
              )
            )}

            {activeBottomTab === 'recent' && (
              recentBookingsList.map((item) => (
                <View key={item.id} style={styles.opsListItem}>
                  <View style={[styles.opsIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="calendar" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.opsItemInfo}>
                    <Text style={styles.opsItemTitle}>{item.guestName} ({item.bookingReference})</Text>
                    <Text style={styles.opsItemSub}>
                      {item.checkInDate} to {item.checkOutDate} • Room {item.roomNumber || 'TBD'}
                    </Text>
                  </View>
                  <Badge label={item.status.toUpperCase()} variant="primary" size="sm" />
                </View>
              ))
            )}
          </View>
        </View>

        {/* 7 MANAGER NAVIGATION MODULES */}
        <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          Property Operations ({managerModules.length})
        </Text>
        <Text style={styles.sectionSubtitle}>
          Daily operational modules assigned to your property
        </Text>

        <View style={styles.modulesGrid}>
          {managerModules.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              activeOpacity={0.7}
              onPress={() => navigate(mod.screen)}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: `${mod.color}15` }]}>
                <Icon name={mod.icon} size={22} color={mod.color} />
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSub}>{mod.subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutBtnText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  assignedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  bannerIconBlock: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTag: {
    ...typography.caption,
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  managerNotice: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  mainSectionLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  mainDesktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricsCol: {
    flex: 1,
  },
  metricsDesktopCol: {
    flex: 1.1,
  },
  calendarCol: {
    flex: 1,
  },
  calendarDesktopCol: {
    flex: 1.35,
  },
  sectionHeaderRow: {
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  kpiCol: {
    width: '50%',
    padding: spacing.xs,
  },
  financialRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
    marginTop: spacing.xs,
  },
  finCol: {
    flex: 1,
    padding: spacing.xs,
  },
  operationsSection: {
    marginTop: spacing.lg,
  },
  opsTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  opsTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  opsTabActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  opsTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  opsTabTextActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  opsContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  opsEmptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 16,
  },
  opsListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  opsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opsItemInfo: {
    flex: 1,
  },
  opsItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  opsItemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modulesGrid: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  moduleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default ManagerDashboardScreen;
