import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const DailySummaryScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    currentUser,
    hotels,
    rooms: allRooms,
    bookings: allBookings,
    folios: allFolios,
    expenses: allExpenses,
  } = useHotel();

  // Role Security Check
  const isAdmin = currentUser?.role === 'ADMIN';

  // Filters
  const [selectedHotelId, setSelectedHotelId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'month'>('today');

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Compute metrics based on selected hotel
  const metrics = useMemo(() => {
    // 1. Filter entities by hotel
    const filteredHotels =
      selectedHotelId === 'all'
        ? hotels
        : hotels.filter((h) => h.id === selectedHotelId);

    const targetHotelIds = filteredHotels.map((h) => h.id);

    const targetRooms = allRooms.filter((r) => targetHotelIds.includes(r.hotelId));
    const targetBookings = allBookings.filter((b) => targetHotelIds.includes(b.hotelId));
    const targetFolios = allFolios.filter((f) => targetHotelIds.includes(f.hotelId));
    const targetExpenses = allExpenses.filter((e) => targetHotelIds.includes(e.hotelId));

    // Room stats
    const totalRooms = targetRooms.length;
    const occupiedRooms = targetRooms.filter((r) => r.status === 'occupied').length;
    const availableRooms = targetRooms.filter((r) => r.status === 'available').length;
    const cleaningRooms = targetRooms.filter((r) => r.status === 'cleaning').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Movement
    const todayCheckIns = targetBookings.filter(
      (b) => b.status === 'checked_in' || b.status === 'confirmed'
    ).length;
    const todayCheckOuts = targetBookings.filter((b) => b.status === 'checked_out').length;

    // Financial calculations
    const roomRevenue = targetRooms
      .filter((r) => r.status === 'occupied')
      .reduce((sum, r) => sum + r.ratePerNight, 0);

    const folioSettledRevenue = targetFolios
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.totalAmount, 0);

    // Total Revenue
    const totalRevenue = Math.round(roomRevenue + folioSettledRevenue);

    // Actual Collections (Advance from bookings + Paid from folios)
    const bookingAdvances = targetBookings.reduce((sum, b) => sum + (b.depositPaid || 0), 0);
    const folioPaid = targetFolios.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    const actualCollections = Math.round(bookingAdvances * 0.4 + folioPaid);

    // Outstanding Payments
    const outstandingPayments = targetFolios
      .filter((f) => f.status === 'open')
      .reduce((sum, f) => sum + f.balanceDue, 0);

    // Total Expenses
    const totalExpenses = targetExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Net Cashflow / Operating Profit = Collections - Expenses
    const netProfit = actualCollections - totalExpenses;

    // Hotel-wise breakdown for comparison
    const perHotelBreakdown = filteredHotels.map((h) => {
      const hRooms = allRooms.filter((r) => r.hotelId === h.id);
      const hOcc = hRooms.filter((r) => r.status === 'occupied').length;
      const hFolios = allFolios.filter((f) => f.hotelId === h.id);
      const hExp = allExpenses.filter((e) => e.hotelId === h.id);

      const hCol = hFolios.reduce((sum, f) => sum + f.paidAmount, 0);
      const hExpTotal = hExp.reduce((sum, e) => sum + e.amount, 0);
      const hOut = hFolios.filter((f) => f.status === 'open').reduce((sum, f) => sum + f.balanceDue, 0);

      return {
        id: h.id,
        name: h.name,
        totalRooms: hRooms.length,
        occupiedRooms: hOcc,
        occupancy: hRooms.length > 0 ? Math.round((hOcc / hRooms.length) * 100) : 0,
        collections: hCol,
        expenses: hExpTotal,
        profit: hCol - hExpTotal,
        outstanding: hOut,
      };
    });

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      occupancyRate,
      todayCheckIns,
      todayCheckOuts,
      totalRevenue,
      actualCollections,
      outstandingPayments,
      totalExpenses,
      netProfit,
      perHotelBreakdown,
    };
  }, [selectedHotelId, hotels, allRooms, allBookings, allFolios, allExpenses]);

  // Export / Share Report Handler
  const handleShareReport = async () => {
    const propertyLabel =
      selectedHotelId === 'all'
        ? 'All Properties (THE VILLA + NAVKAR PALACE & RESORT)'
        : hotels.find((h) => h.id === selectedHotelId)?.name || 'ResortOS Property';

    const reportText = `==============================
RESORTOS DAILY SUMMARY REPORT
==============================
Date: 17 Nov 2026
Property: ${propertyLabel}
Generated By: ${currentUser?.fullName || 'Admin Owner'}

--- OPERATIONAL SUMMARY ---
Total Rooms: ${metrics.totalRooms}
Occupied Rooms: ${metrics.occupiedRooms} (${metrics.occupancyRate}%)
Available Rooms: ${metrics.availableRooms}
Cleaning / Turnover: ${metrics.cleaningRooms}
Today's Check-ins: ${metrics.todayCheckIns}
Today's Check-outs: ${metrics.todayCheckOuts}

--- FINANCIAL AUDIT ---
Gross Revenue: ₹ ${metrics.totalRevenue.toLocaleString('en-IN')}
Actual Collections: ₹ ${metrics.actualCollections.toLocaleString('en-IN')}
Pending / Outstanding: ₹ ${metrics.outstandingPayments.toLocaleString('en-IN')}
Total Expenses: -₹ ${metrics.totalExpenses.toLocaleString('en-IN')}
------------------------------
NET OPERATING PROFIT: ₹ ${metrics.netProfit.toLocaleString('en-IN')}
==============================`;

    try {
      await Share.share({
        title: `ResortOS Daily Summary - 17 Nov 2026`,
        message: reportText,
      });
    } catch {
      Alert.alert('Report Export', reportText);
    }
  };

  // If Manager tries to open Admin Report
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Daily Summary" subtitle="Access Restricted" showBack onBack={goBack} />
        <View style={styles.deniedContainer}>
          <Icon name="lock" size={48} color="#DC2626" />
          <Text style={styles.deniedTitle}>Admin Access Required</Text>
          <Text style={styles.deniedDesc}>
            Daily Financial Summary Reports and consolidated P&L statements are strictly reserved
            for the Hotel Owner / Administrator. Managers can view operational data for their assigned
            hotel only.
          </Text>
          <Button
            title="Return to Dashboard"
            variant="primary"
            onPress={goBack}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const selectedHotelObj = hotels.find((h) => h.id === selectedHotelId);
  const currentSubtitle = selectedHotelId === 'all' ? 'All Hotels Consolidated' : selectedHotelObj?.name;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Daily Summary Reports"
        subtitle={currentSubtitle}
        hotelBadge="ADMIN AUDITED"
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShareReport}
            style={styles.shareBtn}
          >
            <Icon name="share-2" size={16} color={colors.accentBlue} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hotel Property Selector */}
        <Text style={styles.sectionLabel}>SELECT HOTEL PROPERTY AUDIT:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedHotelId('all')}
            style={[styles.propPill, selectedHotelId === 'all' && styles.propPillActive]}
          >
            <Text
              style={[
                styles.propPillText,
                selectedHotelId === 'all' && styles.propPillTextActive,
              ]}
            >
              All Hotels (Consolidated)
            </Text>
          </TouchableOpacity>
          {hotels.map((h) => {
            const isActive = h.id === selectedHotelId;
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => setSelectedHotelId(h.id)}
                style={[styles.propPill, isActive && styles.propPillActive]}
              >
                <Text style={[styles.propPillText, isActive && styles.propPillTextActive]}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date Filter Tabs */}
        <View style={styles.dateFilterRow}>
          {[
            { id: 'today', label: 'Today (17 Nov)' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7', label: 'Last 7 Days' },
            { id: 'month', label: 'Month to Date' },
          ].map((d) => {
            const isSelected = dateFilter === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => setDateFilter(d.id as any)}
                style={[styles.dateTab, isSelected && styles.dateTabActive]}
              >
                <Text style={[styles.dateTabText, isSelected && styles.dateTabTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Master P&L Statement Banner Card */}
        <View style={styles.plCard}>
          <View style={styles.plCardHeader}>
            <Text style={styles.plTitle}>EXECUTIVE P&L STATEMENT</Text>
            <Badge
              label={selectedHotelId === 'all' ? 'CONSOLIDATED' : selectedHotelObj?.code || 'RESORT'}
              variant="gold"
              size="sm"
            />
          </View>

          <Text style={styles.grossRevText}>
            ₹ {metrics.totalRevenue.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.grossSubtitle}>Gross Realized & Accrued Daily Revenue</Text>

          {/* Three Key Figures Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Actual Collections</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>
                ₹ {metrics.actualCollections.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Expenses</Text>
              <Text style={[styles.metricValue, { color: '#DC2626' }]}>
                -₹ {metrics.totalExpenses.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Pending Due</Text>
              <Text style={[styles.metricValue, { color: '#D97706' }]}>
                ₹ {metrics.outstandingPayments.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.summaryBarDivider} />

          {/* Bottom Financial Outcome Row */}
          <View style={styles.financialOutcomeRow}>
            <View>
              <Text style={styles.outcomeLabel}>Daily Operating Net Flow:</Text>
              <Text style={[styles.outcomeValue, { color: '#60A5FA' }]}>
                {metrics.occupancyRate}% Room Occupancy
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.outcomeLabel}>Net Operating Profit (NOI):</Text>
              <Text
                style={[
                  styles.outcomeValue,
                  { color: metrics.netProfit >= 0 ? '#34D399' : '#F87171' },
                ]}
              >
                ₹ {metrics.netProfit.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Room Capacity Status */}
        <Text style={styles.sectionHeaderTitle}>ROOM FLOW & CAPACITY AUDIT</Text>
        <View style={styles.capacityCard}>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Total Resort Capacity:</Text>
            <Text style={styles.capacityVal}>{metrics.totalRooms} Rooms</Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Occupied Stays:</Text>
            <Text style={[styles.capacityVal, { color: colors.accentBlue }]}>
              {metrics.occupiedRooms} Rooms ({metrics.occupancyRate}%)
            </Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Vacant Available & Inspected:</Text>
            <Text style={[styles.capacityVal, { color: colors.success }]}>
              {metrics.availableRooms} Rooms
            </Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Cleaning & Turnover In-Progress:</Text>
            <Text style={[styles.capacityVal, { color: colors.warning }]}>
              {metrics.cleaningRooms} Rooms
            </Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Today's Arrival Check-ins:</Text>
            <Text style={styles.capacityVal}>{metrics.todayCheckIns} Guests</Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>Today's Scheduled Check-outs:</Text>
            <Text style={styles.capacityVal}>{metrics.todayCheckOuts} Guests</Text>
          </View>
        </View>

        {/* Side-by-Side Comparison when All Hotels is selected */}
        {selectedHotelId === 'all' && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionHeaderTitle}>PROPERTY-WISE COMPARISON</Text>
            {metrics.perHotelBreakdown.map((item) => (
              <View key={item.id} style={styles.comparisonCard}>
                <View style={styles.comparisonCardHeader}>
                  <Text style={styles.comparisonHotelName}>{item.name}</Text>
                  <Badge
                    label={`${item.occupancy}% OCC`}
                    variant={item.occupancy > 50 ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>

                <View style={styles.comparisonGrid}>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>Rooms:</Text>
                    <Text style={styles.comparisonValue}>
                      {item.occupiedRooms}/{item.totalRooms}
                    </Text>
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>Collections:</Text>
                    <Text style={[styles.comparisonValue, { color: '#059669' }]}>
                      ₹ {item.collections.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>Expenses:</Text>
                    <Text style={[styles.comparisonValue, { color: '#DC2626' }]}>
                      ₹ {item.expenses.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>Net Profit:</Text>
                    <Text
                      style={[
                        styles.comparisonValue,
                        { color: item.profit >= 0 ? '#059669' : '#DC2626', fontWeight: '800' },
                      ]}
                    >
                      ₹ {item.profit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Export / Print Actions */}
        <View style={styles.actionsRow}>
          <Button
            title="Export & Share Report"
            variant="primary"
            size="md"
            onPress={handleShareReport}
            style={{ flex: 1 }}
          />
          <Button
            title="Print Preview"
            variant="outline"
            size="md"
            onPress={() => setShowPreviewModal(true)}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      {/* Print Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Daily Audit Print Preview</Text>
            <TouchableOpacity
              onPress={() => setShowPreviewModal(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.printSheet}>
            <View style={styles.printHeader}>
              <Text style={styles.printBrand}>ResortOS Management</Text>
              <Text style={styles.printDocTitle}>DAILY EXECUTIVE P&L STATEMENT</Text>
              <Text style={styles.printDate}>Date of Audit: 17 November 2026</Text>
              <Text style={styles.printProperty}>
                Property:{' '}
                {selectedHotelId === 'all'
                  ? 'All Properties Consolidated'
                  : selectedHotelObj?.name}
              </Text>
            </View>

            <View style={styles.printDivider} />

            <Text style={styles.printSectionHead}>1. FINANCIAL STATEMENT</Text>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Gross Revenue (Accrued & Billed):</Text>
              <Text style={styles.printValue}>
                ₹ {metrics.totalRevenue.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Actual Cash & UPI Collections:</Text>
              <Text style={[styles.printValue, { color: '#059669' }]}>
                ₹ {metrics.actualCollections.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Total Operational Expenses:</Text>
              <Text style={[styles.printValue, { color: '#DC2626' }]}>
                -₹ {metrics.totalExpenses.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Outstanding Guest Ledger Due:</Text>
              <Text style={styles.printValue}>
                ₹ {metrics.outstandingPayments.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.printRow, styles.printTotalRow]}>
              <Text style={styles.printTotalLabel}>NET OPERATING PROFIT:</Text>
              <Text style={styles.printTotalValue}>
                ₹ {metrics.netProfit.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.printDivider} />

            <Text style={styles.printSectionHead}>2. OCCUPANCY & CAPACITY STATS</Text>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Total Available Room Capacity:</Text>
              <Text style={styles.printValue}>{metrics.totalRooms} Rooms</Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Occupied Room Nights:</Text>
              <Text style={styles.printValue}>
                {metrics.occupiedRooms} ({metrics.occupancyRate}%)
              </Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Available Inspected Rooms:</Text>
              <Text style={styles.printValue}>{metrics.availableRooms} Rooms</Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Arrivals Checked-in Today:</Text>
              <Text style={styles.printValue}>{metrics.todayCheckIns}</Text>
            </View>
            <View style={styles.printRow}>
              <Text style={styles.printLabel}>Departures Checked-out Today:</Text>
              <Text style={styles.printValue}>{metrics.todayCheckOuts}</Text>
            </View>

            <View style={styles.printDivider} />

            <View style={styles.signSection}>
              <View style={styles.signCol}>
                <Text style={styles.signLine}>___________________</Text>
                <Text style={styles.signTitle}>Duty Manager</Text>
              </View>
              <View style={styles.signColRight}>
                <Text style={styles.signLine}>___________________</Text>
                <Text style={styles.signTitle}>Managing Director / Owner</Text>
              </View>
            </View>

            <Button
              title="Close Preview"
              variant="outline"
              size="md"
              onPress={() => setShowPreviewModal(false)}
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0E1F2',
  },
  sectionLabel: {
    ...typography.overline,
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  filterScroll: {
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  propPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  propPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  propPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  propPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateFilterRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.md,
  },
  dateTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  dateTabActive: {
    backgroundColor: colors.primaryNavy,
  },
  dateTabText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  dateTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  plCard: {
    backgroundColor: colors.primaryNavy,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  plCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  plTitle: {
    ...typography.overline,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  grossRevText: {
    ...typography.h2,
    color: '#F8FAFC',
    fontWeight: '800',
    marginTop: 2,
  },
  grossSubtitle: {
    ...typography.caption,
    color: '#CBD5E1',
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 9,
    color: '#CBD5E1',
  },
  metricValue: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  summaryBarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: spacing.md,
  },
  financialOutcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outcomeLabel: {
    ...typography.caption,
    fontSize: 10,
    color: '#94A3B8',
  },
  outcomeValue: {
    ...typography.subtitle1,
    fontWeight: '800',
    marginTop: 1,
  },
  sectionHeaderTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  capacityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  capacityText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  capacityVal: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  comparisonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  comparisonHotelName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  comparisonCol: {
    alignItems: 'center',
  },
  comparisonLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
  },
  comparisonValue: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  deniedTitle: {
    ...typography.h3,
    color: '#DC2626',
    marginTop: spacing.md,
  },
  deniedDesc: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.primaryNavy,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  printSheet: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  printHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  printBrand: {
    ...typography.h2,
    color: colors.primaryNavy,
    fontWeight: '800',
  },
  printDocTitle: {
    ...typography.subtitle2,
    color: colors.accentBlue,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  printDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  printProperty: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  printDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  printSectionHead: {
    ...typography.overline,
    color: colors.primaryNavy,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  printRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  printLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  printValue: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  printTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginTop: spacing.xs,
    paddingTop: 8,
  },
  printTotalLabel: {
    ...typography.subtitle2,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  printTotalValue: {
    ...typography.subtitle1,
    fontWeight: '800',
    color: '#059669',
  },
  signSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  signCol: {
    alignItems: 'flex-start',
  },
  signColRight: {
    alignItems: 'flex-end',
  },
  signLine: {
    color: '#94A3B8',
  },
  signTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
