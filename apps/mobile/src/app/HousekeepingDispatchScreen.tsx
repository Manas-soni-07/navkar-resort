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
import { HousekeepingTicket, TicketType, TicketPriority } from '../types/hotel';

export const HousekeepingDispatchScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    housekeepingTickets,
    createHousekeepingTicket,
    updateHousekeepingTicketStatus,
    rooms,
    staff,
    selectedHotel,
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>('Turnover Cleaning');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [ticketNotes, setTicketNotes] = useState('');

  const ticketTypes: TicketType[] = [
    'Turnover Cleaning',
    'Deep Sanitization',
    'Turndown & Aroma Service',
    'Extra Towels & Linens',
    'Ayurvedic Toiletries Restock',
    'AC & Chiller Maintenance',
  ];

  const priorities: TicketPriority[] = ['urgent', 'high', 'normal'];

  // Housekeeping & Maintenance staff list
  const serviceStaff = useMemo(() => {
    return staff.filter(
      (s) => s.department === 'Housekeeping' || s.department === 'Maintenance'
    );
  }, [staff]);

  // Set default form values
  React.useEffect(() => {
    if (!selectedRoomNumber && rooms.length > 0) {
      setSelectedRoomNumber(rooms[0].roomNumber);
    }
    if (!assignedStaff && serviceStaff.length > 0) {
      setAssignedStaff(serviceStaff[0].fullName);
    }
  }, [rooms, serviceStaff, selectedRoomNumber, assignedStaff]);

  // Metrics
  const metrics = useMemo(() => {
    const pending = housekeepingTickets.filter((t) => t.status === 'pending').length;
    const inProgress = housekeepingTickets.filter((t) => t.status === 'in_progress').length;
    const completed = housekeepingTickets.filter((t) => t.status === 'completed').length;
    const urgentCount = housekeepingTickets.filter(
      (t) => t.priority === 'urgent' && t.status !== 'completed'
    ).length;

    return { pending, inProgress, completed, urgentCount };
  }, [housekeepingTickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return housekeepingTickets.filter((ticket) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        ticket.roomNumber.toLowerCase().includes(q) ||
        ticket.ticketType.toLowerCase().includes(q) ||
        ticket.assignedStaffName.toLowerCase().includes(q) ||
        (ticket.notes && ticket.notes.toLowerCase().includes(q));

      const matchesPriority =
        priorityFilter === 'ALL' || ticket.priority === priorityFilter;

      const matchesStatus =
        statusFilter === 'ALL' || ticket.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [housekeepingTickets, searchQuery, priorityFilter, statusFilter]);

  const handleCreateTicket = () => {
    if (!selectedRoomNumber) {
      Alert.alert('Selection Missing', 'Please select a room.');
      return;
    }

    createHousekeepingTicket({
      hotelId: selectedHotel.id,
      roomNumber: selectedRoomNumber,
      ticketType,
      priority,
      assignedStaffName: assignedStaff || 'Duty Attendant',
      status: 'pending',
      notes: ticketNotes.trim() || undefined,
    });

    Alert.alert(
      'Service Dispatched',
      `Ticket created for Room ${selectedRoomNumber} assigned to ${assignedStaff}!`
    );

    setTicketNotes('');
    setShowAddModal(false);
  };

  const getPriorityBadgeVariant = (p: TicketPriority): 'error' | 'warning' | 'primary' => {
    switch (p) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'primary';
      default:
        return 'primary';
    }
  };

  const getStatusBadgeVariant = (
    s: HousekeepingTicket['status']
  ): 'warning' | 'info' | 'success' => {
    switch (s) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Housekeeping Dispatch"
        subtitle={selectedHotel.name}
        hotelBadge={`${metrics.pending + metrics.inProgress} ACTIVE TASKS`}
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Icon name="plus" size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>New Ticket</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP STATUS CARDS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PENDING QUEUE</Text>
            <Text style={[styles.metricVal, { color: colors.warning }]}>
              {metrics.pending}
            </Text>
            <Text style={styles.metricSub}>Awaiting Attendant</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>IN PROGRESS</Text>
            <Text style={[styles.metricVal, { color: colors.accentBlue }]}>
              {metrics.inProgress}
            </Text>
            <Text style={styles.metricSub}>Under Sanitization</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>COMPLETED</Text>
            <Text style={[styles.metricVal, { color: colors.success }]}>
              {metrics.completed}
            </Text>
            <Text style={styles.metricSub}>Inspected Clean</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <Input
          placeholder="Search by room, attendant, or task..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="shield"
          containerStyle={styles.searchBar}
        />

        {/* STATUS & PRIORITY FILTER PILLS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>STATUS FILTER:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {['ALL', 'pending', 'in_progress', 'completed'].map((st) => {
              const isActive = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setStatusFilter(st)}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {st.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>PRIORITY FILTER:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {['ALL', 'urgent', 'high', 'normal'].map((pr) => {
              const isActive = priorityFilter === pr;
              return (
                <TouchableOpacity
                  key={pr}
                  activeOpacity={0.7}
                  onPress={() => setPriorityFilter(pr)}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {pr.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* TICKETS LIST */}
        <View style={styles.ticketsList}>
          {filteredTickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              {/* Card Header */}
              <View style={styles.ticketHeader}>
                <View style={styles.roomTag}>
                  <Icon name="key" size={13} color={colors.primaryNavy} />
                  <Text style={styles.roomTagText}>Room {ticket.roomNumber}</Text>
                </View>

                <View style={styles.badgesRow}>
                  <Badge
                    label={ticket.priority.toUpperCase()}
                    variant={getPriorityBadgeVariant(ticket.priority)}
                    size="sm"
                    style={{ marginRight: 6 }}
                  />
                  <Badge
                    label={ticket.status.replace('_', ' ').toUpperCase()}
                    variant={getStatusBadgeVariant(ticket.status)}
                    size="sm"
                  />
                </View>
              </View>

              {/* Ticket Type */}
              <Text style={styles.ticketTypeTitle}>{ticket.ticketType}</Text>

              {/* Staff Assignment & Time */}
              <View style={styles.ticketMetaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>ASSIGNED ATTENDANT</Text>
                  <Text style={styles.metaVal}>{ticket.assignedStaffName}</Text>
                </View>
                <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.metaLabel}>LOGGED TIME</Text>
                  <Text style={styles.metaVal}>{ticket.requestedTime}</Text>
                </View>
              </View>

              {/* Notes Box */}
              {ticket.notes && (
                <View style={styles.notesBox}>
                  <Icon
                    name="shield"
                    size={13}
                    color={colors.accentBlue}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.notesText}>{ticket.notes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.ticketActions}>
                {ticket.status === 'pending' && (
                  <Button
                    title="Dispatch & Start"
                    variant="outline"
                    size="sm"
                    icon="activity"
                    onPress={() =>
                      updateHousekeepingTicketStatus(ticket.id, 'in_progress')
                    }
                    fullWidth
                  />
                )}
                {ticket.status === 'in_progress' && (
                  <Button
                    title="Mark Inspected Clean"
                    variant="primary"
                    size="sm"
                    icon="check"
                    onPress={() =>
                      updateHousekeepingTicketStatus(ticket.id, 'completed')
                    }
                    fullWidth
                  />
                )}
                {ticket.status === 'completed' && (
                  <View style={styles.completedBadgeRow}>
                    <Icon name="check-circle" size={14} color={colors.success} />
                    <Text style={styles.completedText}>
                      Sanitized & ready for guest occupancy
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {filteredTickets.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="shield" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Active Tickets</Text>
              <Text style={styles.emptySubtitle}>
                All housekeeping and engineering requests are cleared.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* DISPATCH NEW TICKET MODAL */}
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
                <Text style={styles.modalTitle}>Dispatch Housekeeper</Text>
                <Text style={styles.modalSubtitle}>{selectedHotel.name}</Text>
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
              {/* Room Picker */}
              <Text style={styles.formSectionLabel}>SELECT TARGET ROOM / SUITE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomPickerScroll}
              >
                {rooms.map((room) => {
                  const isSelected = selectedRoomNumber === room.roomNumber;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRoomNumber(room.roomNumber)}
                      style={[
                        styles.roomPickPill,
                        isSelected && styles.roomPickPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roomPickPillText,
                          isSelected && styles.roomPickPillTextActive,
                        ]}
                      >
                        Room {room.roomNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Service Type Selection */}
              <Text style={styles.formSectionLabel}>SERVICE CATEGORY</Text>
              <View style={styles.modalPillsWrap}>
                {ticketTypes.map((type) => {
                  const isSelected = ticketType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.7}
                      onPress={() => setTicketType(type)}
                      style={[
                        styles.modalOptionPill,
                        isSelected && styles.modalOptionPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority Selection */}
              <Text style={styles.formSectionLabel}>URGENCY PRIORITY</Text>
              <View style={styles.modalPillsWrap}>
                {priorities.map((pr) => {
                  const isSelected = priority === pr;
                  return (
                    <TouchableOpacity
                      key={pr}
                      activeOpacity={0.7}
                      onPress={() => setPriority(pr)}
                      style={[
                        styles.modalOptionPill,
                        isSelected && styles.modalOptionPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextActive,
                        ]}
                      >
                        {pr.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Attendant Selection */}
              <Text style={styles.formSectionLabel}>ASSIGN ON-DUTY ATTENDANT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.staffPickerScroll}
              >
                {serviceStaff.map((person) => {
                  const isSelected = assignedStaff === person.fullName;
                  return (
                    <TouchableOpacity
                      key={person.id}
                      activeOpacity={0.7}
                      onPress={() => setAssignedStaff(person.fullName)}
                      style={[
                        styles.staffPickPill,
                        isSelected && styles.staffPickPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffPickPillText,
                          isSelected && styles.staffPickPillTextActive,
                        ]}
                      >
                        {person.fullName}
                      </Text>
                      <Text
                        style={[
                          styles.staffPickPillRole,
                          isSelected && styles.staffPickPillRoleActive,
                        ]}
                      >
                        {person.department}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Input
                label="Special Cleaning / Turndown Instructions"
                placeholder="e.g. Add extra Ayurvedic lemongrass toiletries, deep steam mattress"
                value={ticketNotes}
                onChangeText={setTicketNotes}
                containerStyle={{ marginTop: spacing.sm }}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Dispatch Ticket"
                  variant="primary"
                  onPress={handleCreateTicket}
                  style={{ flex: 1, marginLeft: spacing.xs }}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    fontSize: 9,
  },
  metricVal: {
    ...typography.h2,
    fontWeight: '800',
    marginTop: 2,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  searchBar: {
    marginBottom: spacing.sm,
  },
  filterSection: {
    marginBottom: spacing.xs + 2,
  },
  filterLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  ticketsList: {
    marginTop: spacing.sm,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  roomTagText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketTypeTitle: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 4,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  metaVal: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.sm,
    padding: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  notesText: {
    ...typography.caption,
    color: colors.primaryNavy,
    flex: 1,
  },
  ticketActions: {
    marginTop: spacing.sm,
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  completedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 6,
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
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roomPickerScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  roomPickPill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  roomPickPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  roomPickPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roomPickPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  modalPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  modalOptionPill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalOptionPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  modalOptionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalOptionTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  staffPickerScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  staffPickPill: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
    minWidth: 120,
  },
  staffPickPillActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  staffPickPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  staffPickPillTextActive: {
    color: colors.surface,
  },
  staffPickPillRole: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 9,
  },
  staffPickPillRoleActive: {
    color: colors.goldLight,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
