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
import { SpaBooking, SpaTreatment } from '../types/hotel';

export const AyurvedicSpaScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    spaBookings,
    spaTreatments,
    createSpaBooking,
    updateSpaBookingStatus,
    rooms,
    selectedHotel,
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'appointments' | 'catalog'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  // Book Session Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState(
    spaTreatments[0]?.id || ''
  );
  const [therapistName, setTherapistName] = useState('Dr. Suresh Nair (Ayurvedic Vaidya)');
  const [treatmentRoom, setTreatmentRoom] = useState('Ayurvedic Pavilion Lotus 1');
  const [timeSlot, setTimeSlot] = useState('05:30 PM');
  const [bookingDate, setBookingDate] = useState('2026-11-16');
  const [healthNotes, setHealthNotes] = useState(
    'Relaxation and Vata-Pitta balance with warm medicated oils'
  );

  // In-house guests eligible for spa bookings
  const occupiedRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'occupied' && r.currentGuestName);
  }, [rooms]);

  React.useEffect(() => {
    if (!selectedRoomNumber && occupiedRooms.length > 0) {
      setSelectedRoomNumber(occupiedRooms[0].roomNumber);
    }
  }, [occupiedRooms, selectedRoomNumber]);

  // Selected treatment object for pricing calculation in modal
  const selectedTreatment = useMemo(() => {
    return spaTreatments.find((t) => t.id === selectedTreatmentId) || spaTreatments[0];
  }, [spaTreatments, selectedTreatmentId]);

  // Top Metrics
  const metrics = useMemo(() => {
    const totalRevenue = spaBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const activeSessions = spaBookings.filter((b) => b.status !== 'completed').length;
    const completedSessions = spaBookings.filter((b) => b.status === 'completed').length;

    return { totalRevenue, activeSessions, completedSessions };
  }, [spaBookings]);

  // Filtered Appointments
  const filteredBookings = useMemo(() => {
    return spaBookings.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        b.bookingRef.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.roomNumber.toLowerCase().includes(q) ||
        b.treatmentName.toLowerCase().includes(q) ||
        b.therapistName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [spaBookings, searchQuery, statusFilter]);

  // Filtered Catalog
  const categories = [
    'ALL',
    'Ayurvedic Therapy',
    'Royal Body Polish',
    'Facial & Glow',
    'Yoga & Meditation',
  ];

  const filteredCatalog = useMemo(() => {
    return spaTreatments.filter((t) => {
      const matchesCat = catalogCategory === 'ALL' || t.category === catalogCategory;
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.herbalIngredients.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [spaTreatments, catalogCategory, searchQuery]);

  // Handle Book Session
  const handleBookSession = async () => {
    if (!selectedRoomNumber) {
      Alert.alert('No Room Selected', 'Please select an occupied suite.');
      return;
    }
    if (!selectedTreatment) {
      Alert.alert('No Treatment Selected', 'Please choose a spa therapy.');
      return;
    }

    const targetRoom = occupiedRooms.find((r) => r.roomNumber === selectedRoomNumber);
    const guestName = targetRoom?.currentGuestName || 'Valued Guest';

    const newBooking = await createSpaBooking({
      hotelId: selectedHotel.id,
      roomNumber: selectedRoomNumber,
      guestName,
      treatmentName: selectedTreatment.name,
      therapistName: therapistName.trim(),
      treatmentRoom: treatmentRoom.trim(),
      timeSlot,
      date: bookingDate,
      price: selectedTreatment.price,
      status: 'scheduled',
      healthNotes: healthNotes.trim() || undefined,
    });

    Alert.alert(
      'Ayurvedic Therapy Reserved',
      `Session ${newBooking.bookingRef} booked for ${guestName} (Room ${selectedRoomNumber})!\nTotal: ${formatCurrency(
        newBooking.totalAmount
      )} (auto-posted to room folio).`
    );

    setShowAddModal(false);
    setActiveTab('appointments');
  };

  const getStatusBadgeVariant = (
    status: SpaBooking['status']
  ): 'warning' | 'gold' | 'success' | 'error' => {
    switch (status) {
      case 'scheduled':
        return 'warning';
      case 'in_session':
        return 'gold';
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
        title="Ayurvedic Spa & Wellness"
        subtitle={selectedHotel.name}
        hotelBadge={`${metrics.activeSessions} SESSIONS ACTIVE`}
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Icon name="plus" size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>Book Session</Text>
          </TouchableOpacity>
        }
      />

      {/* TABS SELECTOR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('appointments')}
          style={[
            styles.tabItem,
            activeTab === 'appointments' && styles.tabItemActive,
          ]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'appointments' && styles.tabItemTextActive,
            ]}
          >
            Therapy Sessions ({spaBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('catalog')}
          style={[styles.tabItem, activeTab === 'catalog' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'catalog' && styles.tabItemTextActive,
            ]}
          >
            Ayurvedic Catalog ({spaTreatments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP REVENUE & SESSION METRICS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL SPA REVENUE</Text>
            <Text style={styles.metricVal}>
              {formatCurrency(metrics.totalRevenue)}
            </Text>
            <Text style={styles.metricSub}>18% GST Included</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE SESSIONS</Text>
            <Text style={[styles.metricVal, { color: colors.warning }]}>
              {metrics.activeSessions}
            </Text>
            <Text style={styles.metricSub}>Vaidyas in Pavilion</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>COMPLETED</Text>
            <Text style={[styles.metricVal, { color: colors.success }]}>
              {metrics.completedSessions}
            </Text>
            <Text style={styles.metricSub}>Rejuvenated Today</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <Input
          placeholder="Search by guest, room, therapy or Vaidya..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="shield"
          containerStyle={styles.searchBar}
        />

        {/* ======================================================== */}
        {/* TAB 1: APPOINTMENTS & SESSIONS LIST                      */}
        {/* ======================================================== */}
        {activeTab === 'appointments' && (
          <View>
            {/* Status Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {['ALL', 'scheduled', 'in_session', 'completed'].map((st) => {
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

            {/* Sessions Cards */}
            {filteredBookings.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.bookingRefText}>{session.bookingRef}</Text>
                    <Text style={styles.timeSlotText}>
                      {session.timeSlot} • {session.date}
                    </Text>
                  </View>
                  <Badge
                    label={session.status.replace('_', ' ').toUpperCase()}
                    variant={getStatusBadgeVariant(session.status)}
                    size="sm"
                  />
                </View>

                {/* Room & Guest */}
                <View style={styles.roomGuestRow}>
                  <View style={styles.roomBadge}>
                    <Icon name="key" size={13} color={colors.primaryNavy} />
                    <Text style={styles.roomBadgeText}>Room {session.roomNumber}</Text>
                  </View>
                  <Text style={styles.guestName}>{session.guestName}</Text>
                </View>

                {/* Therapy Title */}
                <Text style={styles.therapyTitle}>{session.treatmentName}</Text>

                {/* Therapist & Pavilion */}
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>VAIDYA / THERAPIST</Text>
                    <Text style={styles.metaVal}>{session.therapistName}</Text>
                  </View>
                  <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metaLabel}>TREATMENT PAVILION</Text>
                    <Text style={styles.metaVal}>{session.treatmentRoom}</Text>
                  </View>
                </View>

                {/* Health / Dosha Note */}
                {session.healthNotes && (
                  <View style={styles.healthNotesBox}>
                    <Icon
                      name="activity"
                      size={12}
                      color={colors.goldDark}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.healthNotesText}>
                      Dosha Care: {session.healthNotes}
                    </Text>
                  </View>
                )}

                {/* Financials & Folio Indicator */}
                <View style={styles.financialsRow}>
                  <View>
                    <Text style={styles.amountLabel}>FOLIO CHARGE (INCL. 18% GST)</Text>
                    <Text style={styles.amountVal}>
                      {formatCurrency(session.totalAmount)}
                    </Text>
                  </View>

                  <View style={styles.actionBtns}>
                    {session.status === 'scheduled' && (
                      <Button
                        title="Commence Therapy"
                        variant="outline"
                        size="sm"
                        onPress={() =>
                          updateSpaBookingStatus(session.id, 'in_session')
                        }
                      />
                    )}
                    {session.status === 'in_session' && (
                      <Button
                        title="Mark Concluded"
                        variant="primary"
                        size="sm"
                        icon="check"
                        onPress={() =>
                          updateSpaBookingStatus(session.id, 'completed')
                        }
                      />
                    )}
                    {session.status === 'completed' && (
                      <Badge label="SESSION CONCLUDED" variant="success" size="sm" />
                    )}
                  </View>
                </View>

                <View style={styles.folioSyncRow}>
                  <Icon name="check-circle" size={12} color={colors.success} />
                  <Text style={styles.folioSyncText}>
                    Auto-posted to Room {session.roomNumber} folio under Ayurvedic Spa
                  </Text>
                </View>
              </View>
            ))}

            {filteredBookings.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="shield" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Spa Sessions Found</Text>
                <Text style={styles.emptySubtitle}>
                  No wellness sessions currently match your filter.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AYURVEDIC THERAPY CATALOG                         */}
        {/* ======================================================== */}
        {activeTab === 'catalog' && (
          <View>
            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {categories.map((c) => {
                const isActive = catalogCategory === c;
                return (
                  <TouchableOpacity
                    key={c}
                    activeOpacity={0.7}
                    onPress={() => setCatalogCategory(c)}
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
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Catalog Cards */}
            {filteredCatalog.map((therapy) => (
              <View key={therapy.id} style={styles.therapyCatalogCard}>
                <View style={styles.catalogCardHeader}>
                  <Badge label={therapy.category} variant="gold" size="sm" />
                  <Text style={styles.therapyPrice}>
                    {formatCurrency(therapy.price)}{' '}
                    <Text style={styles.durationText}>
                      ({therapy.durationMinutes} Mins)
                    </Text>
                  </Text>
                </View>

                <Text style={styles.catalogTherapyName}>{therapy.name}</Text>
                <Text style={styles.catalogTherapyDesc}>
                  {therapy.description}
                </Text>

                <View style={styles.ingredientsBox}>
                  <Text style={styles.ingredientsLabel}>MEDICATED HERBS:</Text>
                  <Text style={styles.ingredientsText}>
                    {therapy.herbalIngredients}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* BOOK SPA SESSION MODAL */}
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
                <Text style={styles.modalTitle}>Book Ayurvedic Therapy</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedHotel.name} • Wellness Sanctuary
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
              <Text style={styles.formSectionLabel}>SELECT OCCUPIED SUITE / ROOM</Text>
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

              {/* Treatment Picker */}
              <Text style={styles.formSectionLabel}>SELECT AYURVEDIC THERAPY</Text>
              <View style={styles.treatmentPickerWrap}>
                {spaTreatments.map((t) => {
                  const isSelected = selectedTreatmentId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedTreatmentId(t.id)}
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
                        {t.name} ({formatCurrency(t.price)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formRow}>
                <Input
                  label="Vaidya / Therapist"
                  value={therapistName}
                  onChangeText={setTherapistName}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Treatment Pavilion"
                  value={treatmentRoom}
                  onChangeText={setTreatmentRoom}
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              <View style={styles.formRow}>
                <Input
                  label="Appointment Time"
                  value={timeSlot}
                  onChangeText={setTimeSlot}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Date (YYYY-MM-DD)"
                  value={bookingDate}
                  onChangeText={setBookingDate}
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              <Input
                label="Dosha & Health Instructions"
                placeholder="e.g. Vata calming medicated oil, medium pressure"
                value={healthNotes}
                onChangeText={setHealthNotes}
              />

              {/* Pricing Box */}
              {selectedTreatment && (
                <View style={styles.pricingSummaryBox}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Therapy Price</Text>
                    <Text style={styles.priceVal}>
                      {formatCurrency(selectedTreatment.price)}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      GST @ 18% (CGST 9% + SGST 9%)
                    </Text>
                    <Text style={styles.priceVal}>
                      {formatCurrency(Math.round(selectedTreatment.price * 0.18))}
                    </Text>
                  </View>
                  <View style={[styles.priceRow, styles.priceRowTotal]}>
                    <Text style={styles.totalPriceLabel}>TOTAL FOLIO CHARGE</Text>
                    <Text style={styles.totalPriceVal}>
                      {formatCurrency(Math.round(selectedTreatment.price * 1.18))}
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
                  title="Confirm & Post to Folio"
                  variant="primary"
                  onPress={handleBookSession}
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
  sessionCard: {
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
  therapyTitle: {
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
  healthNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  healthNotesText: {
    ...typography.caption,
    color: colors.goldDark,
    fontWeight: '600',
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
  therapyCatalogCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  catalogCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  therapyPrice: {
    ...typography.h3,
    color: colors.accentBlue,
    fontWeight: '700',
  },
  durationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  catalogTherapyName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  catalogTherapyDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ingredientsBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.sm,
    padding: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  ingredientsLabel: {
    ...typography.overline,
    color: colors.primaryNavy,
    fontSize: 9,
  },
  ingredientsText: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '600',
    marginTop: 1,
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
