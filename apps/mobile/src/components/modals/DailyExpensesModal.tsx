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
import { ExpenseCategory } from '../../types/hotel';

interface DailyExpensesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DailyExpensesModal: React.FC<DailyExpensesModalProps> = ({
  visible,
  onClose,
}) => {
  const { expenses, expensesSummary, recordExpense, selectedHotel } = useHotel();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('F&B Provisions');

  const categories: ExpenseCategory[] = [
    'F&B Provisions',
    'Housekeeping Supplies',
    'Utilities & Maintenance',
    'Operations',
  ];

  const handleRecord = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter expense description');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount');
      return;
    }

    recordExpense({
      hotelId: selectedHotel.id,
      title: title.trim(),
      category,
      amount: numAmount,
      vendor: 'Direct Supplier Invoicing',
      recordedBy: 'Duty Manager',
      paymentMethod: 'Corporate Card',
    });

    setTitle('');
    setAmount('');
    setShowAddForm(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="dollar-sign" size={20} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.title}>Daily Expenses</Text>
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

        {/* Total Expense Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={styles.bannerSubtitle}>TODAY'S OPERATING DISBURSEMENTS</Text>
              <Text style={styles.bannerTotal}>{expensesSummary.todayTotal}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAddForm((prev) => !prev)}
              style={styles.logButton}
            >
              <Icon
                name={showAddForm ? 'x' : 'plus'}
                size={14}
                color={colors.accentBlue}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.logButtonText}>
                {showAddForm ? 'Cancel' : 'Log Expense'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categories Pill Grid */}
          <View style={styles.categoryPills}>
            {expensesSummary.categories.map((c) => (
              <View key={c.name} style={styles.categoryPill}>
                <Text style={styles.categoryName}>{c.name}:</Text>
                <Text style={styles.categoryAmt}>{c.amount}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Add Form */}
        {showAddForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Record Operational Expense</Text>
            <Input
              label="Expense Description / Vendor"
              placeholder="e.g. Mandi Fresh Sabzi & Dairy Restock"
              value={title}
              onChangeText={setTitle}
            />
            <Input
              label="Amount (₹ INR)"
              placeholder="15000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.fieldLabel}>Category:</Text>
            <View style={styles.categorySelector}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catOption,
                    category === cat && styles.catOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      category === cat && styles.catTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              title="Save Expense Record"
              variant="primary"
              size="md"
              onPress={handleRecord}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        <Text style={styles.sectionHeaderTitle}>
          DISBURSEMENT AUDIT LOG ({expenses.length} ITEMS)
        </Text>

        {/* Expenses List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {expenses.map((e) => (
            <View key={e.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseTitle}>{e.title}</Text>
                  <Text style={styles.expenseSub}>
                    {e.vendor} • Recorded by {e.recordedBy}
                  </Text>
                  <Text style={styles.expenseDate}>
                    {formatDate(e.date)} • Via {e.paymentMethod}
                  </Text>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>
                    -{formatCurrency(e.amount)}
                  </Text>
                  <Badge label={e.category} variant="warning" size="sm" />
                </View>
              </View>
            </View>
          ))}
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
    backgroundColor: '#FEF3C7',
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
  bannerCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerSubtitle: {
    ...typography.overline,
    color: colors.textSecondary,
    fontSize: 9,
  },
  bannerTotal: {
    ...typography.h2,
    color: colors.error,
    marginTop: 2,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryTint,
  },
  logButtonText: {
    ...typography.captionBold,
    color: colors.accentBlue,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryPill: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    marginRight: spacing.xs,
    marginTop: 4,
  },
  categoryName: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginRight: 4,
  },
  categoryAmt: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 10,
  },
  formContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    ...shadows.sm,
  },
  formTitle: {
    ...typography.bodySemiBold,
    color: colors.primaryNavy,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  catOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  catOptionActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  catText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  catTextActive: {
    color: colors.surface,
    fontWeight: '700',
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
  expenseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  expenseTitle: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  expenseSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expenseDate: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    ...typography.bodySemiBold,
    color: colors.error,
    marginBottom: 4,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
