import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Booking, Room } from '../../types/hotel';
import { colors } from '../../theme/colors';
import { Icon } from '../common/Icon';

interface DashboardCalendarProps {
  hotelId: string;
  hotelName: string;
  bookings: Booking[];
  rooms: Room[];
  onSelectBooking?: (booking: Booking) => void;
  onSelectRoom?: (room: Room) => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  hotelId,
  hotelName,
  bookings,
  rooms,
  onSelectBooking,
  onSelectRoom,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Local Indian standard date calculation
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

  const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState<number>(todayYear || 2026);
  const [currentMonth, setCurrentMonth] = useState<number>((todayMonth || 11) - 1); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals for deep-dive inspection
  const [activeModalBooking, setActiveModalBooking] = useState<Booking | null>(null);
  const [activeModalRoom, setActiveModalRoom] = useState<Room | null>(null);

  // Filter bookings strictly for the active hotel (or all if hotelId is 'all')
  const hotelBookings = useMemo(() => {
    if (hotelId === 'all') return bookings;
    return bookings.filter((b) => b.hotelId === hotelId);
  }, [bookings, hotelId]);

  // Map of rooms for quick lookup
  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((r) => {
      map.set(r.id, r);
      map.set(r.roomNumber, r);
    });
    return map;
  }, [rooms]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth - 1);
    setSelectedDate(todayStr);
  };

  // Month metadata
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Calendar cells
  const calendarCells = useMemo(() => {
    const cells: { day: number | null; dateStr: string | null }[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const monthFormatted = String(currentMonth + 1).padStart(2, '0');
      const dayFormatted = String(d).padStart(2, '0');
      cells.push({
        day: d,
        dateStr: `${currentYear}-${monthFormatted}-${dayFormatted}`,
      });
    }
    return cells;
  }, [currentYear, currentMonth, firstDayOfWeek, daysInMonth]);

  // Pre-calculate date-wise indicators
  const dateIndicators = useMemo(() => {
    const map: Record<
      string,
      { hasCheckIn: boolean; hasCheckOut: boolean; hasOccupied: boolean; hasUpcoming: boolean }
    > = {};

    hotelBookings.forEach((b) => {
      if (b.status === 'cancelled') return;

      // Check-in day
      if (b.checkInDate) {
        if (!map[b.checkInDate]) {
          map[b.checkInDate] = { hasCheckIn: false, hasCheckOut: false, hasOccupied: false, hasUpcoming: false };
        }
        map[b.checkInDate].hasCheckIn = true;
      }

      // Check-out day
      if (b.checkOutDate) {
        if (!map[b.checkOutDate]) {
          map[b.checkOutDate] = { hasCheckIn: false, hasCheckOut: false, hasOccupied: false, hasUpcoming: false };
        }
        map[b.checkOutDate].hasCheckOut = true;
      }

      // Range stays
      if (b.checkInDate && b.checkOutDate) {
        // Find dates strictly between checkInDate and checkOutDate
        const start = new Date(b.checkInDate);
        const end = new Date(b.checkOutDate);
        const cur = new Date(start);
        cur.setDate(cur.getDate() + 1);

        while (cur < end) {
          const dStr = cur.toISOString().split('T')[0];
          if (!map[dStr]) {
            map[dStr] = { hasCheckIn: false, hasCheckOut: false, hasOccupied: false, hasUpcoming: false };
          }
          if (b.status === 'checked_in') {
            map[dStr].hasOccupied = true;
          } else {
            map[dStr].hasUpcoming = true;
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    });

    return map;
  }, [hotelBookings]);

  // Bookings on the selected date
  const bookingsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];

    return hotelBookings.filter((b) => {
      if (b.status === 'cancelled') return false;

      // Matches if checkInDate is selectedDate, checkOutDate is selectedDate, or falls within [checkInDate, checkOutDate]
      const isCheckIn = b.checkInDate === selectedDate;
      const isCheckOut = b.checkOutDate === selectedDate;
      const isDuringStay =
        b.checkInDate &&
        b.checkOutDate &&
        selectedDate > b.checkInDate &&
        selectedDate < b.checkOutDate;

      return isCheckIn || isCheckOut || isDuringStay;
    });
  }, [hotelBookings, selectedDate]);

  // Formatted Selected Date label
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Status badge style helper
  const getBookingTag = (b: Booking, forDate: string) => {
    if (b.checkInDate === forDate) {
      return { text: 'Check-in Today', bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
    }
    if (b.checkOutDate === forDate) {
      return { text: 'Check-out Today', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' };
    }
    if (b.status === 'checked_in') {
      return { text: 'Occupied Stay', bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC' };
    }
    return { text: 'Upcoming Stay', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
  };

  const getPaymentBadge = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return { text: 'PAID', bg: '#ECFDF5', color: '#047857' };
      case 'partial':
        return { text: 'PARTIAL', bg: '#FFFBEB', color: '#B45309' };
      default:
        return { text: 'PENDING', bg: '#FEF2F2', color: '#B91C1C' };
    }
  };

  const handleRoomClick = (roomNumber?: string, roomId?: string) => {
    const room = (roomId && roomMap.get(roomId)) || (roomNumber && roomMap.get(roomNumber));
    if (room) {
      if (onSelectRoom) {
        onSelectRoom(room);
      } else {
        setActiveModalRoom(room);
      }
    }
  };

  const handleBookingClick = (b: Booking) => {
    if (onSelectBooking) {
      onSelectBooking(b);
    } else {
      setActiveModalBooking(b);
    }
  };

  return (
    <View style={styles.container}>
      {/* Calendar Header with Navigation */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View style={styles.calendarIconBg}>
              <Icon name="calendar" size={18} color={colors.primaryNavy} />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <Text style={styles.headerSubtitle}>
                {hotelName} • Reservation Planner
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={handleGoToday}
            activeOpacity={0.7}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-right" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body: Desktop 2-column or Mobile stack */}
      <View style={[styles.bodyLayout, isDesktop && styles.bodyDesktopLayout]}>
        {/* Left Column: Calendar Grid */}
        <View style={[styles.calendarGridContainer, isDesktop && styles.calendarGridDesktop]}>
          {/* Day Names Header */}
          <View style={styles.daysOfWeekRow}>
            {daysOfWeek.map((day, idx) => (
              <View key={day} style={styles.dayOfWeekCell}>
                <Text
                  style={[
                    styles.dayOfWeekText,
                    (idx === 0 || idx === 6) && styles.dayOfWeekWeekend,
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid Cells */}
          <View style={styles.daysGrid}>
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return <View key={`empty-${idx}`} style={styles.emptyDayCell} />;
              }

              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;
              const indicators = dateIndicators[cell.dateStr];

              return (
                <TouchableOpacity
                  key={cell.dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDate(cell.dateStr!)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isToday && styles.dayNumberTextToday,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>

                  {/* Dot Indicators */}
                  {indicators && (
                    <View style={styles.dotsRow}>
                      {indicators.hasCheckIn && (
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                      )}
                      {indicators.hasCheckOut && (
                        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                      )}
                      {indicators.hasOccupied && (
                        <View style={[styles.dot, { backgroundColor: '#6366F1' }]} />
                      )}
                      {indicators.hasUpcoming && (
                        <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Check-in</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Check-out</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.legendText}>Occupied</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
              <Text style={styles.legendText}>Upcoming</Text>
            </View>
          </View>
        </View>

        {/* Right Column: Selected Date Booking Details Panel */}
        <View style={[styles.detailsPanel, isDesktop && styles.detailsPanelDesktop]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelDateLabel}>Selected Date</Text>
              <Text style={styles.panelDateValue}>{formattedSelectedDate}</Text>
            </View>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>
                {bookingsForSelectedDate.length} {bookingsForSelectedDate.length === 1 ? 'Booking' : 'Bookings'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.bookingsListScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {bookingsForSelectedDate.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="calendar" size={28} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No bookings scheduled</Text>
                <Text style={styles.emptySubtitle}>
                  No check-ins, check-outs, or active stays for this date.
                </Text>
              </View>
            ) : (
              bookingsForSelectedDate.map((b) => {
                const tag = getBookingTag(b, selectedDate);
                const payBadge = getPaymentBadge(b.paymentStatus);

                return (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.bookingCard}
                    onPress={() => handleBookingClick(b)}
                    activeOpacity={0.7}
                  >
                    {/* Top Row: Guest Name & Event Badge */}
                    <View style={styles.bookingCardTop}>
                      <View style={styles.guestInfoCol}>
                        <Text style={styles.guestNameText} numberOfLines={1}>
                          {b.guestName}
                        </Text>
                        <View style={styles.guestMetaRow}>
                          <Icon name="phone" size={13} color={colors.textSecondary} />
                          <Text style={styles.guestPhoneText}>{b.guestPhone}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.eventTag,
                          { backgroundColor: tag.bg, borderColor: tag.border },
                        ]}
                      >
                        <Text style={[styles.eventTagText, { color: tag.color }]}>
                          {tag.text}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Room Number & Guests & Status */}
                    <View style={styles.bookingCardMiddle}>
                      {/* Clickable Room Chip */}
                      <TouchableOpacity
                        style={styles.roomChip}
                        onPress={() => handleRoomClick(b.roomNumber, b.roomId)}
                        activeOpacity={0.8}
                      >
                        <Icon name="bed" size={14} color={colors.primaryNavy} />
                        <Text style={styles.roomChipText}>
                          Room {b.roomNumber || 'TBD'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.guestsPill}>
                        <Icon name="users" size={13} color={colors.textSecondary} />
                        <Text style={styles.guestsPillText}>
                          {b.numberOfGuests} {b.numberOfGuests === 1 ? 'Guest' : 'Guests'}
                        </Text>
                      </View>

                      <View style={[styles.payBadge, { backgroundColor: payBadge.bg }]}>
                        <Text style={[styles.payBadgeText, { color: payBadge.color }]}>
                          {payBadge.text}
                        </Text>
                      </View>
                    </View>

                    {/* Dates Banner */}
                    <View style={styles.datesBanner}>
                      <View style={styles.dateCol}>
                        <Text style={styles.dateColLabel}>CHECK-IN</Text>
                        <Text style={styles.dateColValue}>{b.checkInDate}</Text>
                      </View>
                      <View style={styles.dateArrowCol}>
                        <Icon name="chevron-right" size={14} color={colors.textMuted} />
                      </View>
                      <View style={styles.dateCol}>
                        <Text style={styles.dateColLabel}>CHECK-OUT</Text>
                        <Text style={styles.dateColValue}>{b.checkOutDate}</Text>
                      </View>
                      <View style={styles.amountCol}>
                        <Text style={styles.amountColLabel}>TOTAL</Text>
                        <Text style={styles.amountColValue}>
                          ₹{b.totalAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* Booking Detail Modal */}
      {activeModalBooking && (
        <Modal
          visible={!!activeModalBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModalBooking(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Booking Details</Text>
                  <Text style={styles.modalRefText}>
                    Ref: {activeModalBooking.bookingReference}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActiveModalBooking(null)}
                >
                  <Icon name="x" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent}>
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel}>Guest Name</Text>
                  <Text style={styles.modalFieldValue}>{activeModalBooking.guestName}</Text>
                </View>

                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Phone</Text>
                    <Text style={styles.modalFieldValue}>{activeModalBooking.guestPhone}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Room Assigned</Text>
                    <Text style={[styles.modalFieldValue, { color: colors.primaryNavy, fontWeight: '700' }]}>
                      Room {activeModalBooking.roomNumber || 'Not Assigned'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Check-in Date</Text>
                    <Text style={styles.modalFieldValue}>{activeModalBooking.checkInDate}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Check-out Date</Text>
                    <Text style={styles.modalFieldValue}>{activeModalBooking.checkOutDate}</Text>
                  </View>
                </View>

                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Status</Text>
                    <Text style={styles.modalFieldValue}>
                      {activeModalBooking.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Guests Count</Text>
                    <Text style={styles.modalFieldValue}>{activeModalBooking.numberOfGuests} Guests</Text>
                  </View>
                </View>

                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Payment Status</Text>
                    <Text style={styles.modalFieldValue}>{activeModalBooking.paymentStatus.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Total Amount</Text>
                    <Text style={[styles.modalFieldValue, { fontWeight: '700', color: colors.success }]}>
                      ₹{activeModalBooking.totalAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {activeModalBooking.specialRequests && (
                  <View style={styles.modalFieldGroup}>
                    <Text style={styles.modalFieldLabel}>Special Requests / Notes</Text>
                    <Text style={styles.modalFieldNotes}>{activeModalBooking.specialRequests}</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setActiveModalBooking(null)}
              >
                <Text style={styles.modalDoneButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Room Detail Modal */}
      {activeModalRoom && (
        <Modal
          visible={!!activeModalRoom}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModalRoom(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Room {activeModalRoom.roomNumber}</Text>
                  <Text style={styles.modalRefText}>{activeModalRoom.category}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActiveModalRoom(null)}
                >
                  <Icon name="x" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScrollContent}>
                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Status</Text>
                    <Text style={[styles.modalFieldValue, { fontWeight: '700', textTransform: 'capitalize' }]}>
                      {activeModalRoom.status}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Housekeeping</Text>
                    <Text style={[styles.modalFieldValue, { textTransform: 'capitalize' }]}>
                      {activeModalRoom.housekeepingStatus}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Floor</Text>
                    <Text style={styles.modalFieldValue}>Floor {activeModalRoom.floor}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Rate / Night</Text>
                    <Text style={[styles.modalFieldValue, { fontWeight: '700', color: colors.primaryNavy }]}>
                      ₹{activeModalRoom.ratePerNight.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {activeModalRoom.currentGuestName && (
                  <View style={styles.modalFieldGroup}>
                    <Text style={styles.modalFieldLabel}>Current Guest</Text>
                    <Text style={styles.modalFieldValue}>{activeModalRoom.currentGuestName}</Text>
                  </View>
                )}

                {activeModalRoom.amenities && activeModalRoom.amenities.length > 0 && (
                  <View style={styles.modalFieldGroup}>
                    <Text style={styles.modalFieldLabel}>Amenities</Text>
                    <Text style={styles.modalFieldNotes}>
                      {activeModalRoom.amenities.join(' • ')}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setActiveModalRoom(null)}
              >
                <Text style={styles.modalDoneButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyLayout: {
    flexDirection: 'column',
    marginTop: 12,
    gap: 16,
  },
  bodyDesktopLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  calendarGridContainer: {
    flex: 1,
  },
  calendarGridDesktop: {
    flex: 1.15,
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dayOfWeekWeekend: {
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 48,
  },
  dayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
    marginVertical: 1,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  dayCellSelected: {
    backgroundColor: '#1E293B',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  dayNumberTextToday: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 3,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  detailsPanel: {
    flex: 1,
  },
  detailsPanelDesktop: {
    flex: 1,
    paddingLeft: 6,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelDateLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelDateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  badgeCount: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bookingsListScroll: {
    maxHeight: 330,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  guestInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  guestNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  guestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  guestPhoneText: {
    fontSize: 12,
    color: '#64748B',
  },
  eventTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  eventTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingCardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roomChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  guestsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  guestsPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  payBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  payBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  datesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  dateCol: {
    flex: 1.2,
  },
  dateArrowCol: {
    paddingHorizontal: 4,
  },
  dateColLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dateColValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  amountCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  amountColLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  amountColValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalRefText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollContent: {
    maxHeight: 360,
  },
  modalFieldGroup: {
    marginBottom: 12,
  },
  modalFieldRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalFieldValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  modalFieldNotes: {
    fontSize: 13,
    color: '#334155',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
  },
  modalDoneButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
