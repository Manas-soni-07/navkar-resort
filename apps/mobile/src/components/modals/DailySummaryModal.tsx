import React from 'react';
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

interface DailySummaryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  visible,
  onClose,
}) => {
  const { dailySummary, kpis, selectedHotel, resetData } = useHotel();

  const handleResetData = () => {
    Alert.alert(
      'Reset Mock Data',
      'Are you sure you want to restore all properties, rooms, folios, and bookings to default seed data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: () => {
            resetData();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="trending-up" size={20} color={colors.goldAccent} />
            </View>
            <View>
              <Text style={styles.title}>Daily Financial Summary</Text>
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Executive Revenue Card */}
          <View style={styles.executiveCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>DAILY GROSS REVENUE</Text>
              <Badge label="ADMIN AUDITED" variant="gold" size="sm" />
            </View>
            <Text style={styles.grossRevText}>{dailySummary.grossRevenue}</Text>
            <Text style={styles.subInfoText}>
              Occupancy: {dailySummary.occupancyRate} ({kpis.occupiedRooms} of {kpis.totalRooms} Rooms)
            </Text>

            <View style={styles.kpiRow}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>RevPAR</Text>
                <Text style={styles.kpiValue}>{dailySummary.revPar}</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>ADR</Text>
                <Text style={styles.kpiValue}>{dailySummary.adr}</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>Net Income</Text>
                <Text style={[styles.kpiValue, { color: colors.success }]}>
                  {dailySummary.netOperatingIncome}
                </Text>
              </View>
            </View>
          </View>

          {/* Revenue Breakdown by Department */}
          <Text style={styles.sectionTitle}>REVENUE STREAMS BREAKDOWN</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.streamRow}>
              <View style={styles.streamLeft}>
                <View style={[styles.dot, { backgroundColor: colors.accentBlue }]} />
                <Text style={styles.streamName}>Palace Rooms, Havelis & Suites</Text>
              </View>
              <Text style={styles.streamPct}>65%</Text>
            </View>
            <View style={styles.streamRow}>
              <View style={styles.streamLeft}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <Text style={styles.streamName}>Mewar Thali & Royal Dining</Text>
              </View>
              <Text style={styles.streamPct}>18%</Text>
            </View>
            <View style={styles.streamRow}>
              <View style={styles.streamLeft}>
                <View style={[styles.dot, { backgroundColor: colors.goldAccent }]} />
                <Text style={styles.streamName}>Ayurvedic Spa & Herbal Therapy</Text>
              </View>
              <Text style={styles.streamPct}>9%</Text>
            </View>
            <View style={styles.streamRow}>
              <View style={styles.streamLeft}>
                <View style={[styles.dot, { backgroundColor: colors.primaryNavy }]} />
                <Text style={styles.streamName}>Destination Weddings & Banquets</Text>
              </View>
              <Text style={styles.streamPct}>8%</Text>
            </View>
          </View>

          {/* System Maintenance / Testing Utilities */}
          <Text style={styles.sectionTitle}>MOCK STATE MANAGEMENT UTILITY</Text>
          <View style={styles.utilityCard}>
            <Text style={styles.utilTitle}>Reactive In-Memory State</Text>
            <Text style={styles.utilDesc}>
              Mutations (Check-ins, Attendance, Billing settlements, and Expenses) are reactively tracked in memory. You can reset to clean seed data anytime.
            </Text>
            <Button
              title="Reset All Mock Data to Seeds"
              variant="outline"
              size="sm"
              icon="refresh-cw"
              style={{ marginTop: spacing.md }}
              onPress={handleResetData}
            />
          </View>
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
    backgroundColor: '#FEF9C3',
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  executiveCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  grossRevText: {
    ...typography.h1,
    color: colors.primaryNavy,
    marginTop: spacing.xs,
  },
  subInfoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  kpiBox: {
    alignItems: 'center',
  },
  kpiLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  kpiValue: {
    ...typography.bodySemiBold,
    color: colors.primaryNavy,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  streamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  streamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  streamName: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  streamPct: {
    ...typography.captionBold,
    color: colors.primaryNavy,
  },
  utilityCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  utilTitle: {
    ...typography.bodySemiBold,
    color: colors.primaryNavy,
  },
  utilDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
