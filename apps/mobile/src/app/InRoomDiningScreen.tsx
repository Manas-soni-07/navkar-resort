import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
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
import { formatCurrency } from '../utils/formatters';
import { DiningOrder, DiningOrderItem } from '../types/hotel';

export const InRoomDiningScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    diningOrders,
    menuCatalog,
    createDiningOrder,
    updateDiningOrderStatus,
    rooms,
    selectedHotel,
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'live-kot' | 'new-order' | 'catalog'>('live-kot');
  const [kotStatusFilter, setKotStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Order State
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [cartItems, setCartItems] = useState<{ [itemId: string]: number }>({});
  const [dietaryNote, setDietaryNote] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('ALL');

  // Currently occupied rooms eligible for in-room dining
  const occupiedRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'occupied' && r.currentGuestName);
  }, [rooms]);

  // Set default room if none selected
  React.useEffect(() => {
    if (!selectedRoomNumber && occupiedRooms.length > 0) {
      setSelectedRoomNumber(occupiedRooms[0].roomNumber);
    }
  }, [occupiedRooms, selectedRoomNumber]);

  // Filtered KOT Orders
  const filteredOrders = useMemo(() => {
    return diningOrders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(q) ||
        order.roomNumber.toLowerCase().includes(q) ||
        order.guestName.toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q));

      const matchesStatus =
        kotStatusFilter === 'ALL' || order.status === kotStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [diningOrders, searchQuery, kotStatusFilter]);

  // Menu catalog categories
  const categories = ['ALL', 'Starters', 'Mains', 'Breads & Rice', 'Beverages', 'Royal Desserts'];

  const filteredCatalog = useMemo(() => {
    return menuCatalog.filter((item) => {
      const matchesCategory =
        selectedCatalogCategory === 'ALL' || item.category === selectedCatalogCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuCatalog, selectedCatalogCategory, searchQuery]);

  // Cart calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;
    const itemsList: DiningOrderItem[] = [];

    Object.entries(cartItems).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const product = menuCatalog.find((m) => m.id === itemId);
        if (product) {
          subtotal += product.price * qty;
          itemCount += qty;
          itemsList.push({
            ...product,
            quantity: qty,
          });
        }
      }
    });

    const gstAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + gstAmount;

    return {
      subtotal,
      gstAmount,
      totalAmount,
      itemCount,
      itemsList,
    };
  }, [cartItems, menuCatalog]);

  const updateCartQty = (itemId: string, delta: number) => {
    setCartItems((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleFireKOT = async () => {
    if (!selectedRoomNumber) {
      Alert.alert('No Room Selected', 'Please select an occupied room for delivery.');
      return;
    }
    if (cartSummary.itemCount === 0) {
      Alert.alert('Empty Cart', 'Please add at least one dish from the menu.');
      return;
    }

    const targetRoom = occupiedRooms.find((r) => r.roomNumber === selectedRoomNumber);
    const guestName = targetRoom?.currentGuestName || 'Valued Guest';

    const newOrder = await createDiningOrder({
      hotelId: selectedHotel.id,
      roomNumber: selectedRoomNumber,
      guestName,
      items: cartSummary.itemsList,
      subtotal: cartSummary.subtotal,
      gstAmount: cartSummary.gstAmount,
      totalAmount: cartSummary.totalAmount,
      status: 'received',
      dietaryNote: dietaryNote.trim() || undefined,
    });

    Alert.alert(
      'KOT Dispatched to Kitchen',
      `Order ${newOrder.orderNumber} placed for Room ${selectedRoomNumber}!\nTotal: ${formatCurrency(cartSummary.totalAmount)} (auto-posted to room folio).`
    );

    // Reset Cart & Navigate to Live KOT Orders
    setCartItems({});
    setDietaryNote('');
    setActiveTab('live-kot');
  };

  const getStatusBadgeVariant = (
    status: DiningOrder['status']
  ): 'warning' | 'info' | 'gold' | 'success' => {
    switch (status) {
      case 'received':
        return 'warning';
      case 'in_kitchen':
        return 'info';
      case 'out_for_delivery':
        return 'gold';
      case 'delivered':
        return 'success';
      default:
        return 'info';
    }
  };

  const getNextStatusLabel = (status: DiningOrder['status']): string | null => {
    switch (status) {
      case 'received':
        return 'Send to Kitchen';
      case 'in_kitchen':
        return 'Dispatch to Room';
      case 'out_for_delivery':
        return 'Confirm Delivered';
      case 'delivered':
        return null;
    }
  };

  const advanceOrderStatus = (order: DiningOrder) => {
    let nextStatus: DiningOrder['status'] | null = null;
    if (order.status === 'received') nextStatus = 'in_kitchen';
    else if (order.status === 'in_kitchen') nextStatus = 'out_for_delivery';
    else if (order.status === 'out_for_delivery') nextStatus = 'delivered';

    if (nextStatus) {
      updateDiningOrderStatus(order.id, nextStatus);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="In-Room Dining (KOT)"
        subtitle={selectedHotel.name}
        hotelBadge="18% GST FOLIO SYNC"
        showBack
        onBack={goBack}
      />

      {/* TABS SELECTOR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('live-kot')}
          style={[styles.tabItem, activeTab === 'live-kot' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'live-kot' && styles.tabItemTextActive,
            ]}
          >
            Live KOTs ({diningOrders.filter((o) => o.status !== 'delivered').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('new-order')}
          style={[styles.tabItem, activeTab === 'new-order' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'new-order' && styles.tabItemTextActive,
            ]}
          >
            + New Room Order
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
            Menu Catalog
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======================================================== */}
        {/* TAB 1: LIVE KOT ORDERS                                   */}
        {/* ======================================================== */}
        {activeTab === 'live-kot' && (
          <View>
            {/* Status Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {['ALL', 'received', 'in_kitchen', 'out_for_delivery', 'delivered'].map(
                (st) => {
                  const isActive = kotStatusFilter === st;
                  const count =
                    st === 'ALL'
                      ? diningOrders.length
                      : diningOrders.filter((o) => o.status === st).length;
                  return (
                    <TouchableOpacity
                      key={st}
                      activeOpacity={0.7}
                      onPress={() => setKotStatusFilter(st)}
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
                        {st.replace('_', ' ').toUpperCase()} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {/* Orders List */}
            {filteredOrders.map((order) => {
              const nextActionLabel = getNextStatusLabel(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Header */}
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                      <Text style={styles.orderTimeText}>
                        Ordered at {order.createdAt}
                      </Text>
                    </View>
                    <Badge
                      label={order.status.replace('_', ' ').toUpperCase()}
                      variant={getStatusBadgeVariant(order.status)}
                      size="sm"
                    />
                  </View>

                  {/* Room & Guest Row */}
                  <View style={styles.roomGuestRow}>
                    <View style={styles.roomBadge}>
                      <Icon name="key" size={13} color={colors.primaryNavy} />
                      <Text style={styles.roomBadgeText}>
                        Room {order.roomNumber}
                      </Text>
                    </View>
                    <Text style={styles.guestNameText}>{order.guestName}</Text>
                  </View>

                  {/* Itemized Order Table */}
                  <View style={styles.itemsTable}>
                    {order.items.map((item, idx) => (
                      <View key={idx} style={styles.itemTableRow}>
                        <Text style={styles.itemQtyName}>
                          <Text style={styles.itemQty}>{item.quantity}x </Text>
                          {item.name}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {formatCurrency(item.price * item.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Dietary Note */}
                  {order.dietaryNote && (
                    <View style={styles.dietaryBox}>
                      <Icon
                        name="activity"
                        size={12}
                        color={colors.goldDark}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.dietaryText}>
                        Chef Note: {order.dietaryNote}
                      </Text>
                    </View>
                  )}

                  {/* Bill Breakdown */}
                  <View style={styles.billBreakdown}>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Food & Beverage Subtotal</Text>
                      <Text style={styles.billVal}>
                        {formatCurrency(order.subtotal)}
                      </Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>
                        GST @ 18% (CGST 9% + SGST 9%)
                      </Text>
                      <Text style={styles.billVal}>
                        {formatCurrency(order.gstAmount)}
                      </Text>
                    </View>
                    <View style={[styles.billRow, styles.billRowTotal]}>
                      <Text style={styles.totalLabel}>TOTAL FOLIO CHARGE</Text>
                      <Text style={styles.totalVal}>
                        {formatCurrency(order.totalAmount)}
                      </Text>
                    </View>
                  </View>

                  {/* Auto Post Folio Notice */}
                  <View style={styles.folioSyncBox}>
                    <Icon name="check-circle" size={12} color={colors.success} />
                    <Text style={styles.folioSyncText}>
                      Auto-posted to Room {order.roomNumber} guest folio invoice
                    </Text>
                  </View>

                  {/* Action Button */}
                  {nextActionLabel && (
                    <View style={styles.cardActions}>
                      <Button
                        title={nextActionLabel}
                        variant="primary"
                        size="sm"
                        onPress={() => advanceOrderStatus(order)}
                        fullWidth
                      />
                    </View>
                  )}
                </View>
              );
            })}

            {filteredOrders.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="activity" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Kitchen Tickets</Text>
                <Text style={styles.emptySubtitle}>
                  No in-room dining orders currently match the selected status.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CREATE NEW ROOM ORDER (KOT)                       */}
        {/* ======================================================== */}
        {activeTab === 'new-order' && (
          <View>
            {/* Room Selector */}
            <Text style={styles.sectionHeading}>SELECT OCCUPIED SUITE / ROOM:</Text>
            {occupiedRooms.length === 0 ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  No in-house guests currently available for room delivery.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomsScroll}
              >
                {occupiedRooms.map((room) => {
                  const isSelected = selectedRoomNumber === room.roomNumber;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRoomNumber(room.roomNumber)}
                      style={[
                        styles.roomSelectPill,
                        isSelected && styles.roomSelectPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roomPillTitle,
                          isSelected && styles.roomPillTitleActive,
                        ]}
                      >
                        Room {room.roomNumber}
                      </Text>
                      <Text
                        style={[
                          styles.roomPillGuest,
                          isSelected && styles.roomPillGuestActive,
                        ]}
                        numberOfLines={1}
                      >
                        {room.currentGuestName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Menu Selection */}
            <Text style={[styles.sectionHeading, { marginTop: spacing.md }]}>
              SELECT DISHES & BEVERAGES:
            </Text>
            <View style={styles.catalogItemsList}>
              {menuCatalog.map((product) => {
                const qty = cartItems[product.id] || 0;
                return (
                  <View key={product.id} style={styles.menuOrderItem}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.menuItemName}>{product.name}</Text>
                      <Text style={styles.menuItemCategory}>
                        {product.category}
                      </Text>
                      <Text style={styles.menuItemPrice}>
                        {formatCurrency(product.price)}
                      </Text>
                    </View>

                    {/* Quantity Selector */}
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateCartQty(product.id, -1)}
                        style={styles.qtyButton}
                        disabled={qty === 0}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>

                      <Text style={styles.qtyValueText}>{qty}</Text>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => updateCartQty(product.id, 1)}
                        style={[styles.qtyButton, styles.qtyButtonPlus]}
                      >
                        <Text style={[styles.qtyButtonText, styles.qtyButtonPlusText]}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Special Instructions */}
            <Input
              label="Kitchen Dietary / Preparation Notes"
              placeholder="e.g. Pure Jain (No onion / garlic), extra crispy naan, serve hot"
              value={dietaryNote}
              onChangeText={setDietaryNote}
              containerStyle={{ marginTop: spacing.md }}
            />

            {/* Cart Live Summary & Fire KOT Button */}
            <View style={styles.cartStickySummary}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartItemsCount}>
                  {cartSummary.itemCount} Items Selected
                </Text>
                <Text style={styles.cartSubtotal}>
                  Subtotal: {formatCurrency(cartSummary.subtotal)}
                </Text>
              </View>

              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartGstLabel}>GST (18% Indian Hospitality)</Text>
                <Text style={styles.cartGstVal}>
                  {formatCurrency(cartSummary.gstAmount)}
                </Text>
              </View>

              <View style={[styles.cartSummaryRow, styles.cartGrandTotalRow]}>
                <Text style={styles.cartGrandLabel}>TOTAL BILLABLE AMOUNT</Text>
                <Text style={styles.cartGrandVal}>
                  {formatCurrency(cartSummary.totalAmount)}
                </Text>
              </View>

              <Button
                title={`Generate KOT & Charge Folio (${formatCurrency(
                  cartSummary.totalAmount
                )})`}
                variant="primary"
                onPress={handleFireKOT}
                disabled={cartSummary.itemCount === 0 || !selectedRoomNumber}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FULL MENU CATALOG                                 */}
        {/* ======================================================== */}
        {activeTab === 'catalog' && (
          <View>
            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {categories.map((cat) => {
                const isActive = selectedCatalogCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCatalogCategory(cat)}
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
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Catalog Grid */}
            <View style={styles.catalogItemsList}>
              {filteredCatalog.map((dish) => (
                <View key={dish.id} style={styles.catalogCard}>
                  <View style={styles.catalogCardHeader}>
                    <Badge label={dish.category} variant="gold" size="sm" />
                    <Text style={styles.catalogPrice}>
                      {formatCurrency(dish.price)}
                    </Text>
                  </View>
                  <Text style={styles.catalogDishName}>{dish.name}</Text>
                  <Text style={styles.catalogDishDesc}>
                    Prepared fresh by royal master chefs with organic farm spices.
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  orderNumberText: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  orderTimeText: {
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
  guestNameText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemsTable: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  itemTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemQtyName: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  itemQty: {
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  itemPrice: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dietaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  dietaryText: {
    ...typography.caption,
    color: colors.goldDark,
    fontWeight: '600',
    flex: 1,
  },
  billBreakdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  billRowTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  billLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  billVal: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalLabel: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  totalVal: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  folioSyncBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  folioSyncText: {
    ...typography.caption,
    color: colors.success,
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '500',
  },
  cardActions: {
    marginTop: spacing.sm,
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
  sectionHeading: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noticeBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  roomsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  roomSelectPill: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    minWidth: 100,
  },
  roomSelectPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  roomPillTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  roomPillTitleActive: {
    color: colors.surface,
  },
  roomPillGuest: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 9,
  },
  roomPillGuestActive: {
    color: colors.goldLight,
  },
  catalogItemsList: {
    marginTop: spacing.xs,
  },
  menuOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  menuItemName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuItemCategory: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  menuItemPrice: {
    ...typography.caption,
    color: colors.accentBlue,
    fontWeight: '700',
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonPlus: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  qtyButtonText: {
    ...typography.h3,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  qtyButtonPlusText: {
    color: colors.surface,
  },
  qtyValueText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginHorizontal: spacing.sm,
    minWidth: 16,
    textAlign: 'center',
  },
  cartStickySummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cartItemsCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  cartSubtotal: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cartGstLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cartGstVal: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cartGrandTotalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cartGrandLabel: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  cartGrandVal: {
    ...typography.h2,
    color: colors.success,
    fontWeight: '800',
  },
  catalogCard: {
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
  catalogPrice: {
    ...typography.h3,
    color: colors.accentBlue,
    fontWeight: '700',
  },
  catalogDishName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  catalogDishDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
