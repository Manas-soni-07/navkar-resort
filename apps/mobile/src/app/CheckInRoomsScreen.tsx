/**
 * ResortOS - Check-In, Check-Out & Room Operations
 * Fast walk-in check-in with dynamic date-based room selection,
 * detailed check-out billing settlement, room reassignment,
 * and complete room lifecycle management (Available -> Occupied -> Cleaning -> Available).
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
import { formatCurrency } from '../utils/formatters';
import { Room, Booking } from '../types/hotel';

interface ExtraChargeItem {
  id: string;
  name: string;
  amount: number;
}

export const CheckInRoomsScreen: React.FC = () => {
  const { goBack, params, currentScreen } = useNavigation();
  const {
    todayArrivals,
    rooms,
    availableRooms,
    checkInGuest,
    checkOutGuest,
    updateRoomStatus,
    selectedHotel,
    createBooking,
    isRoomAvailable,
    reassignRoom,
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'arrivals' | 'inventory'>(
    currentScreen === 'rooms' || params?.initialTab === 'inventory' ? 'inventory' : 'arrivals'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('ALL');

  // Indian standard date calculation
  const todayStr = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  const tomorrowStr = useMemo(() => {
    try {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    } catch {
      return '2026-11-19';
    }
  }, []);

  // --- Walk-in Check-in Modal State (12 fields required) ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('+91 ');
  const [walkInGuestsCount, setWalkInGuestsCount] = useState('2');
  const [walkInCheckInDate, setWalkInCheckInDate] = useState(todayStr);
  const [walkInCheckOutDate, setWalkInCheckOutDate] = useState(tomorrowStr);
  const [walkInRoomType, setWalkInRoomType] = useState('Deluxe Room');
  const [walkInRoomId, setWalkInRoomId] = useState('');
  const [walkInRoomsCount, setWalkInRoomsCount] = useState('1');
  const [walkInAdvance, setWalkInAdvance] = useState('2500');
  const [walkInTotalAmount, setWalkInTotalAmount] = useState('2500');
  const [walkInPaymentStatus, setWalkInPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInAddress, setWalkInAddress] = useState('');
  const [walkInIdType, setWalkInIdType] = useState('Aadhaar Card');
  const [walkInIdNumber, setWalkInIdNumber] = useState('');

  // --- Room Reassignment & Pending Check-in Modal ---
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedBookingForReassign, setSelectedBookingForReassign] = useState<Booking | null>(null);
  const [reassignRoomId, setReassignRoomId] = useState('');
  const [isCheckInAction, setIsCheckInAction] = useState(false);

  // --- Check-out Folio Settlement Modal ---
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [activeCheckOutBooking, setActiveCheckOutBooking] = useState<Booking | null>(null);
  const [activeCheckOutRoom, setActiveCheckOutRoom] = useState<Room | null>(null);
  const [extraItems, setExtraItems] = useState<ExtraChargeItem[]>([
    { id: '1', name: 'Mineral Water (2 Bottles)', amount: 60 },
    { id: '2', name: 'Evening Chai & Snacks', amount: 220 },
  ]);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraAmount, setNewExtraAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('UPI');

  // Status Filter Options
  const statusFilters = ['ALL', 'available', 'occupied', 'cleaning', 'maintenance'];

  // Filtered rooms for active hotel
  const hotelRooms = useMemo(() => {
    return rooms.filter((r) => r.hotelId === selectedHotel.id);
  }, [rooms, selectedHotel.id]);

  const filteredRooms = useMemo(() => {
    return hotelRooms.filter((r) => {
      const matchesSearch =
        r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.currentGuestName && r.currentGuestName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = roomStatusFilter === 'ALL' || r.status === roomStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [hotelRooms, searchQuery, roomStatusFilter]);

  // Filtered arrivals
  const filteredArrivals = useMemo(() => {
    return todayArrivals.filter((a) => {
      if (a.hotelId !== selectedHotel.id) return false;
      return (
        a.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.roomNumber && a.roomNumber.includes(searchQuery))
      );
    });
  }, [todayArrivals, selectedHotel.id, searchQuery]);

  // Dynamically calculate available rooms for Walk-In dates (strict overlap check)
  const availableRoomsForWalkIn = useMemo(() => {
    return hotelRooms.filter((r) => {
      return isRoomAvailable(r.id, walkInCheckInDate, walkInCheckOutDate);
    });
  }, [hotelRooms, walkInCheckInDate, walkInCheckOutDate, isRoomAvailable]);

  // Selected room details for Walk-In
  const selectedWalkInRoom = useMemo(() => {
    return hotelRooms.find((r) => r.id === walkInRoomId);
  }, [hotelRooms, walkInRoomId]);

  // Nights count calculation for Walk-In
  const walkInNights = useMemo(() => {
    try {
      const d1 = new Date(walkInCheckInDate);
      const d2 = new Date(walkInCheckOutDate);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, [walkInCheckInDate, walkInCheckOutDate]);

  // Handle selecting a room in Walk-In
  const handleSelectWalkInRoom = (room: Room) => {
    setWalkInRoomId(room.id);
    setWalkInRoomType(room.category);
    const calculatedTotal = room.ratePerNight * walkInNights * (parseInt(walkInRoomsCount, 10) || 1);
    setWalkInTotalAmount(calculatedTotal.toString());
    setWalkInAdvance(calculatedTotal.toString());
  };

  // Open Walk-in Modal with fresh defaults
  const handleOpenWalkIn = () => {
    const firstAvail = availableRoomsForWalkIn[0] || hotelRooms.find((r) => r.status === 'available');
    setWalkInGuestName('');
    setWalkInPhone('+91 ');
    setWalkInGuestsCount('2');
    setWalkInCheckInDate(todayStr);
    setWalkInCheckOutDate(tomorrowStr);
    setWalkInRoomsCount('1');
    setWalkInAddress('');
    setWalkInIdNumber('');
    setWalkInNotes('');
    setWalkInPaymentStatus('paid');

    if (firstAvail) {
      setWalkInRoomId(firstAvail.id);
      setWalkInRoomType(firstAvail.category);
      setWalkInTotalAmount(firstAvail.ratePerNight.toString());
      setWalkInAdvance(firstAvail.ratePerNight.toString());
    } else {
      setWalkInRoomId('');
      setWalkInTotalAmount('2500');
      setWalkInAdvance('2500');
    }

    setShowWalkInModal(true);
  };

  // --- Walk-in Submission Handler ---
  const handleWalkInCheckIn = () => {
    if (!walkInGuestName.trim()) {
      Alert.alert('Required Field', 'Please enter guest full name');
      return;
    }
    if (!walkInPhone.trim() || walkInPhone.length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number');
      return;
    }

    // MANDATE 3: Do not allow check-in without a valid room assignment
    if (!walkInRoomId || !selectedWalkInRoom) {
      Alert.alert(
        'Room Selection Required',
        'Please select a valid vacant room number before completing check-in.'
      );
      return;
    }

    // MANDATE 3: Prevent assigning the same room to overlapping bookings
    const isAvail = isRoomAvailable(walkInRoomId, walkInCheckInDate, walkInCheckOutDate);
    if (!isAvail) {
      Alert.alert(
        'Room Not Available',
        `Room ${selectedWalkInRoom.roomNumber} is already reserved or occupied during ${walkInCheckInDate} to ${walkInCheckOutDate}. Please select another room.`
      );
      return;
    }

    const totalAmt = parseFloat(walkInTotalAmount) || (selectedWalkInRoom.ratePerNight * walkInNights);
    const advanceAmt = parseFloat(walkInAdvance) || 0;
    const payStatus: 'paid' | 'partial' | 'unpaid' = advanceAmt >= totalAmt ? 'paid' : advanceAmt > 0 ? 'partial' : 'unpaid';

    // Create a confirmed booking and immediately check-in
    createBooking({
      hotelId: selectedHotel.id,
      guestName: walkInGuestName.trim(),
      guestPhone: walkInPhone.trim(),
      guestEmail: `${walkInGuestName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      roomCategory: selectedWalkInRoom.category,
      roomId: selectedWalkInRoom.id,
      roomNumber: selectedWalkInRoom.roomNumber,
      checkInDate: walkInCheckInDate,
      checkOutDate: walkInCheckOutDate,
      nightsCount: walkInNights,
      numberOfGuests: parseInt(walkInGuestsCount, 10) || 2,
      status: 'checked_in',
      totalAmount: totalAmt,
      depositPaid: advanceAmt,
      paymentStatus: payStatus,
      specialRequests: `Walk-in Guest. ID: ${walkInIdType} (${walkInIdNumber || 'N/A'}). ${walkInNotes}`.trim(),
    });

    // Mark room as occupied
    updateRoomStatus(selectedWalkInRoom.id, 'occupied', 'clean');

    setShowWalkInModal(false);
    Alert.alert(
      'Walk-In Successful',
      `Guest ${walkInGuestName} successfully checked in to Room ${selectedWalkInRoom.roomNumber} (${selectedHotel.name})!`
    );
  };

  // --- Check-In Existing Arrival Handler ---
  const handleArrivalCheckIn = async (arrival: Booking) => {
    // If room is already assigned and available, proceed with check-in
    if (arrival.roomId) {
      const isAvail = isRoomAvailable(arrival.roomId, arrival.checkInDate, arrival.checkOutDate, arrival.id);
      if (isAvail || arrival.status === 'checked_in') {
        const success = await checkInGuest(arrival.id, arrival.roomId);
        if (success) {
          Alert.alert('Check-In Complete', `Guest ${arrival.guestName} checked in to Room ${arrival.roomNumber}.`);
        } else {
          Alert.alert('Check-In Failed', 'Unable to check in. Room may be occupied.');
        }
        return;
      }
    }

    // Room not assigned or occupied - require selecting an available room
    setSelectedBookingForReassign(arrival);
    setIsCheckInAction(true);
    setReassignRoomId('');
    setShowReassignModal(true);
  };

  // --- Open Reassign Room Modal ---
  const handleOpenReassignModal = (booking: Booking) => {
    setSelectedBookingForReassign(booking);
    setIsCheckInAction(false);
    setReassignRoomId(booking.roomId || '');
    setShowReassignModal(true);
  };

  // Available rooms for reassign modal
  const availableRoomsForReassign = useMemo(() => {
    if (!selectedBookingForReassign) return [];
    return hotelRooms.filter((r) => {
      return isRoomAvailable(
        r.id,
        selectedBookingForReassign.checkInDate,
        selectedBookingForReassign.checkOutDate,
        selectedBookingForReassign.id
      );
    });
  }, [hotelRooms, selectedBookingForReassign, isRoomAvailable]);

  // Confirm Room Assignment / Reassignment
  const handleConfirmRoomAssignment = async () => {
    if (!selectedBookingForReassign || !reassignRoomId) {
      Alert.alert('Select Room', 'Please select a room to assign.');
      return;
    }

    const targetRoom = hotelRooms.find((r) => r.id === reassignRoomId);
    if (!targetRoom) return;

    if (isCheckInAction) {
      // Check in with this assigned room
      const success = await checkInGuest(selectedBookingForReassign.id, targetRoom.id);
      setShowReassignModal(false);
      if (success) {
        Alert.alert(
          'Check-In Successful',
          `Room ${targetRoom.roomNumber} assigned and guest ${selectedBookingForReassign.guestName} checked in!`
        );
      } else {
        Alert.alert('Error', 'Failed to complete check-in for this room.');
      }
    } else {
      // Reassign room
      const res = await reassignRoom(selectedBookingForReassign.id, targetRoom.id);
      setShowReassignModal(false);
      if (res.success) {
        Alert.alert(
          'Room Reassigned',
          `Booking for ${selectedBookingForReassign.guestName} reassigned to Room ${targetRoom.roomNumber}.`
        );
      } else {
        Alert.alert('Reassignment Failed', res.message || 'Room is not available.');
      }
    }
  };

  // --- Check-out Modal Opener ---
  const openCheckOutModal = (booking: Booking) => {
    setActiveCheckOutBooking(booking);
    const assignedRoom = hotelRooms.find((r) => r.id === booking.roomId || r.roomNumber === booking.roomNumber);
    setActiveCheckOutRoom(assignedRoom || null);
    setExtraItems([
      { id: '1', name: 'Mineral Water (2 Bottles)', amount: 60 },
      { id: '2', name: 'Evening Tea / Snacks', amount: 220 },
    ]);
    setDiscountAmount('0');
    setPaymentMode('UPI');
    setShowCheckOutModal(true);
  };

  // Check-out calculation (Rent + Extras - Discount + 18% GST - Advance)
  const folioCalc = useMemo(() => {
    if (!activeCheckOutBooking) return { rent: 0, extras: 0, subtotal: 0, discount: 0, tax: 0, advance: 0, balance: 0 };

    const rent = activeCheckOutBooking.totalAmount || 2500;
    const extras = extraItems.reduce((sum, item) => sum + item.amount, 0);
    const disc = parseFloat(discountAmount) || 0;
    const taxable = Math.max(0, rent + extras - disc);
    const tax = Math.round(taxable * 0.18);
    const advance = activeCheckOutBooking.depositPaid || 0;
    const balance = Math.max(0, taxable + tax - advance);

    return { rent, extras, subtotal: rent + extras, discount: disc, tax, advance, balance };
  }, [activeCheckOutBooking, extraItems, discountAmount]);

  const handleAddExtraItem = () => {
    if (!newExtraName.trim() || !newExtraAmount.trim()) return;
    const amt = parseFloat(newExtraAmount) || 0;
    setExtraItems((prev) => [...prev, { id: `${Date.now()}`, name: newExtraName, amount: amt }]);
    setNewExtraName('');
    setNewExtraAmount('');
  };

  const handleConfirmCheckOut = async () => {
    if (!activeCheckOutBooking) return;

    await checkOutGuest(activeCheckOutBooking.id);

    if (activeCheckOutRoom) {
      await updateRoomStatus(activeCheckOutRoom.id, 'cleaning', 'dirty');
    }

    setShowCheckOutModal(false);
    Alert.alert(
      'Checkout Settled & Room Marked for Cleaning',
      `Payment of ${formatCurrency(folioCalc.balance)} recorded via ${paymentMode}.\n\nRoom ${
        activeCheckOutRoom?.roomNumber || 'Assigned Room'
      } is now set to CLEANING status. Manager can mark Available once sanitized.`
    );
  };

  // One-tap Cleaning -> Available transition
  const handleMarkCleanAndAvailable = async (roomId: string, roomNum: string) => {
    await updateRoomStatus(roomId, 'available', 'clean');
    Alert.alert('Room Cleaned', `Room ${roomNum} is now inspected and Available for check-in.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={currentScreen === 'rooms' ? 'Room Management' : 'Check-In & Check-Out'}
        subtitle={`${selectedHotel.name} • ${hotelRooms.length} Rooms`}
        hotelBadge={`${availableRooms.length} AVAILABLE`}
        showBack
        onBack={goBack}
        rightAction={
          <Button
            title="+ Walk-in Check-in"
            size="sm"
            variant="primary"
            onPress={handleOpenWalkIn}
          />
        }
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'arrivals' && styles.tabBtnActive]}
          onPress={() => setActiveTab('arrivals')}
        >
          <Text style={[styles.tabText, activeTab === 'arrivals' && styles.tabTextActive]}>
            In-House Stays & Arrivals ({filteredArrivals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'inventory' && styles.tabBtnActive]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>
            Rooms & Status Grid ({hotelRooms.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search Input */}
        <Input
          placeholder={
            activeTab === 'arrivals'
              ? 'Search guest name, room or booking ref...'
              : 'Search room number or status...'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="key"
          containerStyle={styles.searchBar}
        />

        {/* ============================================================== */}
        {/* ARRIVALS & ACTIVE STAYS VIEW                                   */}
        {/* ============================================================== */}
        {activeTab === 'arrivals' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>TODAY'S GUESTS & ARRIVALS</Text>
              <Text style={styles.sectionCounter}>{filteredArrivals.length} Stays</Text>
            </View>

            {filteredArrivals.length === 0 ? (
              <Card padding="lg" variant="elevated" style={styles.emptyCard}>
                <Icon name="calendar" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No arrivals or stays found</Text>
                <Text style={styles.emptySub}>
                  No bookings scheduled for today or matching your search.
                </Text>
              </Card>
            ) : (
              filteredArrivals.map((arrival) => {
                const isCheckedIn = arrival.status === 'checked_in';

                return (
                  <Card key={arrival.id} padding="lg" variant="elevated" style={styles.stayCard}>
                    <View style={styles.stayTop}>
                      <View style={styles.stayIdentity}>
                        <Text style={styles.guestName}>{arrival.guestName}</Text>
                        <Text style={styles.stayMeta}>
                          {arrival.bookingReference} • {arrival.roomCategory}
                        </Text>
                        <Text style={styles.stayDates}>
                          Stay: {arrival.nightsCount} Nights ({arrival.checkInDate} to {arrival.checkOutDate})
                        </Text>
                        <View style={styles.roomTagRow}>
                          <Icon name="bed" size={14} color={arrival.roomNumber ? '#1E40AF' : '#DC2626'} />
                          <Text style={[styles.roomBadgeText, { color: arrival.roomNumber ? '#1E40AF' : '#DC2626' }]}>
                            {arrival.roomNumber ? `Assigned: Room ${arrival.roomNumber}` : 'Room NOT Assigned'}
                          </Text>
                        </View>
                      </View>

                      <Badge
                        label={isCheckedIn ? 'IN HOUSE' : 'ARRIVAL DUE'}
                        variant={isCheckedIn ? 'success' : 'warning'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.stayBottom}>
                      <View>
                        <Text style={styles.folioAmount}>Rent: {formatCurrency(arrival.totalAmount)}</Text>
                        <Text style={styles.advancePaidText}>
                          Advance: {formatCurrency(arrival.depositPaid)}
                        </Text>
                      </View>

                      <View style={styles.actionButtonGroup}>
                        {/* Reassign Room Button */}
                        <TouchableOpacity
                          style={styles.reassignBtn}
                          onPress={() => handleOpenReassignModal(arrival)}
                        >
                          <Text style={styles.reassignBtnText}>
                            {arrival.roomNumber ? 'Reassign Room' : 'Assign Room'}
                          </Text>
                        </TouchableOpacity>

                        {isCheckedIn ? (
                          <Button
                            title="Check-Out & Settle"
                            size="sm"
                            variant="outline"
                            onPress={() => openCheckOutModal(arrival)}
                          />
                        ) : (
                          <Button
                            title="Check-In Guest"
                            size="sm"
                            variant="primary"
                            onPress={() => handleArrivalCheckIn(arrival)}
                          />
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* ROOM DIRECTORY & CLEANING LIFECYCLE VIEW                       */}
        {/* ============================================================== */}
        {activeTab === 'inventory' && (
          <View>
            {/* Status Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsScroll}>
              {statusFilters.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusPill, roomStatusFilter === st && styles.statusPillActive]}
                  onPress={() => setRoomStatusFilter(st)}
                >
                  <Text style={[styles.statusPillText, roomStatusFilter === st && styles.statusPillTextActive]}>
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {selectedHotel.name.toUpperCase()} ({filteredRooms.length} ROOMS)
              </Text>
              <Text style={styles.cleanHint}>Checkout ➔ Cleaning ➔ Available</Text>
            </View>

            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'available';
              const isOccupied = room.status === 'occupied';
              const isCleaning = room.status === 'cleaning';
              const isMaint = room.status === 'maintenance';

              const badgeVariant = isAvailable
                ? 'success'
                : isOccupied
                ? 'primary'
                : isCleaning
                ? 'warning'
                : 'error';

              return (
                <Card key={room.id} padding="lg" variant="elevated" style={styles.roomCard}>
                  <View style={styles.roomTop}>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomNum}>{room.roomNumber}</Text>
                    </View>
                    <View style={styles.roomDetails}>
                      <View style={styles.roomTitleRow}>
                        <Text style={styles.roomCat}>{room.category}</Text>
                        <Badge label={room.status.toUpperCase()} variant={badgeVariant} size="sm" />
                      </View>
                      <Text style={styles.roomPrice}>
                        {formatCurrency(room.ratePerNight)} / night • Floor {room.floor}
                      </Text>
                      {room.currentGuestName && (
                        <Text style={styles.inHouseGuest}>Current Guest: {room.currentGuestName}</Text>
                      )}
                    </View>
                  </View>

                  {/* Cleaning to Available One-Tap Action */}
                  <View style={styles.roomActionsRow}>
                    {isCleaning && (
                      <TouchableOpacity
                        style={styles.markCleanBtn}
                        onPress={() => handleMarkCleanAndAvailable(room.id, room.roomNumber)}
                      >
                        <Icon name="check-circle" size={14} color="#047857" />
                        <Text style={styles.markCleanText}>Sanitized: Mark Available</Text>
                      </TouchableOpacity>
                    )}

                    {isAvailable && (
                      <TouchableOpacity
                        style={styles.markMaintBtn}
                        onPress={() => updateRoomStatus(room.id, 'maintenance', 'dirty')}
                      >
                        <Icon name="alert-triangle" size={14} color="#DC2626" />
                        <Text style={styles.markMaintText}>Mark Maintenance</Text>
                      </TouchableOpacity>
                    )}

                    {isMaint && (
                      <TouchableOpacity
                        style={styles.markCleanBtn}
                        onPress={() => updateRoomStatus(room.id, 'cleaning', 'dirty')}
                      >
                        <Icon name="rotate-ccw" size={14} color="#047857" />
                        <Text style={styles.markCleanText}>Repair Done: Send to Cleaning</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* WALK-IN CHECK-IN MODAL (ALL 12 MANDATED FIELDS)                */}
      {/* ============================================================== */}
      <Modal visible={showWalkInModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Walk-In Room Booking & Check-In</Text>
                <Text style={styles.modalSub}>{selectedHotel.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWalkInModal(false)}>
                <Icon name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Field 1: Guest Full Name */}
              <Input
                label="1. Guest Full Name *"
                placeholder="e.g. Suresh Singhal"
                value={walkInGuestName}
                onChangeText={setWalkInGuestName}
              />

              {/* Field 2: Mobile Number */}
              <Input
                label="2. Mobile Number *"
                placeholder="+91 98290 12345"
                value={walkInPhone}
                onChangeText={setWalkInPhone}
                keyboardType="phone-pad"
              />

              {/* Field 3: Number of Guests & Field 8: Number of Rooms */}
              <View style={styles.halfRow}>
                <Input
                  label="3. Number of Guests *"
                  placeholder="2"
                  value={walkInGuestsCount}
                  onChangeText={setWalkInGuestsCount}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="8. Number of Rooms"
                  value={walkInRoomsCount}
                  onChangeText={setWalkInRoomsCount}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              {/* Field 4: Check-in Date & Field 5: Check-out Date */}
              <View style={styles.halfRow}>
                <Input
                  label="4. Check-in Date (YYYY-MM-DD) *"
                  value={walkInCheckInDate}
                  onChangeText={setWalkInCheckInDate}
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="5. Check-out Date (YYYY-MM-DD) *"
                  value={walkInCheckOutDate}
                  onChangeText={setWalkInCheckOutDate}
                  containerStyle={styles.halfInput}
                />
              </View>

              {/* DYNAMIC ROOM SELECTION (FIELDS 6 & 7) */}
              <View style={styles.roomSelectContainer}>
                <View style={styles.roomSelectHeader}>
                  <Text style={styles.formSectionLabel}>
                    7. Select Available Room Number * ({availableRoomsForWalkIn.length} Available)
                  </Text>
                  <Text style={styles.roomSelectHint}>
                    Dates: {walkInCheckInDate} to {walkInCheckOutDate} ({walkInNights} {walkInNights === 1 ? 'Night' : 'Nights'})
                  </Text>
                </View>

                {availableRoomsForWalkIn.length === 0 ? (
                  <View style={styles.noRoomsNotice}>
                    <Icon name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.noRoomsText}>
                      No rooms are available for the selected dates. Please adjust dates.
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomPickScroll}>
                    {availableRoomsForWalkIn.map((r) => {
                      const isPicked = walkInRoomId === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[styles.roomPickChip, isPicked && styles.roomPickChipActive]}
                          onPress={() => handleSelectWalkInRoom(r)}
                        >
                          <Text style={[styles.roomPickNum, isPicked && styles.roomPickNumActive]}>
                            Room {r.roomNumber}
                          </Text>
                          <Text style={styles.roomPickCat} numberOfLines={1}>{r.category}</Text>
                          <Text style={styles.roomPickRate}>₹{r.ratePerNight}/n</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Selected Room Banner */}
                {selectedWalkInRoom ? (
                  <View style={styles.selectedRoomBanner}>
                    <Icon name="check-circle" size={16} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedRoomText}>
                        Selected Room: <Text style={{ fontWeight: '800' }}>Room {selectedWalkInRoom.roomNumber}</Text> ({selectedWalkInRoom.category})
                      </Text>
                      <Text style={styles.selectedRoomSub}>
                        Floor {selectedWalkInRoom.floor} • Rate: ₹{selectedWalkInRoom.ratePerNight} / night
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.unselectedRoomBanner}>
                    <Icon name="alert-triangle" size={16} color="#D97706" />
                    <Text style={styles.unselectedRoomText}>
                      Please tap an available room chip above to assign.
                    </Text>
                  </View>
                )}
              </View>

              {/* Field 6: Room Type */}
              <Input
                label="6. Room Type"
                value={walkInRoomType}
                onChangeText={setWalkInRoomType}
              />

              {/* Field 9: Advance Payment & Field 10: Total Amount */}
              <View style={styles.halfRow}>
                <Input
                  label="10. Total Amount (₹) *"
                  value={walkInTotalAmount}
                  onChangeText={setWalkInTotalAmount}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="9. Advance Payment (₹) *"
                  value={walkInAdvance}
                  onChangeText={setWalkInAdvance}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              {/* Field 11: Payment Status Selector */}
              <Text style={styles.formSectionLabel}>11. Payment Status *</Text>
              <View style={styles.payStatusRow}>
                {(['paid', 'partial', 'unpaid'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.payStatusBtn,
                      walkInPaymentStatus === st && styles.payStatusBtnActive,
                    ]}
                    onPress={() => setWalkInPaymentStatus(st)}
                  >
                    <Text
                      style={[
                        styles.payStatusText,
                        walkInPaymentStatus === st && styles.payStatusTextActive,
                      ]}
                    >
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Field 12: Notes & Identification */}
              <Input
                label="12. Notes & Special Requests"
                placeholder="e.g. Early check-in requested, Jain breakfast"
                value={walkInNotes}
                onChangeText={setWalkInNotes}
                multiline
              />

              <Input
                label="Guest Address"
                placeholder="City, State"
                value={walkInAddress}
                onChangeText={setWalkInAddress}
              />

              <View style={styles.halfRow}>
                <Input
                  label="ID Type"
                  value={walkInIdType}
                  onChangeText={setWalkInIdType}
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="ID Number"
                  placeholder="e.g. 4821 9920 1120"
                  value={walkInIdNumber}
                  onChangeText={setWalkInIdNumber}
                  containerStyle={styles.halfInput}
                />
              </View>

              <Button
                title={selectedWalkInRoom ? `Check-In to Room ${selectedWalkInRoom.roomNumber}` : 'Select Room to Check-In'}
                onPress={handleWalkInCheckIn}
                variant="primary"
                size="lg"
                style={styles.modalSaveBtn}
                disabled={!selectedWalkInRoom}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* ROOM ASSIGNMENT & REASSIGNMENT MODAL                           */}
      {/* ============================================================== */}
      <Modal visible={showReassignModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isCheckInAction ? 'Assign Room & Check-In' : 'Reassign Room'}
                </Text>
                <Text style={styles.modalSub}>
                  {selectedBookingForReassign?.guestName} • Stay: {selectedBookingForReassign?.checkInDate} to {selectedBookingForReassign?.checkOutDate}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowReassignModal(false)}>
                <Icon name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionLabel}>
                Available Rooms for these dates ({availableRoomsForReassign.length})
              </Text>

              {availableRoomsForReassign.length === 0 ? (
                <View style={styles.noRoomsNotice}>
                  <Icon name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.noRoomsText}>
                    No rooms are currently available for this stay period.
                  </Text>
                </View>
              ) : (
                <View style={styles.reassignGrid}>
                  {availableRoomsForReassign.map((r) => {
                    const isSelected = reassignRoomId === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.reassignRoomCard, isSelected && styles.reassignRoomCardSelected]}
                        onPress={() => setReassignRoomId(r.id)}
                      >
                        <Text style={[styles.reassignRoomNum, isSelected && styles.reassignRoomNumSelected]}>
                          Room {r.roomNumber}
                        </Text>
                        <Text style={styles.reassignRoomCat}>{r.category}</Text>
                        <Text style={styles.reassignRoomRate}>₹{r.ratePerNight}/night • Floor {r.floor}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Button
                title={isCheckInAction ? 'Confirm Assignment & Check-In' : 'Save Room Reassignment'}
                onPress={handleConfirmRoomAssignment}
                variant="primary"
                size="lg"
                style={styles.modalSaveBtn}
                disabled={!reassignRoomId}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* CHECK-OUT FOLIO SETTLEMENT MODAL                               */}
      {/* ============================================================== */}
      <Modal visible={showCheckOutModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Check-Out & Final Bill</Text>
                <Text style={styles.modalSub}>
                  Room {activeCheckOutRoom?.roomNumber} • {activeCheckOutBooking?.guestName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCheckOutModal(false)}>
                <Icon name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Extra Items List */}
              <Text style={styles.formSectionLabel}>Extra Line Charges (Food, Water, Laundry)</Text>
              {extraItems.map((item) => (
                <View key={item.id} style={styles.extraItemRow}>
                  <Text style={styles.extraItemName}>• {item.name}</Text>
                  <Text style={styles.extraItemAmt}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}

              {/* Add Extra Charge Input */}
              <View style={styles.addExtraRow}>
                <Input
                  placeholder="Add item (e.g. Extra Water, Lunch)"
                  value={newExtraName}
                  onChangeText={setNewExtraName}
                  containerStyle={{ flex: 2, marginRight: spacing.xs }}
                />
                <Input
                  placeholder="Amount ₹"
                  value={newExtraAmount}
                  onChangeText={setNewExtraAmount}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button title="Add" size="sm" variant="outline" onPress={handleAddExtraItem} />
              </View>

              <Input
                label="Discount Amount (₹)"
                placeholder="0"
                value={discountAmount}
                onChangeText={setDiscountAmount}
                keyboardType="numeric"
              />

              {/* BILL CALCULATION SUMMARY */}
              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Base Room Rent Total:</Text>
                  <Text style={styles.billVal}>{formatCurrency(folioCalc.rent)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Extra Food & Water Charges:</Text>
                  <Text style={styles.billVal}>+ {formatCurrency(folioCalc.extras)}</Text>
                </View>
                {folioCalc.discount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: colors.error }]}>Discount Applied:</Text>
                    <Text style={[styles.billVal, { color: colors.error }]}>
                      − {formatCurrency(folioCalc.discount)}
                    </Text>
                  </View>
                )}
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>GST Tax (18%):</Text>
                  <Text style={styles.billVal}>+ {formatCurrency(folioCalc.tax)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: '#047857' }]}>Advance Paid at Check-in:</Text>
                  <Text style={[styles.billVal, { color: '#047857' }]}>
                    − {formatCurrency(folioCalc.advance)}
                  </Text>
                </View>
                <View style={[styles.billRow, styles.finalBalanceRow]}>
                  <Text style={styles.finalBalanceLabel}>Remaining Balance Due:</Text>
                  <Text style={styles.finalBalanceVal}>{formatCurrency(folioCalc.balance)}</Text>
                </View>
              </View>

              {/* Payment Mode Selector */}
              <Text style={styles.formSectionLabel}>Settlement Payment Mode *</Text>
              <View style={styles.payModeRow}>
                {(['UPI', 'Cash', 'Card'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.payModeBtn, paymentMode === m && styles.payModeBtnActive]}
                    onPress={() => setPaymentMode(m)}
                  >
                    <Text style={[styles.payModeText, paymentMode === m && styles.payModeTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={`Settle ${formatCurrency(folioCalc.balance)} & Complete Checkout`}
                onPress={handleConfirmCheckOut}
                variant="primary"
                size="lg"
                style={styles.modalSaveBtn}
              />
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primaryNavy,
  },
  tabText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  searchBar: {
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCounter: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  cleanHint: {
    ...typography.caption,
    color: '#059669',
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontWeight: '700',
  },
  emptySub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  stayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  stayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: spacing.sm,
  },
  stayIdentity: {
    flex: 1,
    marginRight: spacing.sm,
  },
  guestName: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stayMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stayDates: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '600',
    marginTop: 2,
  },
  roomTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roomBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stayBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  folioAmount: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  advancePaidText: {
    ...typography.caption,
    color: '#059669',
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reassignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reassignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  filterPillsScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: spacing.xs,
  },
  statusPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  statusPillText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  roomNum: {
    ...typography.subtitle1,
    color: colors.primaryNavy,
    fontWeight: '800',
  },
  roomDetails: {
    flex: 1,
  },
  roomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCat: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  roomPrice: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inHouseGuest: {
    ...typography.captionMedium,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 2,
  },
  roomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  markCleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  markCleanText: {
    ...typography.captionMedium,
    color: '#047857',
    marginLeft: 4,
    fontWeight: '700',
  },
  markMaintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  markMaintText: {
    ...typography.captionMedium,
    color: '#DC2626',
    marginLeft: 4,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '90%',
    ...shadows.lg,
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
  modalSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formSectionLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  roomSelectContainer: {
    marginVertical: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roomSelectHeader: {
    marginBottom: 6,
  },
  roomSelectHint: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  noRoomsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noRoomsText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  roomPickScroll: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  roomPickChip: {
    padding: 8,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    alignItems: 'center',
    minWidth: 84,
  },
  roomPickChipActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryNavy,
    borderWidth: 2,
  },
  roomPickNum: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  roomPickNumActive: {
    color: colors.primaryNavy,
  },
  roomPickCat: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roomPickRate: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  selectedRoomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 6,
  },
  selectedRoomText: {
    fontSize: 12,
    color: '#065F46',
  },
  selectedRoomSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  unselectedRoomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  unselectedRoomText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  payStatusRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  payStatusBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payStatusBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  payStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  payStatusTextActive: {
    color: '#FFFFFF',
  },
  reassignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  reassignRoomCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
  },
  reassignRoomCardSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryNavy,
    borderWidth: 2,
  },
  reassignRoomNum: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reassignRoomNumSelected: {
    color: colors.primaryNavy,
  },
  reassignRoomCat: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reassignRoomRate: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  halfRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  extraItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  extraItemName: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  extraItemAmt: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  billBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  billLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  billVal: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  finalBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  finalBalanceLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  finalBalanceVal: {
    ...typography.subtitle1,
    color: '#DC2626',
    fontWeight: '800',
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
});

export default CheckInRoomsScreen;
