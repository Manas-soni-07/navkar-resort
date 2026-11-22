/**
 * ResortOS - Admin Dashboard & Control Console
 * Consolidated and Property-Specific Oversight for THE VILLA and NAVKAR PALACE & RESORT.
 * Displays 6 Core Operational Metrics, Interactive Dashboard Calendar, and 14 Admin Modules.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Icon, IconName } from '../components/common/Icon';
import { KPICard } from '../components/dashboard/KPICard';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { formatCurrency } from '../utils/formatters';

export const AdminDashboardScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const {
    hotels,
    selectedHotelId,
    selectedHotel,
    switchHotel,
    rooms,
    bookings,
    expenses,
    folios,
  } = useHotel();

  // Hotel selector: 'all', 'h-villa', 'h-navkar'
  const [filterHotelId, setFilterHotelId] = useState<string>('all');
  const [showPicker, setShowPicker] = useState<boolean>(false);
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

  // Compute metrics based on selected hotel filter
  const isAll = filterHotelId === 'all';
  const targetRooms = useMemo(
    () => (isAll ? rooms : rooms.filter((r) => r.hotelId === filterHotelId)),
    [isAll, rooms, filterHotelId]
  );
  const targetBookings = useMemo(
    () => (isAll ? bookings : bookings.filter((b) => b.hotelId === filterHotelId)),
    [isAll, bookings, filterHotelId]
  );
  const targetExpenses = useMemo(
    () => (isAll ? expenses : expenses.filter((e) => e.hotelId === filterHotelId)),
    [isAll, expenses, filterHotelId]
  );
  const targetFolios = useMemo(
    () => (isAll ? folios : folios.filter((f) => f.hotelId === filterHotelId)),
    [isAll, folios, filterHotelId]
  );

  const metrics = useMemo(() => {
    const totalHotels = isAll ? hotels.length : 1;
    // Exactly 70 for Navkar Palace, 15 for The Villa, 85 for Consolidated
    const totalRooms = targetRooms.length;
    const occupiedRooms = targetRooms.filter((r) => r.status === 'occupied').length;
    const cleaningRooms = targetRooms.filter((r) => r.status === 'cleaning').length;
    const maintenanceRooms = targetRooms.filter((r) => r.status === 'maintenance').length;
    const availableRooms = Math.max(0, totalRooms - (occupiedRooms + cleaningRooms + maintenanceRooms));

    // Today's Check-ins: Actual check-in events scheduled/performed for today's date
    const todayCheckIns = targetBookings.filter(
      (b) => b.checkInDate === todayStr && b.status !== 'cancelled'
    ).length;

    // Today's Check-outs: Actual check-out events scheduled/performed for today's date
    const todayCheckOuts = targetBookings.filter(
      (b) => b.checkOutDate === todayStr && b.status !== 'cancelled'
    ).length;

    // Today's Bookings: Bookings created or scheduled for today's date
    const todayBookings = targetBookings.filter(
      (b) => (b.createdAt === todayStr || b.checkInDate === todayStr) && b.status !== 'cancelled'
    ).length;

    // Financial calculations (INR)
    const totalCollections = targetFolios
      .filter((f) => f.status === 'settled' || (f.paidAmount && f.paidAmount > 0))
      .reduce((acc, f) => acc + (f.paidAmount || 0), 0);
    const pendingPayments = targetFolios
      .filter((f) => f.status === 'open' && f.balanceDue > 0)
      .reduce((acc, f) => acc + (f.balanceDue || 0), 0);
    const totalExpenses = targetExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      totalHotels,
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      todayCheckIns,
      todayCheckOuts,
      todayBookings,
      totalCollections,
      pendingPayments,
      totalExpenses,
    };
  }, [isAll, targetRooms, targetBookings, targetExpenses, targetFolios, hotels.length, todayStr]);

  const handleSelectHotelFilter = (id: string) => {
    setFilterHotelId(id);
    if (id !== 'all') {
      switchHotel(id);
    }
    setShowPicker(false);
  };

  // Filtered operational lists for bottom section
  const todayCheckInList = useMemo(() => {
    return targetBookings.filter(
      (b) => b.checkInDate === todayStr && b.status !== 'cancelled'
    );
  }, [targetBookings, todayStr]);

  const todayCheckOutList = useMemo(() => {
    return targetBookings.filter(
      (b) => b.checkOutDate === todayStr && b.status !== 'cancelled'
    );
  }, [targetBookings, todayStr]);

  const recentBookingsList = useMemo(() => {
    return [...targetBookings]
      .filter((b) => b.status !== 'cancelled')
      .slice(0, 5);
  }, [targetBookings]);

  // 11 Core Hotel Management Modules
  const adminModules: { id: string; title: string; subtitle: string; icon: IconName; screen: any; color: string }[] = [
    {
      id: 'mod-hotels',
      title: '1. Hotels Management',
      subtitle: 'Create, edit & manage both properties',
      icon: 'hotel',
      screen: 'hotels',
      color: '#0F2942',
    },
    {
      id: 'mod-rooms',
      title: '2. Room Management',
      subtitle: 'Room numbers, status & assignments (85 Rooms)',
      icon: 'grid',
      screen: 'rooms',
      color: '#0284C7',
    },
    {
      id: 'mod-advance-booking',
      title: '3. Advance Booking',
      subtitle: 'Manage upcoming room reservations & advance pipeline',
      icon: 'calendar',
      screen: 'advance-booking',
      color: '#7C3AED',
    },
    {
      id: 'mod-checkin',
      title: '4. Check-In & Check-Out',
      subtitle: 'Front desk arrivals, walk-ins & room departures',
      icon: 'log-in',
      screen: 'checkin-rooms',
      color: '#059669',
    },
    {
      id: 'mod-billing',
      title: '5. Billing & Folios',
      subtitle: 'Guest billing, invoices, GST & payments',
      icon: 'credit-card',
      screen: 'billing',
      color: '#16A34A',
    },
    {
      id: 'mod-users',
      title: '6. Staff Management',
      subtitle: 'Manage Managers, Staff & role access',
      icon: 'users',
      screen: 'staff',
      color: '#1E3A8A',
    },
    {
      id: 'mod-attendance',
      title: '7. Staff Attendance',
      subtitle: 'Daily roster, attendance & check-in times',
      icon: 'user-check',
      screen: 'attendance',
      color: '#D97706',
    },
    {
      id: 'mod-salaries',
      title: '8. Staff Salary & Advances',
      subtitle: 'Salary advances, loans & monthly payroll records',
      icon: 'dollar-sign',
      screen: 'salary-advances',
      color: '#0D9488',
    },
    {
      id: 'mod-expenses',
      title: '9. Daily Expenses',
      subtitle: 'Vendor bills, maintenance & petty cash vouchers',
      icon: 'trending-down',
      screen: 'daily-expenses',
      color: '#DC2626',
    },
    {
      id: 'mod-reports',
      title: '10. Daily Summary & Reports',
      subtitle: 'Consolidated revenue, RevPAR, ADR & audit reports',
      icon: 'bar-chart-2',
      screen: 'daily-summary',
      color: '#3B82F6',
    },
    {
      id: 'mod-settings',
      title: '11. Settings',
      subtitle: 'Owner profile, notifications & sign out',
      icon: 'settings',
      screen: 'settings',
      color: '#475569',
    },
  ];

  const currentHotelLabel =
    filterHotelId === 'all'
      ? 'All Hotels (Consolidated View)'
      : filterHotelId === 'h-villa'
      ? 'THE VILLA (Jaipur - 15 Rooms)'
      : 'NAVKAR PALACE HOTEL & RESORT (Udaipur - 70 Rooms)';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Admin Control Center"
        subtitle="Executive Hotel Management & Real-Time Oversight"
        hotelBadge="ADMIN ACCESS"
        rightAction={
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setShowPicker(!showPicker)}
            activeOpacity={0.8}
          >
            <Icon name="filter" size={14} color={colors.primaryNavy} />
            <Text style={styles.pickerTriggerText} numberOfLines={1}>
              {filterHotelId === 'all'
                ? 'All Hotels'
                : filterHotelId === 'h-villa'
                ? 'The Villa (15)'
                : 'Navkar Palace (70)'}
            </Text>
            <Icon name="chevron-down" size={14} color={colors.primaryNavy} />
          </TouchableOpacity>
        }
      />

      {/* Hotel Selector Dropdown Modal / Strip */}
      {showPicker && (
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>SWITCH HOTEL VIEW:</Text>
          <TouchableOpacity
            style={[styles.dropdownItem, filterHotelId === 'all' && styles.dropdownItemSelected]}
            onPress={() => handleSelectHotelFilter('all')}
          >
            <Icon name="globe" size={16} color={filterHotelId === 'all' ? colors.primaryNavy : colors.textSecondary} />
            <Text style={[styles.dropdownText, filterHotelId === 'all' && styles.dropdownTextSelected]}>
              All Hotels (Consolidated View • 85 Total Rooms)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, filterHotelId === 'h-navkar' && styles.dropdownItemSelected]}
            onPress={() => handleSelectHotelFilter('h-navkar')}
          >
            <Icon name="hotel" size={16} color={filterHotelId === 'h-navkar' ? colors.primaryNavy : colors.textSecondary} />
            <Text style={[styles.dropdownText, filterHotelId === 'h-navkar' && styles.dropdownTextSelected]}>
              Navkar Palace Hotel & Resort (Udaipur • Exactly 70 Rooms)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, filterHotelId === 'h-villa' && styles.dropdownItemSelected]}
            onPress={() => handleSelectHotelFilter('h-villa')}
          >
            <Icon name="hotel" size={16} color={filterHotelId === 'h-villa' ? colors.primaryNavy : colors.textSecondary} />
            <Text style={[styles.dropdownText, filterHotelId === 'h-villa' && styles.dropdownTextSelected]}>
              The Villa (Civil Lines, Jaipur • Exactly 15 Rooms)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Property Banner */}
        <View style={styles.propertyBanner}>
          <View style={styles.bannerIconBlock}>
            <Icon name="layers" size={20} color={colors.primaryNavy} />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerLabel}>ACTIVE HOTEL VIEW</Text>
            <Text style={styles.bannerScope}>{currentHotelLabel}</Text>
          </View>
          <Badge
            label={filterHotelId === 'all' ? '85 ROOMS' : filterHotelId === 'h-navkar' ? '70 ROOMS' : '15 ROOMS'}
            variant="primary"
            size="sm"
          />
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
                  Calculated dynamically from database records ({todayStr})
                </Text>
              </View>
            </View>

            {/* 6 Independent Operational Metric Cards */}
            <View style={styles.kpiGrid}>
              {/* Card 1: Total Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Total Rooms"
                  value={metrics.totalRooms.toString()}
                  icon="grid"
                  accentColor="#0284C7"
                  subtitle={filterHotelId === 'h-navkar' ? '70 Active Rooms' : filterHotelId === 'h-villa' ? '15 Active Rooms' : '85 Active Rooms'}
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* Card 2: Available Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Available Rooms"
                  value={metrics.availableRooms.toString()}
                  icon="check-circle"
                  accentColor={colors.success}
                  subtitle="Vacant & Ready"
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* Card 3: Occupied Rooms */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Occupied Rooms"
                  value={metrics.occupiedRooms.toString()}
                  icon="user-check"
                  accentColor="#4F46E5"
                  subtitle="In-House Stays"
                  onPress={() => navigate('rooms')}
                />
              </View>

              {/* Card 4: Today's Check-ins */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Check-ins"
                  value={metrics.todayCheckIns.toString()}
                  icon="log-in"
                  accentColor="#059669"
                  subtitle="Scheduled Arrivals"
                  onPress={() => navigate('checkin-rooms')}
                />
              </View>

              {/* Card 5: Today's Check-outs */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Check-outs"
                  value={metrics.todayCheckOuts.toString()}
                  icon="log-out"
                  accentColor="#D97706"
                  subtitle="Departures Due"
                  onPress={() => navigate('checkin-rooms')}
                />
              </View>

              {/* Card 6: Today's Bookings */}
              <View style={styles.kpiCol}>
                <KPICard
                  title="Today's Bookings"
                  value={metrics.todayBookings.toString()}
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
                  value={formatCurrency(metrics.totalCollections)}
                  icon="credit-card"
                  accentColor="#16A34A"
                  subtitle="Settled Revenue"
                  onPress={() => navigate('billing')}
                />
              </View>
              <View style={styles.finCol}>
                <KPICard
                  title="Pending Due"
                  value={formatCurrency(metrics.pendingPayments)}
                  icon="alert-circle"
                  accentColor="#DC2626"
                  subtitle="Unpaid Folios"
                  onPress={() => navigate('billing')}
                />
              </View>
              <View style={styles.finCol}>
                <KPICard
                  title="Expenses"
                  value={formatCurrency(metrics.totalExpenses)}
                  icon="trending-down"
                  accentColor="#EA580C"
                  subtitle="Operational Outflow"
                  onPress={() => navigate('daily-expenses')}
                />
              </View>
            </View>
          </View>

          {/* Right Column: Modern Interactive Dashboard Calendar */}
          <View style={[styles.calendarCol, isDesktop && styles.calendarDesktopCol]}>
            <DashboardCalendar
              hotelId={filterHotelId}
              hotelName={filterHotelId === 'all' ? 'All Managed Hotels' : filterHotelId === 'h-villa' ? 'The Villa' : 'Navkar Palace'}
              bookings={targetBookings}
              rooms={targetRooms}
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

        {/* CORE HOTEL MANAGEMENT MODULES */}
        <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          Hotel Management Modules ({adminModules.length})
        </Text>
        <Text style={styles.sectionSubtitle}>
          Complete operational oversight for rooms, reservations, front desk, billing, staff, and expenses
        </Text>

        <View style={styles.modulesGrid}>
          {adminModules.map((mod) => (
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
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pickerTriggerText: {
    ...typography.captionMedium,
    color: colors.primaryNavy,
    marginHorizontal: 4,
    fontWeight: '700',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.md,
    zIndex: 99,
  },
  dropdownTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryTint,
  },
  dropdownText: {
    ...typography.body2,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  dropdownTextSelected: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  propertyBanner: {
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerScope: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 1,
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

export default AdminDashboardScreen;
