import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useHotel } from '../../hooks/useHotel';
import { formatCurrency } from '../../utils/formatters';

interface BillingFoliosModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BillingFoliosModal: React.FC<BillingFoliosModalProps> = ({
  visible,
  onClose,
}) => {
  const { folios, billingSummary, settleFolio, selectedHotel } = useHotel();
  const [expandedFolioId, setExpandedFolioId] = useState<string | null>(null);

  const handleSettle = (folioId: string) => {
    settleFolio(folioId, 'UPI (Google Pay / PhonePe QR)');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="receipt" size={20} color={colors.accentBlue} />
            </View>
            <View>
              <Text style={styles.title}>Billing & Folios</Text>
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

        {/* Financial Overview Card */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryNum, { color: colors.success }]}>
              {billingSummary.todaySettlements}
            </Text>
            <Text style={styles.summaryLabel}>Settled Today</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryNum, { color: colors.warning }]}>
              {billingSummary.outstandingBalance}
            </Text>
            <Text style={styles.summaryLabel}>Pending Balance</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNum}>
              {billingSummary.pendingInvoices}
            </Text>
            <Text style={styles.summaryLabel}>Open Invoices</Text>
          </View>
        </View>

        <Text style={styles.sectionHeaderTitle}>
          FOLIO LEDGERS ({folios.length} ACTIVE INVOICES)
        </Text>

        {/* Folios List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {folios.map((folio) => {
            const isSettled = folio.status === 'settled';
            const isExpanded = expandedFolioId === folio.id;

            return (
              <View key={folio.id} style={styles.folioCard}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setExpandedFolioId(isExpanded ? null : folio.id)
                  }
                  style={styles.folioHeader}
                >
                  <View style={styles.folioLeft}>
                    <Text style={styles.guestName}>{folio.guestName}</Text>
                    <Text style={styles.invoiceNumber}>
                      {folio.invoiceNumber} • Room {folio.roomNumber}
                    </Text>
                  </View>
                  <View style={styles.folioRight}>
                    <Badge
                      label={isSettled ? 'SETTLED' : 'OPEN'}
                      variant={isSettled ? 'success' : 'warning'}
                      size="sm"
                    />
                    <Text style={styles.amountTotal}>
                      {formatCurrency(folio.totalAmount)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Itemized Charges */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.itemsTitle}>Itemized Charges Breakdown:</Text>
                    {folio.items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemDesc} numberOfLines={1}>
                          • {item.description}
                        </Text>
                        <Text style={styles.itemAmount}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.divider} />
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>GST (18% CGST + SGST):</Text>
                      <Text style={styles.calcVal}>{formatCurrency(folio.taxAmount)}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Paid Deposit:</Text>
                      <Text style={styles.calcVal}>{formatCurrency(folio.paidAmount)}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { fontWeight: '700' }]}>
                        Remaining Balance:
                      </Text>
                      <Text
                        style={[
                          styles.calcVal,
                          {
                            color: folio.balanceDue > 0 ? colors.error : colors.success,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {formatCurrency(folio.balanceDue)}
                      </Text>
                    </View>

                    {!isSettled && (
                      <Button
                        title="Settle Folio via UPI"
                        variant="primary"
                        size="sm"
                        icon="check-circle"
                        style={{ marginTop: spacing.md }}
                        onPress={() => handleSettle(folio.id)}
                      />
                    )}
                  </View>
                )}
              </View>
            );
          })}
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryNum: {
    ...typography.h3,
    color: colors.primaryNavy,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  sectionHeaderTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  folioCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
  },
  folioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  folioLeft: {
    flex: 1,
  },
  guestName: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  invoiceNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  folioRight: {
    alignItems: 'flex-end',
  },
  amountTotal: {
    ...typography.bodySemiBold,
    color: colors.primaryNavy,
    marginTop: 2,
  },
  expandedContent: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  itemAmount: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  calcLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calcVal: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
