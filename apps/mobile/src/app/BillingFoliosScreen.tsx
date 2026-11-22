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
  Share,
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
import { ChargeCategory, FolioStatus } from '../types/hotel';

export const BillingFoliosScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    folios: allFolios,
    settleFolio,
    addFolioCharge,
    selectedHotel,
    hotels,
    switchHotel,
    currentUser,
  } = useHotel();

  // Role permissions
  const isAdmin = currentUser?.role === 'ADMIN';
  const managerAssignedHotelId = currentUser?.hotelId || selectedHotel.id;

  // Hotel filter
  const [filterHotelId, setFilterHotelId] = useState<string>(
    isAdmin ? 'all' : managerAssignedHotelId
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedFolioId, setExpandedFolioId] = useState<string | null>(null);

  // Add Charge Modal State
  const [targetFolioId, setTargetFolioId] = useState<string | null>(null);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeCategory, setChargeCategory] = useState<ChargeCategory>('dining');

  // Settle Modal State
  const [settleFolioId, setSettleFolioId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('UPI (Google Pay / PhonePe QR)');

  // Receipt Modal State
  const [receiptFolioId, setReceiptFolioId] = useState<string | null>(null);

  const statusFilters = ['ALL', 'open', 'settled'];

  // Normal hotel categories
  const categories: { key: ChargeCategory; label: string }[] = [
    { key: 'room', label: 'Room Rent' },
    { key: 'extra_bed', label: 'Extra Bed / Mattress' },
    { key: 'dining', label: 'Food / Tea / Coffee' },
    { key: 'water', label: 'Mineral Water' },
    { key: 'laundry', label: 'Laundry Service' },
    { key: 'service', label: 'Misc Service' },
  ];

  const paymentMethods = [
    'UPI (Google Pay / PhonePe QR)',
    'Cash Voucher',
    'RuPay / Debit / Credit Card',
    'NEFT / Bank Transfer',
  ];

  // Filtered folios
  const filteredFolios = useMemo(() => {
    return allFolios.filter((f) => {
      // Hotel isolation
      if (!isAdmin) {
        if (f.hotelId !== managerAssignedHotelId) return false;
      } else if (filterHotelId !== 'all') {
        if (f.hotelId !== filterHotelId) return false;
      }

      // Search match
      const matchesSearch =
        f.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.roomNumber.includes(searchQuery);

      // Status match
      const matchesStatus = selectedStatus === 'ALL' || f.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [allFolios, isAdmin, managerAssignedHotelId, filterHotelId, searchQuery, selectedStatus]);

  // Aggregate metrics
  const summaryMetrics = useMemo(() => {
    const settledTotal = filteredFolios
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.paidAmount, 0);

    const outstandingTotal = filteredFolios
      .filter((f) => f.status === 'open')
      .reduce((sum, f) => sum + f.balanceDue, 0);

    const openCount = filteredFolios.filter((f) => f.status === 'open').length;

    return {
      settledTotal,
      outstandingTotal,
      openCount,
    };
  }, [filteredFolios]);

  const handleAddCharge = () => {
    if (!targetFolioId || !chargeDesc.trim()) {
      Alert.alert('Required', 'Please enter a description for the charge.');
      return;
    }
    const amt = parseFloat(chargeAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid charge amount.');
      return;
    }

    addFolioCharge(targetFolioId, {
      description: chargeDesc.trim(),
      category: chargeCategory,
      amount: amt,
    });

    setTargetFolioId(null);
    setChargeDesc('');
    setChargeAmount('');
    Alert.alert('Charge Added', `₹ ${amt} posted to guest folio.`);
  };

  const handleConfirmSettle = () => {
    if (!settleFolioId) return;

    settleFolio(settleFolioId, selectedPaymentMethod);
    const settledFolio = allFolios.find((f) => f.id === settleFolioId);
    setSettleFolioId(null);

    Alert.alert(
      'Payment Recorded',
      `Folio for ${settledFolio?.guestName || 'Guest'} settled successfully via ${selectedPaymentMethod}.`
    );
  };

  const getHotelName = (id: string) => {
    const h = hotels.find((item) => item.id === id);
    return h ? h.name : id;
  };

  const receiptFolio = allFolios.find((f) => f.id === receiptFolioId);
  const folioBeingSettled = allFolios.find((f) => f.id === settleFolioId);

  const handleShareReceipt = async () => {
    if (!receiptFolio) return;
    const hName = getHotelName(receiptFolio.hotelId);
    const receiptText = `==============================
${hName.toUpperCase()}
GST TAX INVOICE / GUEST RECEIPT
==============================
Invoice No: ${receiptFolio.invoiceNumber}
Date: ${receiptFolio.createdAt}
Guest: ${receiptFolio.guestName}
Room No: ${receiptFolio.roomNumber}
Status: ${receiptFolio.status.toUpperCase()}

--- CHARGES BREAKDOWN ---
${receiptFolio.items.map((i) => `${i.description}: ₹ ${i.amount.toLocaleString('en-IN')}`).join('\n')}
------------------------------
Subtotal: ₹ ${receiptFolio.subtotal.toLocaleString('en-IN')}
GST (18%): ₹ ${receiptFolio.taxAmount.toLocaleString('en-IN')}
Total Billed: ₹ ${receiptFolio.totalAmount.toLocaleString('en-IN')}
Amount Paid: ₹ ${receiptFolio.paidAmount.toLocaleString('en-IN')}
Balance Due: ₹ ${receiptFolio.balanceDue.toLocaleString('en-IN')}
Payment Mode: ${receiptFolio.paymentMethod || 'Cash / UPI'}
==============================
Thank you for staying at ${hName}!`;

    try {
      await Share.share({
        title: `Receipt ${receiptFolio.invoiceNumber}`,
        message: receiptText,
      });
    } catch {
      Alert.alert('Receipt', receiptText);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Billing & Folios"
        subtitle={
          isAdmin
            ? filterHotelId === 'all'
              ? 'Consolidated - All Properties'
              : getHotelName(filterHotelId)
            : selectedHotel.name
        }
        hotelBadge={`₹ ${summaryMetrics.settledTotal.toLocaleString('en-IN')} SETTLED`}
        showBack
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hotel Filter (Admin Only) */}
        {isAdmin ? (
          <View style={styles.hotelFilterContainer}>
            <Text style={styles.sectionLabel}>HOTEL PROPERTY AUDIT:</Text>
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

        {/* Financial Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.success }]}>
              ₹ {summaryMetrics.settledTotal.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Settled Collections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.warning }]}>
              ₹ {summaryMetrics.outstandingTotal.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Pending Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{summaryMetrics.openCount}</Text>
            <Text style={styles.statLabel}>Open Invoices</Text>
          </View>
        </View>

        {/* Search */}
        <Input
          placeholder="Search by guest, room, or invoice code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />

        {/* Filter Pills */}
        <Text style={styles.sectionLabel}>LEDGER STATUS FILTER:</Text>
        <View style={styles.filterRow}>
          {statusFilters.map((st) => {
            const isActive = selectedStatus === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setSelectedStatus(st)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            ACTIVE INVOICES & FOLIOS ({filteredFolios.length} RECORDS)
          </Text>
        </View>

        {/* Folio Cards */}
        {filteredFolios.map((folio) => {
          const isSettled = folio.status === 'settled';
          const isExpanded = expandedFolioId === folio.id;

          return (
            <View key={folio.id} style={styles.folioCard}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setExpandedFolioId(isExpanded ? null : folio.id)}
                style={styles.cardHeader}
              >
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.guestName}>{folio.guestName}</Text>
                  <Text style={styles.invoiceCode}>
                    {folio.invoiceNumber} • Room {folio.roomNumber}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <Badge
                    label={isSettled ? 'SETTLED' : 'OPEN'}
                    variant={isSettled ? 'success' : 'warning'}
                    size="sm"
                  />
                  <Text style={styles.totalAmt}>₹ {folio.totalAmount.toLocaleString('en-IN')}</Text>
                </View>
              </TouchableOpacity>

              {/* Collapsible Details */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  <View style={styles.sectionRowBetween}>
                    <Text style={styles.breakdownTitle}>Itemized Charges Breakdown:</Text>
                    {!isSettled && (
                      <TouchableOpacity
                        onPress={() => setTargetFolioId(folio.id)}
                        style={styles.addChargeTag}
                      >
                        <Icon
                          name="plus"
                          size={12}
                          color={colors.accentBlue}
                          style={{ marginRight: 2 }}
                        />
                        <Text style={styles.addChargeTagText}>Add Line Charge</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {folio.items.map((item) => (
                    <View key={item.id} style={styles.itemLine}>
                      <Text style={styles.itemDesc} numberOfLines={1}>
                        • {item.description}
                      </Text>
                      <Text style={styles.itemAmt}>₹ {item.amount.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}

                  <View style={styles.calcDivider} />
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Subtotal:</Text>
                    <Text style={styles.calcValue}>₹ {folio.subtotal.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>GST (18% CGST + SGST):</Text>
                    <Text style={styles.calcValue}>₹ {folio.taxAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Advance Paid:</Text>
                    <Text style={styles.calcValue}>₹ {folio.paidAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { fontWeight: '700' }]}>Balance Due:</Text>
                    <Text
                      style={[
                        styles.calcValue,
                        {
                          color: folio.balanceDue > 0 ? colors.error : colors.success,
                          fontWeight: '800',
                          fontSize: 14,
                        },
                      ]}
                    >
                      ₹ {folio.balanceDue.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <Button
                      title="View Receipt"
                      variant="outline"
                      size="sm"
                      style={{ flex: 1, marginRight: spacing.xs }}
                      onPress={() => setReceiptFolioId(folio.id)}
                    />
                    {!isSettled && (
                      <Button
                        title="Settle Folio"
                        variant="primary"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => setSettleFolioId(folio.id)}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {filteredFolios.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptyDesc}>No billing records match the current filter query.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Charge Line Modal */}
      <Modal visible={targetFolioId !== null} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post Folio Room Charge</Text>
            <TouchableOpacity onPress={() => setTargetFolioId(null)} style={styles.modalCloseBtn}>
              <Icon name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSectionLabel}>CHARGE CATEGORY:</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setChargeCategory(cat.key)}
                  style={[styles.catPill, chargeCategory === cat.key && styles.catPillActive]}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      chargeCategory === cat.key && styles.catPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Charge Item Description *"
              placeholder="e.g. Extra Bed & Mattress, Packaged Drinking Water"
              value={chargeDesc}
              onChangeText={setChargeDesc}
            />
            <Input
              label="Amount in INR (₹) *"
              placeholder="e.g. 1000"
              keyboardType="numeric"
              value={chargeAmount}
              onChangeText={setChargeAmount}
            />

            <Button
              title="Post Charge to Guest Folio"
              variant="primary"
              size="lg"
              onPress={handleAddCharge}
              style={{ marginTop: spacing.lg }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settle Folio Modal */}
      <Modal visible={settleFolioId !== null} animationType="fade" transparent={true}>
        <View style={styles.receiptOverlay}>
          <View style={styles.settlePaper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settle Folio Payment</Text>
              <TouchableOpacity onPress={() => setSettleFolioId(null)}>
                <Icon name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {folioBeingSettled && (
              <View style={{ padding: spacing.md }}>
                <Text style={styles.settleGuestText}>
                  Guest: <Text style={{ fontWeight: '700' }}>{folioBeingSettled.guestName}</Text> (Room {folioBeingSettled.roomNumber})
                </Text>
                <Text style={styles.settleBalanceText}>
                  Balance Due: <Text style={{ color: '#059669', fontWeight: '800' }}>₹ {folioBeingSettled.balanceDue.toLocaleString('en-IN')}</Text>
                </Text>

                <Text style={styles.formSectionLabel}>SELECT PAYMENT METHOD:</Text>
                {paymentMethods.map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    onPress={() => setSelectedPaymentMethod(pm)}
                    style={[
                      styles.pmRow,
                      selectedPaymentMethod === pm && styles.pmRowActive,
                    ]}
                  >
                    <Icon
                      name={selectedPaymentMethod === pm ? 'check-circle' : 'circle'}
                      size={16}
                      color={selectedPaymentMethod === pm ? '#059669' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.pmText,
                        selectedPaymentMethod === pm && styles.pmTextActive,
                      ]}
                    >
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Button
                  title="Confirm Payment & Settle"
                  variant="primary"
                  size="md"
                  onPress={handleConfirmSettle}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Invoice Receipt Modal */}
      <Modal visible={receiptFolio !== undefined} animationType="fade" transparent={true}>
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptPaper}>
            <View style={styles.receiptHeader}>
              <Text style={styles.hotelBrand}>
                {receiptFolio ? getHotelName(receiptFolio.hotelId) : selectedHotel.name}
              </Text>
              <Text style={styles.receiptTitle}>OFFICIAL GUEST FOLIO RECEIPT</Text>
            </View>

            {receiptFolio && (
              <View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaText}>Invoice: {receiptFolio.invoiceNumber}</Text>
                  <Text style={styles.receiptMetaText}>Room: {receiptFolio.roomNumber}</Text>
                </View>
                <Text style={styles.receiptGuest}>Guest: {receiptFolio.guestName}</Text>

                <View style={styles.receiptDivider} />
                {receiptFolio.items.map((item) => (
                  <View key={item.id} style={styles.receiptItemRow}>
                    <Text style={styles.receiptItemDesc}>{item.description}</Text>
                    <Text style={styles.receiptItemAmt}>
                      ₹ {item.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}

                <View style={styles.receiptDivider} />
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Subtotal:</Text>
                  <Text style={styles.receiptTotalAmt}>
                    ₹ {receiptFolio.subtotal.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>GST (18%):</Text>
                  <Text style={styles.receiptTotalAmt}>
                    ₹ {receiptFolio.taxAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Total Folio Billed:</Text>
                  <Text style={styles.receiptTotalAmt}>
                    ₹ {receiptFolio.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Paid Deposit:</Text>
                  <Text style={[styles.receiptTotalAmt, { color: colors.success }]}>
                    ₹ {receiptFolio.paidAmount.toLocaleString('en-IN')}
                  </Text>
                </View>

                {receiptFolio.paymentMethod && (
                  <Text style={styles.paymentMethodNotice}>
                    Settled Via: {receiptFolio.paymentMethod}
                  </Text>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
              <Button
                title="Share Receipt"
                variant="primary"
                size="md"
                onPress={handleShareReceipt}
                style={{ flex: 1 }}
              />
              <Button
                title="Close"
                variant="outline"
                size="md"
                onPress={() => setReceiptFolioId(null)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    ...typography.h3,
    color: colors.primaryNavy,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
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
  folioCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  guestName: {
    ...typography.subtitle1,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  invoiceCode: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  totalAmt: {
    ...typography.subtitle2,
    fontWeight: '800',
    color: colors.primaryNavy,
    marginTop: 4,
  },
  expandedSection: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addChargeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  addChargeTagText: {
    ...typography.caption,
    color: colors.accentBlue,
    fontSize: 10,
    fontWeight: '700',
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  itemAmt: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calcValue: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textMuted,
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
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  catPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  receiptPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '90%',
    ...shadows.lg,
  },
  settlePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    width: '100%',
    ...shadows.lg,
  },
  settleGuestText: {
    ...typography.body2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settleBalanceText: {
    ...typography.body2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    gap: 8,
  },
  pmRowActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  pmText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  pmTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hotelBrand: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '800',
  },
  receiptTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  receiptGuest: {
    ...typography.subtitle2,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  receiptItemDesc: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  receiptItemAmt: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  receiptTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  receiptTotalAmt: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentMethodNotice: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
