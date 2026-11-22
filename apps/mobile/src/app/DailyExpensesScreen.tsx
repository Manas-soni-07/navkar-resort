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
import { formatCurrency, formatDate } from '../utils/formatters';
import { ExpenseCategory, ExpenseRecord } from '../types/hotel';

export const DailyExpensesScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    expenses: allExpenses,
    recordExpense,
    selectedHotel,
    hotels,
    switchHotel,
    currentUser,
  } = useHotel();

  // Role permissions
  const isAdmin = currentUser?.role === 'ADMIN';
  const managerAssignedHotelId = currentUser?.hotelId || selectedHotel.id;

  // Hotel Filter: Admin can choose 'all', 'h-villa', 'h-navkar'. Manager is strictly locked.
  const [filterHotelId, setFilterHotelId] = useState<string>(
    isAdmin ? 'all' : managerAssignedHotelId
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add Expense Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetHotelId, setTargetHotelId] = useState<string>(
    isAdmin ? 'h-villa' : managerAssignedHotelId
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState(''); // Paid To
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('2026-11-17');
  const [submitting, setSubmitting] = useState(false);

  // Categories specified in ResortOS master requirements
  const categories: (ExpenseCategory | 'ALL')[] = [
    'ALL',
    'Electricity',
    'Water',
    'Maintenance',
    'Repair',
    'Supplies',
    'Misc',
  ];

  const paymentMethods: ('Cash' | 'UPI' | 'Bank Transfer')[] = ['Cash', 'UPI', 'Bank Transfer'];

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e) => {
      // Hotel isolation
      if (!isAdmin) {
        if (e.hotelId !== managerAssignedHotelId) return false;
      } else if (filterHotelId !== 'all') {
        if (e.hotelId !== filterHotelId) return false;
      }

      // Search match
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.recordedBy.toLowerCase().includes(searchQuery.toLowerCase());

      // Category match
      const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allExpenses, isAdmin, managerAssignedHotelId, filterHotelId, searchQuery, selectedCategory]);

  // Aggregate metrics
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const categoryTotals = useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const getHotelName = (id: string) => {
    const h = hotels.find((item) => item.id === id);
    return h ? h.name : id;
  };

  const handleRecordExpense = async () => {
    if (submitting) return;

    if (!title.trim() || !vendor.trim()) {
      Alert.alert('Required Fields', 'Please enter expense title and recipient (Paid To).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount in INR (₹).');
      return;
    }

    const hId = isAdmin ? targetHotelId : managerAssignedHotelId;
    const hName = getHotelName(hId);

    setSubmitting(true);
    try {
      await recordExpense({
        hotelId: hId,
        hotelName: hName,
        title: title.trim(),
        category,
        amount: numAmount,
        vendor: vendor.trim(),
        recordedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Manager',
        paymentMethod,
        description: description.trim() || undefined,
      });

      setTitle('');
      setAmount('');
      setVendor('');
      setDescription('');
      setShowAddModal(false);
      Alert.alert(
        'Expense Recorded',
        `₹ ${numAmount.toLocaleString('en-IN')} logged under ${category} and saved to database.`
      );
    } catch (err: any) {
      console.error('Failed to record expense:', err);
      Alert.alert(
        'Database Error',
        err?.message || 'Failed to persist expense record to TiDB Cloud. Please check your connection and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Electricity':
        return '#EA580C';
      case 'Water':
        return '#0284C7';
      case 'Maintenance':
        return '#4F46E5';
      case 'Repair':
        return '#DC2626';
      case 'Supplies':
        return '#059669';
      default:
        return '#475569';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <Header
        title="Other Expenses"
        subtitle={
          isAdmin
            ? filterHotelId === 'all'
              ? 'Consolidated - All Properties'
              : getHotelName(filterHotelId)
            : selectedHotel.name
        }
        hotelBadge={`₹ ${totalAmount.toLocaleString('en-IN')}`}
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAddModal(true)}
            style={styles.addBtn}
          >
            <Icon name="plus" size={16} color={colors.accentBlue} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hotel Filter Pills (Admin Only) */}
        {isAdmin ? (
          <View style={styles.hotelFilterContainer}>
            <Text style={styles.sectionLabel}>FILTER BY HOTEL PROPERTY:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hotelPillsRow}
            >
              <TouchableOpacity
                onPress={() => setFilterHotelId('all')}
                style={[styles.hotelPill, filterHotelId === 'all' && styles.hotelPillActive]}
              >
                <Text
                  style={[
                    styles.hotelPillText,
                    filterHotelId === 'all' && styles.hotelPillTextActive,
                  ]}
                >
                  All Hotels
                </Text>
              </TouchableOpacity>
              {hotels.map((h) => {
                const isActive = filterHotelId === h.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => setFilterHotelId(h.id)}
                    style={[styles.hotelPill, isActive && styles.hotelPillActive]}
                  >
                    <Text style={[styles.hotelPillText, isActive && styles.hotelPillTextActive]}>
                      {h.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.managerNoticeCard}>
            <Icon name="shield" size={14} color="#059669" />
            <Text style={styles.managerNoticeText}>
              Locked to your assigned hotel: <Text style={{ fontWeight: '700' }}>{selectedHotel.name}</Text>
            </Text>
          </View>
        )}

        {/* Master Expenses KPI Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerSubtitle}>TOTAL OPERATIONAL EXPENSES</Text>
          <Text style={styles.bannerTotal}>₹ {totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.bannerNote}>
            {filteredExpenses.length} expense transactions logged
          </Text>

          {/* Categories Pill Grid */}
          <View style={styles.categoryPills}>
            {Object.keys(categoryTotals).map((catName) => (
              <View key={catName} style={styles.categoryPill}>
                <Text style={styles.categoryName}>{catName}:</Text>
                <Text style={styles.categoryAmt}>
                  ₹ {categoryTotals[catName].toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Search */}
        <Input
          placeholder="Search by expense title, vendor, or recorder..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />

        {/* Category Filters */}
        <Text style={styles.sectionLabel}>CATEGORY FILTER:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categories.map((c) => {
            const isActive = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedCategory(c)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            RECORDED EXPENSE VOUCHERS ({filteredExpenses.length})
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAddModal(true)}
            style={styles.quickAddRow}
          >
            <Icon name="plus" size={12} color={colors.accentBlue} />
            <Text style={styles.quickAddText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Expenses List */}
        {filteredExpenses.map((exp) => (
          <View key={exp.id} style={styles.expenseCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.categoryBadgeWrap}>
                <View
                  style={[
                    styles.catDot,
                    { backgroundColor: getCategoryBadgeColor(exp.category) },
                  ]}
                />
                <Text
                  style={[
                    styles.catLabel,
                    { color: getCategoryBadgeColor(exp.category) },
                  ]}
                >
                  {exp.category.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.amountText}>₹ {exp.amount.toLocaleString('en-IN')}</Text>
            </View>

            <Text style={styles.expenseTitle}>{exp.title}</Text>

            {exp.description ? (
              <Text style={styles.descriptionText}>{exp.description}</Text>
            ) : null}

            <View style={styles.cardDetailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>PAID TO / VENDOR:</Text>
                <Text style={styles.detailValue}>{exp.vendor}</Text>
              </View>
              <View style={styles.detailColRight}>
                <Text style={styles.detailLabel}>METHOD / DATE:</Text>
                <Text style={styles.detailValue}>
                  {exp.paymentMethod} • {exp.date}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.recordedByText}>
                Logged by: {exp.recordedBy}
              </Text>
              {isAdmin && filterHotelId === 'all' && (
                <Text style={styles.hotelTag}>
                  🏨 {getHotelName(exp.hotelId)}
                </Text>
              )}
            </View>
          </View>
        ))}

        {filteredExpenses.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={38} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Expenses Found</Text>
            <Text style={styles.emptyDesc}>
              No expenses recorded matching the current filter criteria.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Property Expense</Text>
            <TouchableOpacity
              onPress={() => !submitting && setShowAddModal(false)}
              disabled={submitting}
              style={[styles.modalCloseBtn, submitting && { opacity: 0.5 }]}
            >
              <Icon name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* If Admin, Hotel Selection */}
            {isAdmin && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>SELECT HOTEL PROPERTY:</Text>
                <View style={styles.formPillGrid}>
                  {hotels.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      onPress={() => setTargetHotelId(h.id)}
                      style={[styles.formPill, targetHotelId === h.id && styles.formPillActive]}
                    >
                      <Text
                        style={[
                          styles.formPillText,
                          targetHotelId === h.id && styles.formPillTextActive,
                        ]}
                      >
                        {h.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Category Selector */}
            <Text style={styles.formSectionLabel}>EXPENSE CATEGORY:</Text>
            <View style={styles.formPillGrid}>
              {categories
                .filter((c) => c !== 'ALL')
                .map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat as ExpenseCategory)}
                    style={[styles.formPill, category === cat && styles.formPillActive]}
                  >
                    <Text
                      style={[
                        styles.formPillText,
                        category === cat && styles.formPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Input
              label="Expense Title / Purpose *"
              placeholder="e.g. JVVNL Commercial Electricity Bill"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Amount in INR (₹) *"
              placeholder="e.g. 18500"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Input
              label="Paid To (Vendor / Contractor / Person) *"
              placeholder="e.g. Jaipur Jal Seva Supplier"
              value={vendor}
              onChangeText={setVendor}
            />

            <Input
              label="Date (YYYY-MM-DD)"
              placeholder="2026-11-17"
              value={expenseDate}
              onChangeText={setExpenseDate}
            />

            {/* Payment Method Selector */}
            <Text style={styles.formSectionLabel}>PAYMENT METHOD:</Text>
            <View style={styles.formPillGrid}>
              {paymentMethods.map((pm) => (
                <TouchableOpacity
                  key={pm}
                  onPress={() => setPaymentMethod(pm)}
                  style={[styles.formPill, paymentMethod === pm && styles.formPillActive]}
                >
                  <Text
                    style={[
                      styles.formPillText,
                      paymentMethod === pm && styles.formPillTextActive,
                    ]}
                  >
                    {pm}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Description / Additional Notes (Optional)"
              placeholder="e.g. Room 102 hot water tap mixer replacement"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Button
              title={submitting ? "Saving to Database..." : "Save Expense Voucher"}
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting}
              onPress={handleRecordExpense}
              style={{ marginTop: spacing.md }}
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
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0E1F2',
  },
  hotelFilterContainer: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.overline,
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  hotelPillsRow: {
    paddingBottom: spacing.xs,
  },
  hotelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  hotelPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  hotelPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hotelPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  managerNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: spacing.sm,
    gap: 6,
  },
  managerNoticeText: {
    ...typography.caption,
    fontSize: 11,
    color: '#065F46',
  },
  bannerCard: {
    backgroundColor: colors.primaryNavy,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  bannerSubtitle: {
    ...typography.overline,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  bannerTotal: {
    ...typography.h2,
    color: '#F8FAFC',
    marginVertical: 4,
    fontWeight: '800',
  },
  bannerNote: {
    ...typography.caption,
    color: '#CBD5E1',
    marginBottom: spacing.sm,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    gap: 4,
  },
  categoryName: {
    ...typography.caption,
    fontSize: 10,
    color: '#E2E8F0',
  },
  categoryAmt: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#FDBA74',
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  filterScroll: {
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  filterPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listTitle: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickAddText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.accentBlue,
    fontWeight: '700',
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountText: {
    ...typography.subtitle1,
    fontWeight: '800',
    color: '#DC2626',
  },
  expenseTitle: {
    ...typography.subtitle2,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginBottom: 2,
  },
  descriptionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  detailCol: {
    flex: 1,
  },
  detailColRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  recordedByText: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
  },
  hotelTag: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  modalBody: {
    padding: spacing.md,
  },
  formSection: {
    marginBottom: spacing.sm,
  },
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  formPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  formPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  formPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  formPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
