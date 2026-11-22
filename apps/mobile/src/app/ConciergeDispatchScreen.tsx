import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { ConciergeBooking, ExcursionPackage } from '../types/hotel';

export const ConciergeDispatchScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    conciergeBookings,
    excursions,
    createConciergeBooking,
    updateConciergeBookingStatus,
    rooms,
    selectedHotel,
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'transfers' | 'packages'>('transfers');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Book Excursion Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [selectedExcursionId, setSelectedExcursionId] = useState(
    excursions[0]?.id || ''
  );
  const [driverGuideName, setDriverGuideName] = useState('Narayan Singh (Guide & Boatman)');
  const [vehicleNumber, setVehicleNumber] = useState('Royal Boat "Padmavati-04"');
  const [pickupTime, setPickupTime] = useState('05:00 PM');
  const [pickupDate, setPickupDate] = useState('2026-11-16');
  const [guestCountStr, setGuestCountStr] = useState('2');
  const [notes, setNotes] = useState('Cold bottled mineral water and photography assistance');

  // Currently occupied rooms
  const occupiedRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'occupied' && r.currentGuestName);
  }, [rooms]);

  React.useEffect(() => {
    if (!selectedRoomNumber && occupiedRooms.length > 0) {
      setSelectedRoomNumber(occupiedRooms[0].roomNumber);
    }
  }, [occupiedRooms, selectedRoomNumber]);

  const selectedExcursion = useMemo(() => {
    return excursions.find((e) => e.id === selectedExcursionId) || excursions[0];
  }, [excursions, selectedExcursionId]);

  // Top Metrics
  const metrics = useMemo(() => {
    const totalPipeline = conciergeBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const activeDispatches = conciergeBookings.filter((b) => b.status !== 'completed').length;
    const completedToday = conciergeBookings.filter((b) => b.status === 'completed').length;

    return { totalPipeline, activeDispatches, completedToday };
  }, [conciergeBookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return conciergeBookings.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        b.bookingRef.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.roomNumber.toLowerCase().includes(q) ||
        b.serviceTitle.toLowerCase().includes(q) ||
        b.driverOrGuideName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [conciergeBookings, searchQuery, statusFilter]);

  // Handle Dispatch Creation
  const handleCreateDispatch = async () => {
    if (!selectedRoomNumber) {
      Alert.alert('No Room Selected', 'Please select an occupied room.');
      return;
    }
    if (!selectedExcursion) {
      Alert.alert('No Tour Selected', 'Please select an excursion or transfer package.');
      return;
    }

    const targetRoom = occupiedRooms.find((r) => r.roomNumber === selectedRoomNumber);
    const guestName = targetRoom?.currentGuestName || 'Valued Guest';
    const numberOfGuests = parseInt(guestCountStr, 10) || 1;

    const newBooking = await createConciergeBooking({
      hotelId: selectedHotel.id,
      roomNumber: selectedRoomNumber,
      guestName,
      serviceTitle: selectedExcursion.title,
      category: selectedExcursion.category,
      driverOrGuideName: driverGuideName.trim(),
      vehicleOrVesselNumber: vehicleNumber.trim(),
      pickupTime,
      date: pickupDate,
      numberOfGuests,
      status: 'scheduled',
      notes: notes.trim() || undefined,
    });

    Alert.alert(
      'Concierge Dispatched',
      `Booking ${newBooking.bookingRef} confirmed for ${guestName} (Room ${selectedRoomNumber})!\nTotal: ${formatCurrency(
        newBooking.totalAmount
      )} (auto-posted to room folio).`
    );

    setShowAddModal(false);
    setActiveTab('transfers');
  };

  const getStatusBadgeVariant = (
    status: ConciergeBooking['status']
  ): 'warning' | 'info' | 'success' | 'error' => {
    switch (status) {
      case 'scheduled':
        return 'warning';
      case 'in_transit':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Concierge & Heritage Tours"
        subtitle={selectedHotel.name}
        hotelBadge={`${metrics.activeDispatches} DISPATCHES`}
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Icon name="plus" size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>Book Excursion</Text>
          </TouchableOpacity>
        }
      />

      {/* TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('transfers')}
          style={[styles.tabItem, activeTab === 'transfers' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'transfers' && styles.tabItemTextActive,
            ]}
          >
            Transfers & Excursions ({conciergeBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('packages')}
          style={[styles.tabItem, activeTab === 'packages' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'packages' && styles.tabItemTextActive,
            ]}
          >
            Royal Tour Packages ({excursions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP STATUS CARDS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CONCIERGE REVENUE</Text>
            <Text style={styles.metricVal}>
              {formatCurrency(metrics.totalPipeline)}
            </Text>
            <Text style={styles.metricSub}>18% GST Accounted</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE TRANSITS</Text>
            <Text style={[styles.metricVal, { color: colors.accentBlue }]}>
              {metrics.activeDispatches}
            </Text>
            <Text style={styles.metricSub}>Chauffeurs on Road</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CONCLUDED</Text>
            <Text style={[styles.metricVal, { color: colors.success }]}>
              {metrics.completedToday}
            </Text>
            <Text style={styles.metricSub}>Completed Tours</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <Input
          placeholder="Search by guest, room, excursion or chauffeur..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="hotel"
          containerStyle={styles.searchBar}
        />

        {/* ======================================================== */}
        {/* TAB 1: TRANSFERS & EXCURSIONS LIST                       */}
        {/* ======================================================== */}
        {activeTab === 'transfers' && (
          <View>
            {/* Status Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {['ALL', 'scheduled', 'in_transit', 'completed'].map((st) => {
                const isActive = statusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter(st)}
                    style={[
                      styles.statusPill,
                      isActive && styles.statusPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isActive && styles.statusPillTextActive,
                      ]}
                    >
                      {st.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Booking Cards */}
            {filteredBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.bookingRefText}>{booking.bookingRef}</Text>
                    <Text style={styles.timeSlotText}>
                      {booking.pickupTime} • {booking.date}
                    </Text>
                  </View>
                  <View style={styles.badgeGroup}>
                    <Badge
                      label={booking.category.toUpperCase()}
                      variant="gold"
                      size="sm"
                    />
                    <Badge
                      label={booking.status.replace('_', ' ').toUpperCase()}
                      variant={getStatusBadgeVariant(booking.status)}
                      size="sm"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </View>

                {/* Room & Guest */}
                <View style={styles.roomGuestRow}>
                  <View style={styles.roomBadge}>
                    <Icon name="key" size={13} color={colors.primaryNavy} />
                    <Text style={styles.roomBadgeText}>Room {booking.roomNumber}</Text>
                  </View>
                  <Text style={styles.guestName}>
                    {booking.guestName} ({booking.numberOfGuests} Guests)
                  </Text>
                </View>

                {/* Service Title */}
                <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>

                {/* Chauffeur / Guide Row */}
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>ASSIGNED CHAUFFEUR / GUIDE</Text>
                    <Text style={styles.metaVal}>{booking.driverOrGuideName}</Text>
                  </View>
                  <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metaLabel}>VEHICLE / VESSEL</Text>
                    <Text style={styles.metaVal}>{booking.vehicleOrVesselNumber}</Text>
                  </View>
                </View>

                {/* Notes */}
                {booking.notes && (
                  <View style={styles.notesBox}>
                    <Icon
                      name="activity"
                      size={12}
                      color={colors.accentBlue}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.notesText}>{booking.notes}</Text>
                  </View>
                )}

                {/* Financials & Action Buttons */}
                <View style={styles.financialsRow}>
                  <View>
                    <Text style={styles.amountLabel}>TOTAL FOLIO FARE (18% GST)</Text>
                    <Text style={styles.amountVal}>
                      {formatCurrency(booking.totalAmount)}
                    </Text>
                  </View>

                  <View style={styles.actionBtns}>
                    {booking.status === 'scheduled' && (
                      <Button
                        title="Dispatch Transit"
                        variant="outline"
                        size="sm"
                        onPress={() =>
                          updateConciergeBookingStatus(booking.id, 'in_transit')
                        }
                      />
                    )}
                    {booking.status === 'in_transit' && (
                      <Button
                        title="Mark Concluded"
                        variant="primary"
                        size="sm"
                        icon="check"
                        onPress={() =>
                          updateConciergeBookingStatus(booking.id, 'completed')
                        }
                      />
                    )}
                    {booking.status === 'completed' && (
                      <Badge label="TOUR CONCLUDED" variant="success" size="sm" />
                    )}
                  </View>
                </View>

                <View style={styles.folioSyncRow}>
                  <Icon name="check-circle" size={12} color={colors.success} />
                  <Text style={styles.folioSyncText}>
                    Auto-posted to Room {booking.roomNumber} guest folio invoice
                  </Text>
                </View>
              </View>
            ))}

            {filteredBookings.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="hotel" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Dispatches Found</Text>
                <Text style={styles.emptySubtitle}>
                  No concierge transfers currently match your search filter.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TOUR PACKAGES CATALOG                             */}
        {/* ======================================================== */}
        {activeTab === 'packages' && (
          <View>
            {excursions.map((pkg) => (
              <View key={pkg.id} style={styles.pkgCard}>
                <View style={styles.pkgHeader}>
                  <Badge label={pkg.category} variant="gold" size="sm" />
                  <Text style={styles.pkgPrice}>
                    {formatCurrency(pkg.pricePerPerson)}
                    <Text style={styles.perPersonText}> / Person</Text>
                  </Text>
                </View>

                <Text style={styles.pkgTitle}>{pkg.title}</Text>
                <Text style={styles.pkgDuration}>Duration: {pkg.duration}</Text>
                <Text style={styles.pkgDesc}>{pkg.description}</Text>

                <View style={styles.highlightsWrap}>
                  {pkg.includedHighlights.map((hl, idx) => (
                    <View key={idx} style={styles.highlightPill}>
                      <Icon
                        name="check"
                        size={10}
                        color={colors.success}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.highlightText}>{hl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* BOOK EXCURSION MODAL */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch Royal Concierge</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedHotel.name} • Transport Desk
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeModalButton}
              >
                <Icon name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Room Picker */}
              <Text style={styles.formSectionLabel}>SELECT OCCUPIED ROOM</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomsPickerScroll}
              >
                {occupiedRooms.map((r) => {
                  const isSelected = selectedRoomNumber === r.roomNumber;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRoomNumber(r.roomNumber)}
                      style={[
                        styles.roomPickPill,
                        isSelected && styles.roomPickPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roomPickPillText,
                          isSelected && styles.roomPickPillTextActive,
                        ]}
                      >
                        Room {r.roomNumber}
                      </Text>
                      <Text
                        style={[
                          styles.roomPickPillGuest,
                          isSelected && styles.roomPickPillGuestActive,
                        ]}
                        numberOfLines={1}
                      >
                        {r.currentGuestName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Package Picker */}
              <Text style={styles.formSectionLabel}>SELECT EXCURSION / SERVICE</Text>
              <View style={styles.treatmentPickerWrap}>
                {excursions.map((e) => {
                  const isSelected = selectedExcursionId === e.id;
                  return (
                    <TouchableOpacity
                      key={e.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedExcursionId(e.id)}
                      style={[
                        styles.treatmentPickPill,
                        isSelected && styles.treatmentPickPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.treatmentPickText,
                          isSelected && styles.treatmentPickTextActive,
                        ]}
                      >
                        {e.title} ({formatCurrency(e.pricePerPerson)}/pax)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formRow}>
                <Input
                  label="Chauffeur / Guide Name"
                  value={driverGuideName}
                  onChangeText={setDriverGuideName}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Vehicle / Vessel Number"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              <View style={styles.formRow}>
                <Input
                  label="Pickup Time"
                  value={pickupTime}
                  onChangeText={setPickupTime}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Date (YYYY-MM-DD)"
                  value={pickupDate}
                  onChangeText={setPickupDate}
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              <Input
                label="Number of Guests"
                value={guestCountStr}
                onChangeText={setGuestCountStr}
                keyboardType="numeric"
              />

              <Input
                label="Special Concierge Instructions"
                placeholder="e.g. Scented towels, airport baggage assistance, camera guide"
                value={notes}
                onChangeText={setNotes}
              />

              {/* Live Fare Estimation */}
              {selectedExcursion && (
                <View style={styles.pricingSummaryBox}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      Base Fare ({parseInt(guestCountStr, 10) || 1} Pax @{' '}
                      {formatCurrency(selectedExcursion.pricePerPerson)})
                    </Text>
                    <Text style={styles.priceVal}>
                      {formatCurrency(
                        (parseInt(guestCountStr, 10) || 1) *
                          selectedExcursion.pricePerPerson
                      )}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>GST @ 18% (Transport & Tour)</Text>
                    <Text style={styles.priceVal}>
                      {formatCurrency(
                        Math.round(
                          (parseInt(guestCountStr, 10) || 1) *
                            selectedExcursion.pricePerPerson *
                            0.18
                        )
                      )}
                    </Text>
                  </View>
                  <View style={[styles.priceRow, styles.priceRowTotal]}>
                    <Text style={styles.totalPriceLabel}>TOTAL FOLIO FARE</Text>
                    <Text style={styles.totalPriceVal}>
                      {formatCurrency(
                        Math.round(
                          (parseInt(guestCountStr, 10) || 1) *
                            selectedExcursion.pricePerPerson *
                            1.18
                        )
                      )}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Confirm & Dispatch"
                  variant="primary"
                  onPress={handleCreateDispatch}
                  style={{ flex: 1.4, marginLeft: spacing.xs }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryNavy,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
  },
  tabItem: {
    paddingVertical: spacing.sm + 2,
    marginRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primaryNavy,
  },
  tabItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    fontSize: 9,
  },
  metricVal: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '800',
    marginTop: 2,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  searchBar: {
    marginBottom: spacing.sm,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statusPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  statusPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  statusPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bookingRefText: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  timeSlotText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomGuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  roomBadgeText: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginLeft: 4,
  },
  guestName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  serviceTitle: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  metaVal: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  notesText: {
    ...typography.caption,
    color: colors.primaryNavy,
    flex: 1,
  },
  financialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  amountVal: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  actionBtns: {
    alignItems: 'flex-end',
  },
  folioSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
  },
  folioSyncText: {
    ...typography.caption,
    color: colors.success,
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  pkgCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pkgPrice: {
    ...typography.h3,
    color: colors.accentBlue,
    fontWeight: '700',
  },
  perPersonText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  pkgTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  pkgDuration: {
    ...typography.caption,
    color: colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  pkgDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  highlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: spacing.xs,
    marginBottom: 4,
  },
  highlightText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.primaryNavy,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primaryNavy,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  closeModalButton: {
    padding: 6,
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roomsPickerScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  roomPickPill: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    minWidth: 100,
  },
  roomPickPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  roomPickPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  roomPickPillTextActive: {
    color: colors.surface,
  },
  roomPickPillGuest: {
    ...typography.overline,
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  roomPickPillGuestActive: {
    color: colors.goldLight,
  },
  treatmentPickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  treatmentPickPill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  treatmentPickPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  treatmentPickText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  treatmentPickTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
  },
  pricingSummaryBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  priceRowTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  priceVal: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalPriceLabel: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  totalPriceVal: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
