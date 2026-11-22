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
import { BanquetEvent, BanquetEventType } from '../types/hotel';

export const BanquetEventsScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    banquets,
    createBanquet,
    updateBanquetStatus,
    selectedHotel,
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Add Banquet Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<BanquetEventType>('Destination Wedding');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+91 ');
  const [venueName, setVenueName] = useState('Maharana Grand Ballroom & Royal Lawns');
  const [eventDate, setEventDate] = useState('2026-11-25');
  const [guestCountStr, setGuestCountStr] = useState('350');
  const [perPlateRateStr, setPerPlateRateStr] = useState('2800');
  const [cateringType, setCateringType] = useState<
    'Pure Vegetarian Jain' | 'Royal Mewari Buffet' | 'Multi-Cuisine Grand Feast'
  >('Royal Mewari Buffet');
  const [decorPackage, setDecorPackage] = useState(
    'Royal Marigold & Mandap Theme with Grand Shehnai stage'
  );
  const [depositStr, setDepositStr] = useState('300000');

  const eventTypes: BanquetEventType[] = [
    'Destination Wedding',
    'Sangeet & Reception',
    'Corporate Conclave',
    'Royal Anniversary Gala',
    'Sundowner Pool Party',
  ];

  const cateringOptions: Array<
    'Pure Vegetarian Jain' | 'Royal Mewari Buffet' | 'Multi-Cuisine Grand Feast'
  > = [
    'Royal Mewari Buffet',
    'Pure Vegetarian Jain',
    'Multi-Cuisine Grand Feast',
  ];

  // Computed Totals for Top Metrics
  const metrics = useMemo(() => {
    const totalPipelineRevenue = banquets.reduce((acc, b) => acc + b.totalAmount, 0);
    const totalAdvanceReceived = banquets.reduce((acc, b) => acc + b.depositPaid, 0);
    const totalGuests = banquets.reduce((acc, b) => acc + b.guestCount, 0);
    const confirmedCount = banquets.filter((b) => b.status === 'confirmed').length;

    return {
      totalPipelineRevenue,
      totalAdvanceReceived,
      totalGuests,
      confirmedCount,
    };
  }, [banquets]);

  // Filtered banquets
  const filteredBanquets = useMemo(() => {
    return banquets.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        b.eventName.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.venueName.toLowerCase().includes(q) ||
        b.decorPackage.toLowerCase().includes(q);

      const matchesType =
        selectedTypeFilter === 'ALL' || b.eventType === selectedTypeFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' || b.status === selectedStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [banquets, searchQuery, selectedTypeFilter, selectedStatusFilter]);

  // Handle Add Banquet Submission
  const handleCreateBanquet = () => {
    if (!eventName.trim() || !clientName.trim() || !venueName.trim()) {
      Alert.alert('Incomplete Details', 'Please provide event name, client name, and venue.');
      return;
    }

    const guestCount = parseInt(guestCountStr, 10) || 100;
    const perPlateRate = parseFloat(perPlateRateStr) || 2000;
    const totalAmount = guestCount * perPlateRate;
    const depositPaid = parseFloat(depositStr) || 0;

    createBanquet({
      hotelId: selectedHotel.id,
      eventName: eventName.trim(),
      eventType,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      venueName: venueName.trim(),
      eventDate,
      guestCount,
      perPlateRate,
      cateringType,
      totalAmount,
      depositPaid,
      status: 'confirmed',
      decorPackage: decorPackage.trim(),
    });

    Alert.alert(
      'Banquet Reserved',
      `Event "${eventName}" confirmed! Total: ${formatCurrency(totalAmount)}`
    );

    // Reset Form
    setEventName('');
    setClientName('');
    setClientPhone('+91 ');
    setShowAddModal(false);
  };

  const getStatusBadgeVariant = (
    status: BanquetEvent['status']
  ): 'success' | 'warning' | 'info' | 'error' => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Banquets & Weddings"
        subtitle={selectedHotel.name}
        hotelBadge={`${metrics.confirmedCount} CONFIRMED`}
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Icon name="plus" size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>Add Event</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* EXECUTIVE REVENUE & GUEST PACK TILES */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL BANQUET PIPELINE</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(metrics.totalPipelineRevenue)}
            </Text>
            <Text style={styles.metricSub}>
              Advance: {formatCurrency(metrics.totalAdvanceReceived)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ESTIMATED GUESTS</Text>
            <Text style={styles.metricValue}>
              {metrics.totalGuests.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricSub}>Across {banquets.length} booked galas</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <Input
          placeholder="Search by wedding, host, venue or decor..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="hotel"
          containerStyle={styles.searchBar}
        />

        {/* EVENT TYPE FILTER PILLS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>EVENT OCCASION:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedTypeFilter('ALL')}
              style={[
                styles.filterPill,
                selectedTypeFilter === 'ALL' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedTypeFilter === 'ALL' && styles.filterPillTextActive,
                ]}
              >
                All Occasions ({banquets.length})
              </Text>
            </TouchableOpacity>

            {eventTypes.map((t) => {
              const count = banquets.filter((b) => b.eventType === t).length;
              const isActive = selectedTypeFilter === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTypeFilter(t)}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {t} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* BANQUET EVENT CARDS */}
        <View style={styles.cardsContainer}>
          {filteredBanquets.map((event) => {
            const balanceDue = Math.max(0, event.totalAmount - event.depositPaid);
            return (
              <View key={event.id} style={styles.eventCard}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={event.eventType.toUpperCase()}
                      variant="gold"
                      size="sm"
                    />
                    <Badge
                      label={event.status.replace('_', ' ').toUpperCase()}
                      variant={getStatusBadgeVariant(event.status)}
                      size="sm"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                  <Text style={styles.eventDateText}>{event.eventDate}</Text>
                </View>

                {/* Event Name & Venue */}
                <Text style={styles.eventName}>{event.eventName}</Text>
                <View style={styles.venueRow}>
                  <Icon name="hotel" size={14} color={colors.accentBlue} />
                  <Text style={styles.venueText}>{event.venueName}</Text>
                </View>

                {/* Host Details */}
                <View style={styles.hostRow}>
                  <Icon name="user" size={13} color={colors.textSecondary} />
                  <Text style={styles.hostText}>
                    Host: {event.clientName} ({event.clientPhone})
                  </Text>
                </View>

                {/* Key Spec Grid */}
                <View style={styles.specsGrid}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>GUESTS</Text>
                    <Text style={styles.specValue}>{event.guestCount} Pax</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>PER PLATE</Text>
                    <Text style={styles.specValue}>
                      {formatCurrency(event.perPlateRate)}
                    </Text>
                  </View>
                  <View style={[styles.specItem, { flex: 1.4 }]}>
                    <Text style={styles.specLabel}>CATERING SPREAD</Text>
                    <Text style={styles.specValue} numberOfLines={1}>
                      {event.cateringType}
                    </Text>
                  </View>
                </View>

                {/* Decor Package Box */}
                <View style={styles.decorBox}>
                  <Icon
                    name="activity"
                    size={13}
                    color={colors.goldDark}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.decorText} numberOfLines={2}>
                    Decor: {event.decorPackage}
                  </Text>
                </View>

                {/* Financials & Status Mutations */}
                <View style={styles.financialsRow}>
                  <View>
                    <Text style={styles.totalValueLabel}>TOTAL CONTRACT</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(event.totalAmount)}
                    </Text>
                    <Text style={styles.balanceText}>
                      Deposit: {formatCurrency(event.depositPaid)} • Due:{' '}
                      {formatCurrency(balanceDue)}
                    </Text>
                  </View>

                  <View style={styles.actionsContainer}>
                    {event.status === 'confirmed' && (
                      <Button
                        title="Start Setup"
                        variant="outline"
                        size="sm"
                        icon="activity"
                        onPress={() => updateBanquetStatus(event.id, 'in_progress')}
                      />
                    )}
                    {event.status === 'in_progress' && (
                      <Button
                        title="Complete Gala"
                        variant="primary"
                        size="sm"
                        icon="check"
                        onPress={() => updateBanquetStatus(event.id, 'completed')}
                      />
                    )}
                    {event.status === 'completed' && (
                      <Badge label="GALA CONCLUDED" variant="info" size="sm" />
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {filteredBanquets.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="hotel" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Banquets Found</Text>
              <Text style={styles.emptySubtitle}>
                No events match your current search query or filter.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CREATE BANQUET EVENT MODAL */}
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
                <Text style={styles.modalTitle}>Reserve Banquet / Wedding</Text>
                <Text style={styles.modalSubtitle}>{selectedHotel.name}</Text>
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
              <Input
                label="Event Name"
                placeholder="e.g. Royal Singhania Destination Wedding"
                value={eventName}
                onChangeText={setEventName}
              />

              {/* Event Type Picker */}
              <Text style={styles.formSectionLabel}>OCCASION CATEGORY</Text>
              <View style={styles.modalPillsWrap}>
                {eventTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.7}
                    onPress={() => setEventType(t)}
                    style={[
                      styles.modalOptionPill,
                      eventType === t && styles.modalOptionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        eventType === t && styles.modalOptionTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formRow}>
                <Input
                  label="Host / Client Name"
                  placeholder="e.g. Vikramaditya Rathore"
                  value={clientName}
                  onChangeText={setClientName}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Contact Phone"
                  placeholder="+91 98200 12345"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  keyboardType="phone-pad"
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              <Input
                label="Venue Lawn / Ballroom"
                placeholder="e.g. Maharana Grand Ballroom & Royal Lawns"
                value={venueName}
                onChangeText={setVenueName}
              />

              <Input
                label="Event Date (YYYY-MM-DD)"
                placeholder="2026-11-25"
                value={eventDate}
                onChangeText={setEventDate}
              />

              <View style={styles.formRow}>
                <Input
                  label="Guest Pack (Pax)"
                  placeholder="350"
                  value={guestCountStr}
                  onChangeText={setGuestCountStr}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Per Plate Rate (₹)"
                  placeholder="2800"
                  value={perPlateRateStr}
                  onChangeText={setPerPlateRateStr}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              {/* Dynamic Rate Calculator Notice */}
              <View style={styles.calculatorBox}>
                <Text style={styles.calcLabel}>ESTIMATED CONTRACT TOTAL:</Text>
                <Text style={styles.calcTotal}>
                  {formatCurrency(
                    (parseInt(guestCountStr, 10) || 0) *
                      (parseFloat(perPlateRateStr) || 0)
                  )}
                </Text>
              </View>

              {/* Catering Type Selection */}
              <Text style={styles.formSectionLabel}>CATERING MANDATE</Text>
              <View style={styles.modalPillsWrap}>
                {cateringOptions.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.7}
                    onPress={() => setCateringType(cat)}
                    style={[
                      styles.modalOptionPill,
                      cateringType === cat && styles.modalOptionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        cateringType === cat && styles.modalOptionTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Mandap & Decor Theme"
                placeholder="e.g. Royal Marigold & Mandap Theme with Shehnai"
                value={decorPackage}
                onChangeText={setDecorPackage}
              />

              <Input
                label="Advance Booking Deposit (₹)"
                placeholder="300000"
                value={depositStr}
                onChangeText={setDepositStr}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Confirm Booking"
                  variant="primary"
                  onPress={handleCreateBanquet}
                  style={{ flex: 1, marginLeft: spacing.xs }}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    ...shadows.sm,
  },
  metricLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  metricSub: {
    ...typography.caption,
    color: colors.success,
    marginTop: 2,
    fontWeight: '600',
  },
  searchBar: {
    marginBottom: spacing.sm,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  cardsContainer: {
    marginTop: spacing.xs,
  },
  eventCard: {
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
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  eventName: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  venueText: {
    ...typography.bodySmall,
    color: colors.accentBlue,
    fontWeight: '600',
    marginLeft: 6,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hostText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  specsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  specValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  decorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  decorText: {
    ...typography.caption,
    color: colors.goldDark,
    fontWeight: '600',
    flex: 1,
  },
  financialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalValueLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  balanceText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  actionsContainer: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: spacing.lg,
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
  modalPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  modalOptionPill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalOptionPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  modalOptionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalOptionTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
  },
  calculatorBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    alignItems: 'center',
  },
  calcLabel: {
    ...typography.overline,
    color: colors.primaryNavy,
  },
  calcTotal: {
    ...typography.h2,
    color: colors.primaryNavy,
    fontWeight: '800',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
