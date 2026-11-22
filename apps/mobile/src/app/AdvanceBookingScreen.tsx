/**
 * ResortOS - Advance Booking & Event Room Allocation Module
 * Unified reservations console supporting Normal Room Bookings and
 * Event Room Bookings (Required vs Allocated vs Remaining room tracking).
 */

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
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Booking } from '../types/hotel';

export const AdvanceBookingScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    bookings,
    rooms,
    selectedHotel,
    createBooking,
    cancelBooking,
  } = useHotel();

  // Mode: 'normal' vs 'event'
  const [activeTab, setActiveTab] = useState<'normal' | 'event'>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [bookingType, setBookingType] = useState<'normal' | 'event'>('normal');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+91 ');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [checkInDate, setCheckInDate] = useState('2026-11-20');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-23');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [roomType, setRoomType] = useState('Deluxe Room');
  const [totalRoomsCount, setTotalRoomsCount] = useState('1');
  const [roomPrice, setRoomPrice] = useState('2500');
  const [advanceAmount, setAdvanceAmount] = useState('2500');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Event specific fields
  const [eventName, setEventName] = useState('');
  const [requiredRooms, setRequiredRooms] = useState('15');
  const [allocatedRooms, setAllocatedRooms] = useState('10');

  // Additional Allocation Modal
  const [allocateModalVisible, setAllocateModalVisible] = useState(false);
  const [selectedEventBooking, setSelectedEventBooking] = useState<Booking | null>(null);
  const [extraRoomsCount, setExtraRoomsCount] = useState('2');

  const roomTypeOptions = [
    'Deluxe Room',
    'Super Deluxe Room',
    'Executive Suite',
    'Family Suite',
    'Deluxe AC Room',
    'Standard Room',
  ];

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const isEvent = b.bookingType === 'event' || Boolean(b.eventName);
      if (activeTab === 'normal' && isEvent) return false;
      if (activeTab === 'event' && !isEvent) return false;

      const matchesSearch =
        b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.eventName && b.eventName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [bookings, activeTab, searchQuery]);

  const openAddModal = (type: 'normal' | 'event') => {
    setBookingType(type);
    setGuestName('');
    setGuestPhone('+91 ');
    setGuestEmail('');
    setGuestAddress('');
    setCheckInDate('2026-11-20');
    setCheckOutDate('2026-11-23');
    setAdults(type === 'event' ? '25' : '2');
    setChildren(type === 'event' ? '5' : '0');
    setRoomType('Deluxe Room');
    setTotalRoomsCount(type === 'event' ? '10' : '1');
    setRoomPrice('2500');
    setAdvanceAmount(type === 'event' ? '25000' : '2500');
    setPaymentMethod('UPI');
    setSpecialNotes('');
    setEventName(type === 'event' ? 'Mittal Family Wedding' : '');
    setRequiredRooms('15');
    setAllocatedRooms('10');
    setShowAddModal(true);
  };

  const handleCreateBooking = async () => {
    if (submitting) return;

    if (!guestName.trim()) {
      Alert.alert('Required Field', 'Please enter guest / customer name');
      return;
    }
    if (bookingType === 'event' && !eventName.trim()) {
      Alert.alert('Required Field', 'Please enter event name');
      return;
    }

    const price = parseFloat(roomPrice) || 2500;
    const count = parseInt(totalRoomsCount, 10) || 1;
    const req = parseInt(requiredRooms, 10) || 0;
    const alloc = parseInt(allocatedRooms, 10) || count;
    const rem = Math.max(0, req - alloc);
    const advance = parseFloat(advanceAmount) || 0;

    setSubmitting(true);
    try {
      await createBooking({
        hotelId: selectedHotel.id,
        guestName,
        guestPhone,
        guestEmail: guestEmail || `${guestName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        roomCategory: roomType as any,
        checkInDate,
        checkOutDate,
        nightsCount: 3,
        numberOfGuests: parseInt(adults, 10) + parseInt(children, 10),
        status: 'confirmed',
        totalAmount: price * (bookingType === 'event' ? alloc : count) * 3,
        depositPaid: advance,
        paymentStatus: advance > 0 ? 'partial' : 'unpaid',
        specialRequests: specialNotes,
        bookingType,
        eventName: bookingType === 'event' ? eventName : undefined,
        requiredRooms: bookingType === 'event' ? req : undefined,
        allocatedRooms: bookingType === 'event' ? alloc : undefined,
        remainingRooms: bookingType === 'event' ? rem : undefined,
        roomPrice: price,
        advanceAmount: advance,
      });

      setShowAddModal(false);
      Alert.alert('Success', 'Booking confirmed and recorded in database.');
    } catch (err: any) {
      console.error('Failed to create booking:', err);
      Alert.alert(
        'Database Error',
        err?.message || 'Failed to persist booking to TiDB Cloud. Please check your connection and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openAllocateModal = (booking: Booking) => {
    setSelectedEventBooking(booking);
    setExtraRoomsCount('1');
    setAllocateModalVisible(true);
  };

  const handleSaveAdditionalAllocation = () => {
    if (!selectedEventBooking) return;
    const extra = parseInt(extraRoomsCount, 10) || 0;
    if (extra <= 0) {
      Alert.alert('Invalid Count', 'Please enter a valid room count');
      return;
    }

    const currentAlloc = selectedEventBooking.allocatedRooms || selectedEventBooking.numberOfGuests || 1;
    const required = selectedEventBooking.requiredRooms || currentAlloc;
    const newAlloc = currentAlloc + extra;
    const newRem = Math.max(0, required - newAlloc);

    selectedEventBooking.allocatedRooms = newAlloc;
    selectedEventBooking.remainingRooms = newRem;

    setAllocateModalVisible(false);
    Alert.alert('Allocation Updated', `${extra} additional rooms successfully allocated.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Advance Bookings"
        subtitle={selectedHotel.name}
        hotelBadge={selectedHotel.code}
        showBack
        onBack={goBack}
        rightAction={
          <Button
            title={activeTab === 'normal' ? '+ New Booking' : '+ New Event'}
            size="sm"
            variant="primary"
            onPress={() => openAddModal(activeTab)}
          />
        }
      />

      {/* Mode Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'normal' && styles.tabBtnActive]}
          onPress={() => setActiveTab('normal')}
        >
          <Icon name="calendar" size={16} color={activeTab === 'normal' ? colors.primaryNavy : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'normal' && styles.tabTextActive]}>
            Room Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'event' && styles.tabBtnActive]}
          onPress={() => setActiveTab('event')}
        >
          <Icon name="users" size={16} color={activeTab === 'event' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'event' && styles.tabTextActiveEvent]}>
            Event Room Booking
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search Bar */}
        <Input
          placeholder={
            activeTab === 'normal'
              ? 'Search guest name or reference...'
              : 'Search event name, customer or contact...'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="calendar"
          containerStyle={styles.searchBar}
        />

        {/* Tab Notice */}
        {activeTab === 'event' && (
          <View style={styles.eventNotice}>
            <Icon name="info" size={16} color="#7C3AED" />
            <Text style={styles.eventNoticeText}>
              Event Room Allocation tracks Required Rooms vs Allocated Rooms vs Remaining Rooms for large groups.
            </Text>
          </View>
        )}

        {/* Bookings List */}
        <Text style={styles.sectionHeader}>
          {activeTab === 'normal'
            ? `Individual Guest Bookings (${filteredBookings.length})`
            : `Event Group Allocations (${filteredBookings.length})`}
        </Text>

        {filteredBookings.map((b) => {
          const isEvent = b.bookingType === 'event' || Boolean(b.eventName);
          const req = b.requiredRooms || 15;
          const alloc = b.allocatedRooms || 10;
          const rem = b.remainingRooms !== undefined ? b.remainingRooms : Math.max(0, req - alloc);

          return (
            <Card key={b.id} padding="lg" variant="elevated" style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.identityBlock}>
                  {isEvent ? (
                    <>
                      <Text style={styles.eventName}>{b.eventName || 'Event Group Booking'}</Text>
                      <Text style={styles.customerSub}>
                        Host: {b.guestName} • {b.guestPhone}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.guestName}>{b.guestName}</Text>
                      <Text style={styles.customerSub}>
                        {b.bookingReference} • {b.roomCategory || 'Deluxe Room'}
                      </Text>
                    </>
                  )}
                </View>

                <Badge
                  label={b.status.toUpperCase()}
                  variant={b.status === 'confirmed' ? 'primary' : 'success'}
                  size="sm"
                />
              </View>

              {/* EVENT ALLOCATION COUNTERS (SECTION 11 MANDATE) */}
              {isEvent && (
                <View style={styles.allocationBox}>
                  <View style={styles.allocCol}>
                    <Text style={styles.allocNum}>{req}</Text>
                    <Text style={styles.allocLabel}>Required</Text>
                  </View>
                  <View style={styles.allocDivider} />
                  <View style={styles.allocCol}>
                    <Text style={[styles.allocNum, { color: '#047857' }]}>{alloc}</Text>
                    <Text style={styles.allocLabel}>Allocated</Text>
                  </View>
                  <View style={styles.allocDivider} />
                  <View style={styles.allocCol}>
                    <Text style={[styles.allocNum, { color: rem > 0 ? '#DC2626' : '#047857' }]}>
                      {rem}
                    </Text>
                    <Text style={styles.allocLabel}>Remaining</Text>
                  </View>
                </View>
              )}

              {/* Date & Stay Details */}
              <View style={styles.stayDetails}>
                <View style={styles.stayRow}>
                  <Icon name="clock" size={14} color={colors.textSecondary} />
                  <Text style={styles.stayText}>
                    {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)} ({b.nightsCount || 3} Nights)
                  </Text>
                </View>
                <View style={styles.stayRow}>
                  <Icon name="user" size={14} color={colors.textSecondary} />
                  <Text style={styles.stayText}>
                    {b.numberOfGuests || 2} Total Guests {b.roomNumber ? `• Assigned Room: ${b.roomNumber}` : ''}
                  </Text>
                </View>
              </View>

              {/* Financial Breakdown */}
              <View style={styles.financeBox}>
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Total Booking Amount:</Text>
                  <Text style={styles.financeVal}>{formatCurrency(b.totalAmount)}</Text>
                </View>
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Advance Paid:</Text>
                  <Text style={[styles.financeVal, { color: '#047857' }]}>
                    {formatCurrency(b.depositPaid)}
                  </Text>
                </View>
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Remaining Balance Due:</Text>
                  <Text style={[styles.financeVal, { color: '#DC2626', fontWeight: '800' }]}>
                    {formatCurrency(Math.max(0, b.totalAmount - b.depositPaid))}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                {isEvent && rem > 0 && (
                  <TouchableOpacity
                    style={styles.allocateBtn}
                    onPress={() => openAllocateModal(b)}
                  >
                    <Icon name="plus" size={14} color="#7C3AED" />
                    <Text style={styles.allocateBtnText}>Allocate More Rooms</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    Alert.alert('Cancel Booking', `Cancel reservation for ${b.guestName}?`, [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Cancel Reservation',
                        style: 'destructive',
                        onPress: () => cancelBooking(b.id),
                      },
                    ]);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {filteredBookings.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Reservations Found</Text>
            <Text style={styles.emptyDesc}>No active bookings matching your criteria.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Booking Modal (Normal or Event) */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {bookingType === 'normal' ? 'New Room Reservation' : 'New Event Room Booking'}
              </Text>
              <TouchableOpacity
                onPress={() => !submitting && setShowAddModal(false)}
                disabled={submitting}
              >
                <Icon name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {bookingType === 'event' && (
                <Input
                  label="Event Name *"
                  placeholder="e.g. Singhania Wedding Reception"
                  value={eventName}
                  onChangeText={setEventName}
                />
              )}

              <Input
                label={bookingType === 'event' ? 'Primary Customer / Host Name *' : 'Guest Full Name *'}
                placeholder="e.g. Amitabh Sengupta"
                value={guestName}
                onChangeText={setGuestName}
              />

              <Input
                label="Mobile Phone *"
                placeholder="+91 98290 11223"
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
              />

              <Input
                label="Email Address (Optional)"
                placeholder="guest@gmail.com"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
              />

              <View style={styles.halfRow}>
                <Input
                  label="Check-in Date"
                  value={checkInDate}
                  onChangeText={setCheckInDate}
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Check-out Date"
                  value={checkOutDate}
                  onChangeText={setCheckOutDate}
                  containerStyle={styles.halfInput}
                />
              </View>

              {/* Event Room Counts */}
              {bookingType === 'event' ? (
                <View style={styles.halfRow}>
                  <Input
                    label="Total Required Rooms *"
                    placeholder="20"
                    value={requiredRooms}
                    onChangeText={setRequiredRooms}
                    keyboardType="numeric"
                    containerStyle={styles.halfInput}
                  />
                  <Input
                    label="Initial Allocated Rooms *"
                    placeholder="15"
                    value={allocatedRooms}
                    onChangeText={setAllocatedRooms}
                    keyboardType="numeric"
                    containerStyle={styles.halfInput}
                  />
                </View>
              ) : (
                <View style={styles.halfRow}>
                  <Input
                    label="Number of Rooms"
                    value={totalRoomsCount}
                    onChangeText={setTotalRoomsCount}
                    keyboardType="numeric"
                    containerStyle={styles.halfInput}
                  />
                  <Input
                    label="Adults / Children"
                    value={`${adults} Adults, ${children} Children`}
                    onChangeText={(t) => setAdults(t)}
                    containerStyle={styles.halfInput}
                  />
                </View>
              )}

              {/* Room Type Selector */}
              <Text style={styles.formSectionLabel}>Room Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomTypeScroll}>
                {roomTypeOptions.map((rt) => (
                  <TouchableOpacity
                    key={rt}
                    style={[styles.typePill, roomType === rt && styles.typePillActive]}
                    onPress={() => setRoomType(rt)}
                  >
                    <Text style={[styles.typePillText, roomType === rt && styles.typePillTextActive]}>
                      {rt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.halfRow}>
                <Input
                  label="Room Rate / Night (₹)"
                  value={roomPrice}
                  onChangeText={setRoomPrice}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Advance Amount (₹)"
                  value={advanceAmount}
                  onChangeText={setAdvanceAmount}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              {/* Payment Method */}
              <Text style={styles.formSectionLabel}>Advance Payment Mode *</Text>
              <View style={styles.payModeRow}>
                {(['UPI', 'Cash', 'Card'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.payModeBtn, paymentMethod === m && styles.payModeBtnActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.payModeText, paymentMethod === m && styles.payModeTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Special Requests / Notes"
                placeholder="e.g. Ground floor preferred, vegetarian food"
                value={specialNotes}
                onChangeText={setSpecialNotes}
              />

              <Button
                title={
                  submitting
                    ? 'Saving to Database...'
                    : bookingType === 'event'
                    ? 'Confirm Event Room Booking'
                    : 'Confirm Room Booking'
                }
                loading={submitting}
                disabled={submitting}
                onPress={handleCreateBooking}
                variant="primary"
                size="lg"
                style={styles.modalSaveBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Allocate Additional Rooms Modal */}
      <Modal visible={allocateModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, styles.smallModal]}>
            <Text style={styles.modalTitle}>Allocate Additional Rooms</Text>
            <Text style={styles.eventSubTitle}>
              {selectedEventBooking?.eventName} • {selectedEventBooking?.guestName}
            </Text>

            <View style={styles.allocDetailsRow}>
              <Text style={styles.allocDetailLabel}>Required: {selectedEventBooking?.requiredRooms}</Text>
              <Text style={styles.allocDetailLabel}>Currently Allocated: {selectedEventBooking?.allocatedRooms}</Text>
              <Text style={[styles.allocDetailLabel, { color: '#DC2626', fontWeight: '700' }]}>
                Remaining: {selectedEventBooking?.remainingRooms}
              </Text>
            </View>

            <Input
              label="Additional Rooms to Allocate"
              placeholder="e.g. 2"
              value={extraRoomsCount}
              onChangeText={setExtraRoomsCount}
              keyboardType="numeric"
              containerStyle={{ marginVertical: spacing.md }}
            />

            <View style={styles.modalActionsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setAllocateModalVisible(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Confirm Allocation"
                variant="primary"
                onPress={handleSaveAdditionalAllocation}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    ...typography.subtitle2,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primaryNavy,
    fontWeight: '800',
  },
  tabTextActiveEvent: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  searchBar: {
    marginBottom: spacing.sm,
  },
  eventNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  eventNoticeText: {
    ...typography.captionMedium,
    color: '#6D28D9',
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  bookingCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  identityBlock: {
    flex: 1,
  },
  eventName: {
    ...typography.subtitle1,
    color: '#7C3AED',
    fontWeight: '800',
  },
  guestName: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  customerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  allocationBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  allocCol: {
    alignItems: 'center',
    flex: 1,
  },
  allocNum: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  allocLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  allocDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  stayDetails: {
    marginBottom: spacing.sm,
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stayText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  financeBox: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  financeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  financeVal: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.sm,
  },
  allocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  allocateBtnText: {
    ...typography.captionMedium,
    color: '#7C3AED',
    marginLeft: 4,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    ...typography.captionMedium,
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '92%',
    ...shadows.lg,
  },
  smallModal: {
    maxHeight: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  eventSubTitle: {
    ...typography.captionMedium,
    color: '#7C3AED',
    marginTop: 2,
  },
  allocDetailsRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  allocDetailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  halfRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  formSectionLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roomTypeScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    marginRight: spacing.xs,
  },
  typePillActive: {
    backgroundColor: colors.primaryNavy,
  },
  typePillText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  payModeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  payModeBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  payModeBtnActive: {
    backgroundColor: '#059669',
  },
  payModeText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  payModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSaveBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
});

export default AdvanceBookingScreen;
