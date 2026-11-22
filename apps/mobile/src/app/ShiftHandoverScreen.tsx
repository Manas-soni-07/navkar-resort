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
import { ShiftHandover } from '../types/hotel';

export const ShiftHandoverScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    shiftHandovers,
    createShiftHandover,
    folios,
    staff,
    bookings,
    selectedHotel,
  } = useHotel();

  const [showAddModal, setShowAddModal] = useState(false);
  const [outgoingManager, setOutgoingManager] = useState('Vikramaditya Rathore');
  const [incomingManager, setIncomingManager] = useState('Sunita Sharma');
  const [shiftFrom, setShiftFrom] = useState<'Morning' | 'Afternoon' | 'Night'>('Morning');
  const [shiftTo, setShiftTo] = useState<'Morning' | 'Afternoon' | 'Night'>('Afternoon');
  const [cashCollectedStr, setCashCollectedStr] = useState('48500');
  const [handoverNotes, setHandoverNotes] = useState(
    'Room 104 emergency backup keycard issued; Chiller unit inspection ongoing; Singhania VIP Shirodhara at 6:00 PM.'
  );

  const shifts: Array<'Morning' | 'Afternoon' | 'Night'> = ['Morning', 'Afternoon', 'Night'];

  // Real-time metrics
  const activeMetrics = useMemo(() => {
    const settledFolios = folios.filter((f) => f.status === 'settled');
    const upiFolios = settledFolios.filter((f) => f.paymentMethod === 'UPI');
    const totalUpiAmount = upiFolios.reduce((sum, f) => sum + f.totalAmount, 0);

    const activeInHouseVips = bookings
      .filter((b) => b.status === 'checked_in')
      .slice(0, 3)
      .map((b) => `${b.guestName} (${b.roomCategory})`);

    const presentStaffCount = staff.filter((s) => s.status === 'present').length;

    return {
      settledFoliosCount: settledFolios.length,
      upiCount: upiFolios.length,
      totalUpiAmount,
      activeInHouseVips,
      presentStaffCount,
    };
  }, [folios, bookings, staff]);

  // Handle Handover Submission
  const handleCreateHandover = () => {
    if (!outgoingManager.trim() || !incomingManager.trim()) {
      Alert.alert('Incomplete Fields', 'Please specify both outgoing and incoming manager names.');
      return;
    }

    const cash = parseFloat(cashCollectedStr) || 0;

    createShiftHandover({
      hotelId: selectedHotel.id,
      outgoingManagerName: outgoingManager.trim(),
      incomingManagerName: incomingManager.trim(),
      shiftFrom,
      shiftTo,
      frontDeskCashCollected: cash,
      upiSettlementsCount: activeMetrics.upiCount,
      upiSettlementsAmount: activeMetrics.totalUpiAmount,
      pendingGuestRequestsCount: 2,
      vipGuestsInHouse: activeMetrics.activeInHouseVips,
      keyHandoversNotes: handoverNotes.trim(),
      status: 'completed',
    });

    Alert.alert(
      'Shift Handover Logged',
      `Audit ledger updated! Handover from ${outgoingManager} to ${incomingManager} recorded.`
    );

    setShowAddModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Shift Handover & Audit"
        subtitle={selectedHotel.name}
        hotelBadge="AUDIT SYNCHRONIZED"
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Icon name="plus" size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>New Handover</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* LIVE SHIFT DRAWER & KPI BANNER */}
        <View style={styles.liveAuditCard}>
          <View style={styles.liveHeader}>
            <View>
              <Text style={styles.liveSubtitle}>REAL-TIME RECONCILIATION</Text>
              <Text style={styles.liveTitle}>Front Desk Drawer & UPI Audit</Text>
            </View>
            <Badge label="ACTIVE DUTY" variant="success" size="sm" />
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiTile}>
              <Text style={styles.tileLabel}>UPI SETTLEMENTS TODAY</Text>
              <Text style={styles.tileVal}>
                {formatCurrency(activeMetrics.totalUpiAmount)}
              </Text>
              <Text style={styles.tileSub}>
                {activeMetrics.upiCount} GooglePay/PhonePe receipts
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <Text style={styles.tileLabel}>ON-DUTY STAFF</Text>
              <Text style={[styles.tileVal, { color: colors.accentBlue }]}>
                {activeMetrics.presentStaffCount} Active
              </Text>
              <Text style={styles.tileSub}>Across all shifts</Text>
            </View>
          </View>

          {/* In-House VIP Stays */}
          <View style={styles.vipNoticeBox}>
            <View style={styles.vipHeader}>
              <Icon name="shield" size={13} color={colors.goldDark} />
              <Text style={styles.vipTitle}>ACTIVE VIP IN-HOUSE GUESTS:</Text>
            </View>
            {activeMetrics.activeInHouseVips.map((vip, i) => (
              <Text key={i} style={styles.vipItemText}>
                • {vip}
              </Text>
            ))}
          </View>
        </View>

        {/* PAST HANDOVER LEDGER */}
        <Text style={styles.sectionTitle}>FORMAL SHIFT HANDOVER LOGS:</Text>
        <View style={styles.logsList}>
          {shiftHandovers.map((log) => (
            <View key={log.id} style={styles.handoverCard}>
              {/* Header */}
              <View style={styles.handoverHeader}>
                <View>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={styles.managersFlow}>
                    {log.outgoingManagerName} ➔ {log.incomingManagerName}
                  </Text>
                </View>
                <Badge
                  label={`${log.shiftFrom.toUpperCase()} ➔ ${log.shiftTo.toUpperCase()}`}
                  variant="primary"
                  size="sm"
                />
              </View>

              {/* Financial Tally Grid */}
              <View style={styles.tallyGrid}>
                <View style={styles.tallyCol}>
                  <Text style={styles.tallyLabel}>CASH DRAWER TALLY</Text>
                  <Text style={styles.tallyVal}>
                    {formatCurrency(log.frontDeskCashCollected)}
                  </Text>
                </View>
                <View style={[styles.tallyCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.tallyLabel}>UPI DIGITAL SETTLED</Text>
                  <Text style={styles.tallyVal}>
                    {formatCurrency(log.upiSettlementsAmount)} ({log.upiSettlementsCount} tx)
                  </Text>
                </View>
              </View>

              {/* Shift Notes */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>CRITICAL SHIFT HANDOVER INSTRUCTIONS:</Text>
                <Text style={styles.notesBody}>{log.keyHandoversNotes}</Text>
              </View>

              {/* VIP Guests Noted */}
              {log.vipGuestsInHouse.length > 0 && (
                <View style={styles.vipsLogged}>
                  <Text style={styles.vipsLoggedLabel}>VIPs Briefed:</Text>
                  <Text style={styles.vipsLoggedText}>
                    {log.vipGuestsInHouse.join(' • ')}
                  </Text>
                </View>
              )}

              {/* Status footer */}
              <View style={styles.cardFooter}>
                <View style={styles.sealRow}>
                  <Icon name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.sealText}>
                    Drawer tallied & keys acknowledged by {log.incomingManagerName}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* RECORD SHIFT HANDOVER MODAL */}
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
                <Text style={styles.modalTitle}>Record Shift Handover</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedHotel.name} • Front Desk Audit
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
              <View style={styles.formRow}>
                <Input
                  label="Outgoing Manager"
                  value={outgoingManager}
                  onChangeText={setOutgoingManager}
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Input
                  label="Incoming Manager"
                  value={incomingManager}
                  onChangeText={setIncomingManager}
                  containerStyle={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>

              {/* Shift Transitions */}
              <Text style={styles.formSectionLabel}>OUTGOING SHIFT</Text>
              <View style={styles.pillsRow}>
                {shifts.map((s) => (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setShiftFrom(s)}
                    style={[styles.pill, shiftFrom === s && styles.pillActive]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        shiftFrom === s && styles.pillTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formSectionLabel}>INCOMING SHIFT</Text>
              <View style={styles.pillsRow}>
                {shifts.map((s) => (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setShiftTo(s)}
                    style={[styles.pill, shiftTo === s && styles.pillActive]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        shiftTo === s && styles.pillTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Physical Cash in Front Desk Drawer (₹)"
                value={cashCollectedStr}
                onChangeText={setCashCollectedStr}
                keyboardType="numeric"
              />

              <Input
                label="Critical Key Handover & Operation Notes"
                placeholder="e.g. Master backup keycard encoded, ongoing maintenance, VIP arrival"
                value={handoverNotes}
                onChangeText={setHandoverNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Log Handover Audit"
                  variant="primary"
                  icon="check"
                  onPress={handleCreateHandover}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  liveAuditCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  liveSubtitle: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  liveTitle: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
  },
  tileLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  tileVal: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '800',
    marginTop: 2,
  },
  tileSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  vipNoticeBox: {
    backgroundColor: colors.goldLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  vipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vipTitle: {
    ...typography.overline,
    color: colors.goldDark,
    marginLeft: 4,
    fontWeight: '700',
  },
  vipItemText: {
    ...typography.caption,
    color: colors.goldDark,
    fontWeight: '600',
    marginTop: 1,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  logsList: {
    marginTop: spacing.xs,
  },
  handoverCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  handoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  logTimestamp: {
    ...typography.caption,
    color: colors.textMuted,
  },
  managersFlow: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  tallyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  tallyCol: {
    flex: 1,
  },
  tallyLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  tallyVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  notesContainer: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  notesLabel: {
    ...typography.overline,
    color: colors.primaryNavy,
    fontSize: 9,
  },
  notesBody: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '500',
    marginTop: 2,
  },
  vipsLogged: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  vipsLoggedLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 4,
  },
  vipsLoggedText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sealText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '500',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
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
  formRow: {
    flexDirection: 'row',
  },
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  pill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
