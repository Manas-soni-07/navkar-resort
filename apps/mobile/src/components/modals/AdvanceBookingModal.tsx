import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useHotel } from '../../hooks/useHotel';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface AdvanceBookingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdvanceBookingModal: React.FC<AdvanceBookingModalProps> = ({
  visible,
  onClose,
}) => {
  const { advanceBookings, advanceBookingSummary, createBooking, cancelBooking, selectedHotel } =
    useHotel();

  const [showAddForm, setShowAddForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [nights, setNights] = useState('3');

  const handleCreateNewBooking = () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter guest full name.');
      return;
    }

    const nightsNum = parseInt(nights, 10) || 3;
    const rate = 14500;
    const totalAmount = nightsNum * rate;

    createBooking({
      hotelId: selectedHotel.id,
      guestName: guestName.trim(),
      guestPhone: '+91 98201 11223',
      guestEmail: `${guestName.toLowerCase().replace(/\s+/g, '.')}@guest.in`,
      roomCategory: 'Deluxe Lake View Suite',
      checkInDate: '2026-11-20',
      checkOutDate: '2026-11-23',
      nightsCount: nightsNum,
      numberOfGuests: 2,
      status: 'confirmed',
      totalAmount,
      depositPaid: Math.round(totalAmount * 0.5),
      paymentStatus: 'partial',
      specialRequests: 'Mobile express advance booking reservation',
    });

    setGuestName('');
    setShowAddForm(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="calendar" size={20} color={colors.accentBlue} />
            </View>
            <View>
              <Text style={styles.title}>Advance Bookings</Text>
              <Text style={styles.subtitle}>{selectedHotel.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="x" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Financial KPI Banner */}
        <View style={styles.bannerRow}>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerValue}>{advanceBookingSummary.upcomingCount}</Text>
            <Text style={styles.bannerLabel}>Upcoming Pipeline</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerValue, { color: colors.success }]}>
              {advanceBookingSummary.confirmedRevenue}
            </Text>
            <Text style={styles.bannerLabel}>Confirmed Value</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={styles.bannerValue}>
              {advanceBookingSummary.next7DaysArrivals}
            </Text>
            <Text style={styles.bannerLabel}>Next 7 Days</Text>
          </View>
        </View>

        {/* Toggle Form / List */}
        <View style={styles.actionHeader}>
          <Text style={styles.sectionTitle}>RESERVATIONS PIPELINE</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAddForm((prev) => !prev)}
            style={styles.toggleButton}
          >
            <Icon
              name={showAddForm ? 'x' : 'plus'}
              size={14}
              color={colors.accentBlue}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.toggleText}>
              {showAddForm ? 'Cancel' : 'New Booking'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Booking Creation Form */}
        {showAddForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Quick Reservation Entry</Text>
            <Input
              label="Guest Full Name"
              placeholder="e.g. Charlotte Dubois"
              value={guestName}
              onChangeText={setGuestName}
            />
            <Input
              label="Nights Count"
              placeholder="3"
              keyboardType="numeric"
              value={nights}
              onChangeText={setNights}
            />
            <Button
              title="Confirm & Save Reservation"
              variant="primary"
              size="md"
              onPress={handleCreateNewBooking}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        )}

        {/* Bookings List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {advanceBookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <View style={styles.bookingLeft}>
                  <Text style={styles.guestName}>{b.guestName}</Text>
                  <Text style={styles.refText}>
                    {b.bookingReference} • {b.roomCategory}
                  </Text>
                </View>
                <Badge
                  label={b.paymentStatus.toUpperCase()}
                  variant={b.paymentStatus === 'paid' ? 'success' : 'warning'}
                  size="sm"
                />
              </View>

              <View style={styles.datesRow}>
                <Icon name="clock" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.datesText}>
                  {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)} ({b.nightsCount} Nights)
                </Text>
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.amountText}>
                  Value: {formatCurrency(b.totalAmount)} • Deposit: {formatCurrency(b.depositPaid)}
                </Text>
                <TouchableOpacity
                  onPress={() => cancelBooking(b.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Close" variant="secondary" onPress={onClose} fullWidth />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.primaryNavy,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bannerStat: {
    alignItems: 'center',
  },
  bannerValue: {
    ...typography.h3,
    color: colors.primaryNavy,
  },
  bannerLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bannerDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryTint,
  },
  toggleText: {
    ...typography.captionBold,
    color: colors.accentBlue,
  },
  formContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    ...shadows.sm,
  },
  formTitle: {
    ...typography.bodySemiBold,
    color: colors.primaryNavy,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  guestName: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  refText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  datesText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  amountText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  cancelText: {
    ...typography.captionBold,
    color: colors.error,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
