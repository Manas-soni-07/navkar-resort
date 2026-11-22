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
import { useHotel } from '../../hooks/useHotel';
import { formatCurrency } from '../../utils/formatters';

interface CheckInRoomsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CheckInRoomsModal: React.FC<CheckInRoomsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    todayArrivals,
    availableRooms,
    checkInGuest,
    checkOutGuest,
    selectedHotel,
  } = useHotel();

  const [selectedArrivalId, setSelectedArrivalId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleProcessCheckIn = async (bookingId: string) => {
    // If room already assigned or user picked one
    const arrival = todayArrivals.find((a) => a.id === bookingId);
    if (!arrival) return;

    let targetRoomId = arrival.roomId || selectedRoomId;
    if (!targetRoomId && availableRooms.length > 0) {
      targetRoomId = availableRooms[0].id;
    }

    if (!targetRoomId) {
      Alert.alert('No Available Rooms', 'There are no vacant clean rooms ready for assignment.');
      return;
    }

    const success = await checkInGuest(bookingId, targetRoomId);
    if (success) {
      setSelectedArrivalId(null);
      setSelectedRoomId(null);
    }
  };

  const handleProcessCheckOut = async (bookingId: string) => {
    await checkOutGuest(bookingId);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="key" size={20} color={colors.accentBlue} />
            </View>
            <View>
              <Text style={styles.title}>Check-in & Room Flow</Text>
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

        {/* Status Tracker Bar */}
        <View style={styles.counterBar}>
          <View style={styles.counterItem}>
            <Text style={styles.counterValue}>{todayArrivals.length}</Text>
            <Text style={styles.counterLabel}>Total Arrivals</Text>
          </View>
          <View style={styles.counterDivider} />
          <View style={styles.counterItem}>
            <Text style={[styles.counterValue, { color: colors.success }]}>
              {availableRooms.length}
            </Text>
            <Text style={styles.counterLabel}>Vacant Clean</Text>
          </View>
          <View style={styles.counterDivider} />
          <View style={styles.counterItem}>
            <Text style={[styles.counterValue, { color: colors.accentBlue }]}>
              {todayArrivals.filter((a) => a.status === 'checked_in').length}
            </Text>
            <Text style={styles.counterLabel}>Checked In</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeaderTitle}>
            SCHEDULED GUEST ARRIVALS & IN-HOUSE ROOMS
          </Text>

          {todayArrivals.map((arrival) => {
            const isCheckedIn = arrival.status === 'checked_in';

            return (
              <View key={arrival.id} style={styles.arrivalCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.guestInfoCol}>
                    <Text style={styles.guestName}>{arrival.guestName}</Text>
                    <Text style={styles.bookingRef}>
                      {arrival.bookingReference} • {arrival.roomCategory}
                    </Text>
                    <Text style={styles.stayDates}>
                      Stay: {arrival.nightsCount} Nights ({arrival.checkInDate} to {arrival.checkOutDate})
                    </Text>
                    {arrival.roomNumber && (
                      <Text style={styles.assignedRoomText}>
                        Assigned Room: Room {arrival.roomNumber}
                      </Text>
                    )}
                  </View>

                  <Badge
                    label={isCheckedIn ? 'IN HOUSE' : 'ARRIVAL DUE'}
                    variant={isCheckedIn ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                {arrival.specialRequests && (
                  <View style={styles.requestBox}>
                    <Icon name="info" size={13} color={colors.accentBlue} style={{ marginRight: 6 }} />
                    <Text style={styles.requestText} numberOfLines={2}>
                      {arrival.specialRequests}
                    </Text>
                  </View>
                )}

                <View style={styles.cardActionsRow}>
                  <Text style={styles.totalDue}>
                    Folio: {formatCurrency(arrival.totalAmount)} ({arrival.paymentStatus.toUpperCase()})
                  </Text>

                  {!isCheckedIn ? (
                    <Button
                      title="Process Check-In"
                      variant="primary"
                      size="sm"
                      icon="key"
                      onPress={() => handleProcessCheckIn(arrival.id)}
                    />
                  ) : (
                    <Button
                      title="Checkout & Release"
                      variant="outline"
                      size="sm"
                      icon="log-out"
                      onPress={() => handleProcessCheckOut(arrival.id)}
                    />
                  )}
                </View>
              </View>
            );
          })}

          {todayArrivals.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="check-circle" size={36} color={colors.success} />
              <Text style={styles.emptyTitle}>All Arrivals Processed</Text>
              <Text style={styles.emptySubtitle}>
                No pending arrivals remaining for this property today.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Done" variant="secondary" onPress={onClose} fullWidth />
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
  counterBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  counterItem: {
    alignItems: 'center',
  },
  counterValue: {
    ...typography.h3,
    color: colors.primaryNavy,
  },
  counterLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counterDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  sectionHeaderTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  arrivalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guestInfoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  guestName: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  bookingRef: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stayDates: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  assignedRoomText: {
    ...typography.captionBold,
    color: colors.accentBlue,
    marginTop: 3,
  },
  requestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.xs,
    padding: spacing.xs,
    marginTop: spacing.sm,
  },
  requestText: {
    ...typography.caption,
    color: colors.accentBlue,
    fontSize: 11,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  totalDue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
