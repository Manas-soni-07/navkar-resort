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
import { StaffDepartment, StaffShift, AttendanceStatus, StaffMember } from '../types/hotel';

export const AttendanceScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const {
    staff: allStaff,
    updateStaffAttendance,
    addStaffMember,
    selectedHotel,
    hotels,
    switchHotel,
    currentUser,
  } = useHotel();

  // Role permissions
  const isAdmin = currentUser?.role === 'ADMIN';
  const managerAssignedHotelId = currentUser?.hotelId || selectedHotel.id;

  // Hotel Filter: Admin can choose 'all', 'h-villa', 'h-navkar'. Manager locked.
  const [filterHotelId, setFilterHotelId] = useState<string>(
    isAdmin ? 'all' : managerAssignedHotelId
  );

  // Date State (Defaults to Today)
  const todayStr = '17 Nov 2026';
  const [selectedDate, setSelectedDate] = useState<string>('Today');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState<StaffDepartment>('Front Desk');
  const [newShift, setNewShift] = useState<StaffShift>('Morning');
  const [newPhone, setNewPhone] = useState('');
  const [newHotelId, setNewHotelId] = useState<string>(
    isAdmin ? 'h-villa' : managerAssignedHotelId
  );
  const [newSalary, setNewSalary] = useState('');

  const departments: (StaffDepartment | 'ALL')[] = [
    'ALL',
    'Front Desk',
    'Housekeeping',
    'Food & Beverage',
    'Maintenance',
    'Security',
    'Management',
  ];

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return allStaff.filter((member) => {
      // Hotel constraint
      if (!isAdmin) {
        if (member.hotelId !== managerAssignedHotelId) return false;
      } else if (filterHotelId !== 'all') {
        if (member.hotelId !== filterHotelId) return false;
      }

      // Search match
      const matchesSearch =
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

      // Dept match
      const matchesDept = selectedDept === 'ALL' || member.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [allStaff, isAdmin, managerAssignedHotelId, filterHotelId, searchQuery, selectedDept]);

  // Reactive Attendance Counts
  const counts = useMemo(() => {
    const total = filteredStaff.length;
    const present = filteredStaff.filter(
      (s) => s.status === 'present' || s.status === 'late'
    ).length;
    const halfDay = filteredStaff.filter((s) => s.status === 'half_day').length;
    const absent = filteredStaff.filter((s) => s.status === 'absent').length;
    const onLeave = filteredStaff.filter((s) => s.status === 'on_leave').length;
    return { total, present, halfDay, absent, onLeave };
  }, [filteredStaff]);

  // Set individual staff status
  const handleSetStatus = (staffId: string, status: AttendanceStatus) => {
    const checkIn =
      status === 'present' ? '08:00 AM' : status === 'half_day' ? '01:00 PM' : undefined;
    updateStaffAttendance(staffId, status, checkIn);
  };

  // Mark All Present Shortcut
  const handleMarkAllPresent = () => {
    if (filteredStaff.length === 0) {
      Alert.alert('No Staff', 'No staff members currently found to mark.');
      return;
    }
    filteredStaff.forEach((member) => {
      updateStaffAttendance(member.id, 'present', '08:00 AM');
    });
    Alert.alert(
      'Attendance Marked',
      `All ${filteredStaff.length} employees have been marked as Present for ${selectedDate === 'Today' ? todayStr : selectedDate}.`
    );
  };

  // Create Staff Member
  const handleCreateStaff = () => {
    if (!newFullName.trim() || !newRole.trim()) {
      Alert.alert('Required Fields', 'Please enter employee full name and job title.');
      return;
    }

    const salaryVal = parseFloat(newSalary) || 18000;

    addStaffMember({
      hotelId: isAdmin ? newHotelId : managerAssignedHotelId,
      fullName: newFullName.trim(),
      role: newRole.trim(),
      department: newDept,
      shift: newShift,
      status: 'present',
      checkInTime: '08:00 AM',
      phone: newPhone.trim() || '+91 98290 00000',
      monthlySalary: salaryVal,
    });

    setNewFullName('');
    setNewRole('');
    setNewPhone('');
    setNewSalary('');
    setShowAddModal(false);
    Alert.alert('Staff Added', `${newFullName.trim()} has been added to the active roster.`);
  };

  const getHotelName = (id: string) => {
    const h = hotels.find((item) => item.id === id);
    return h ? h.name : id;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <Header
        title="Staff Daily Attendance"
        subtitle={
          isAdmin
            ? filterHotelId === 'all'
              ? 'Consolidated - All Properties'
              : getHotelName(filterHotelId)
            : selectedHotel.name
        }
        hotelBadge={`${counts.present}/${counts.total} ON DUTY`}
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

        {/* Date Selector Bar */}
        <View style={styles.dateSelectorCard}>
          <View style={styles.dateLabelRow}>
            <Icon name="calendar" size={15} color={colors.primaryNavy} />
            <Text style={styles.dateMainText}>
              {selectedDate === 'Today' ? `Today: ${todayStr}` : selectedDate}
            </Text>
          </View>
          <View style={styles.datePillsRow}>
            {['Yesterday', 'Today', 'Tomorrow'].map((d) => {
              const isSelected = selectedDate === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDate(d)}
                  style={[styles.datePill, isSelected && styles.datePillActive]}
                >
                  <Text style={[styles.datePillText, isSelected && styles.datePillTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* KPI Counter Checklist Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total Staff</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{counts.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>{counts.halfDay}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{counts.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#64748B' }]}>{counts.onLeave}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
        </View>

        {/* Mark All Present Shortcut Action */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleMarkAllPresent}
          style={styles.markAllBtn}
        >
          <Icon name="check-circle" size={16} color="#FFFFFF" />
          <Text style={styles.markAllBtnText}>Mark All Present for Today</Text>
        </TouchableOpacity>

        {/* Search Input */}
        <Input
          placeholder="Search staff by name, role, or employee code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />

        {/* Department Filter Pills */}
        <Text style={styles.sectionLabel}>DEPARTMENT FILTER:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {departments.map((dept) => {
            const isActive = selectedDept === dept;
            return (
              <TouchableOpacity
                key={dept}
                onPress={() => setSelectedDept(dept)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Checklist Title & Count */}
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>
            DAILY ATTENDANCE CHECKLIST ({filteredStaff.length} EMPLOYEES)
          </Text>
          <Text style={styles.rosterHint}>One-tap direct marking</Text>
        </View>

        {/* Staff Checklist Cards */}
        {filteredStaff.map((member) => {
          const isPresent = member.status === 'present' || member.status === 'late';
          const isHalfDay = member.status === 'half_day';
          const isAbsent = member.status === 'absent';
          const isLeave = member.status === 'on_leave';

          return (
            <View key={member.id} style={styles.staffCard}>
              {/* Member Profile Row */}
              <View style={styles.staffCardTopRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {member.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </Text>
                </View>

                <View style={styles.staffInfoCol}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.staffName}>{member.fullName}</Text>
                    <Badge
                      label={member.employeeCode}
                      variant="neutral"
                      size="sm"
                    />
                  </View>
                  <Text style={styles.staffRole}>
                    {member.role} • {member.department}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Shift: {member.shift}</Text>
                    {member.phone && <Text style={styles.metaText}> • 📞 {member.phone}</Text>}
                    {isAdmin && filterHotelId === 'all' && (
                      <Text style={styles.hotelSubText}>
                        {' '}• 🏨 {getHotelName(member.hotelId)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Status Action Buttons Bar: [ Present ] [ Half Day ] [ Absent ] [ Leave ] */}
              <View style={styles.statusButtonsContainer}>
                {/* Present Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSetStatus(member.id, 'present')}
                  style={[
                    styles.statusBtn,
                    isPresent ? styles.statusBtnPresentActive : styles.statusBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      isPresent ? styles.statusBtnTextPresentActive : styles.statusBtnTextInactive,
                    ]}
                  >
                    ✓ Present
                  </Text>
                </TouchableOpacity>

                {/* Half Day Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSetStatus(member.id, 'half_day')}
                  style={[
                    styles.statusBtn,
                    isHalfDay ? styles.statusBtnHalfActive : styles.statusBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      isHalfDay ? styles.statusBtnTextHalfActive : styles.statusBtnTextInactive,
                    ]}
                  >
                    ½ Half Day
                  </Text>
                </TouchableOpacity>

                {/* Absent Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSetStatus(member.id, 'absent')}
                  style={[
                    styles.statusBtn,
                    isAbsent ? styles.statusBtnAbsentActive : styles.statusBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      isAbsent ? styles.statusBtnTextAbsentActive : styles.statusBtnTextInactive,
                    ]}
                  >
                    ✗ Absent
                  </Text>
                </TouchableOpacity>

                {/* Leave Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSetStatus(member.id, 'on_leave')}
                  style={[
                    styles.statusBtn,
                    isLeave ? styles.statusBtnLeaveActive : styles.statusBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      isLeave ? styles.statusBtnTextLeaveActive : styles.statusBtnTextInactive,
                    ]}
                  >
                    ○ Leave
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredStaff.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="users" size={38} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Employees Found</Text>
            <Text style={styles.emptyDesc}>
              No staff members match the selected hotel, department, or search query.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Employee to Roster</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
              <Icon name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* If Admin, choose Hotel */}
            {isAdmin && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>ASSIGN HOTEL PROPERTY:</Text>
                <View style={styles.formPillGrid}>
                  {hotels.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      onPress={() => setNewHotelId(h.id)}
                      style={[styles.formPill, newHotelId === h.id && styles.formPillActive]}
                    >
                      <Text
                        style={[
                          styles.formPillText,
                          newHotelId === h.id && styles.formPillTextActive,
                        ]}
                      >
                        {h.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Input
              label="Full Name"
              placeholder="e.g. Rameshwar Sharma"
              value={newFullName}
              onChangeText={setNewFullName}
            />
            <Input
              label="Job Title / Role"
              placeholder="e.g. Receptionist / Housekeeping Supervisor"
              value={newRole}
              onChangeText={setNewRole}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98290 12345"
              value={newPhone}
              onChangeText={setNewPhone}
            />
            <Input
              label="Monthly Base Salary (₹)"
              placeholder="18000"
              value={newSalary}
              onChangeText={setNewSalary}
              keyboardType="numeric"
            />

            <Text style={styles.formSectionLabel}>DEPARTMENT:</Text>
            <View style={styles.formPillGrid}>
              {departments
                .filter((d) => d !== 'ALL')
                .map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    onPress={() => setNewDept(dept as StaffDepartment)}
                    style={[styles.formPill, newDept === dept && styles.formPillActive]}
                  >
                    <Text
                      style={[
                        styles.formPillText,
                        newDept === dept && styles.formPillTextActive,
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.formSectionLabel}>SHIFT:</Text>
            <View style={styles.formPillGrid}>
              {(['Morning', 'Afternoon', 'Night', 'Full Day'] as StaffShift[]).map((shift) => (
                <TouchableOpacity
                  key={shift}
                  onPress={() => setNewShift(shift)}
                  style={[styles.formPill, newShift === shift && styles.formPillActive]}
                >
                  <Text
                    style={[
                      styles.formPillText,
                      newShift === shift && styles.formPillTextActive,
                    ]}
                  >
                    {shift}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Save Employee"
              variant="primary"
              size="lg"
              onPress={handleCreateStaff}
              style={{ marginTop: spacing.lg }}
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
  dateSelectorCard: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateMainText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  datePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillActive: {
    backgroundColor: colors.accentBlue,
    borderColor: colors.accentBlue,
  },
  datePillText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  datePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: 8,
    ...shadows.sm,
  },
  markAllBtnText: {
    ...typography.body2,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  filterScroll: {
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 10,
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
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rosterTitle: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  rosterHint: {
    ...typography.caption,
    fontSize: 10,
    color: colors.accentBlue,
  },
  staffCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  staffCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitials: {
    ...typography.body2,
    fontWeight: '700',
    color: '#3730A3',
  },
  staffInfoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffName: {
    ...typography.subtitle1,
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  staffRole: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  hotelSubText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.accentBlue,
    fontWeight: '600',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusBtnInactive: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  statusBtnPresentActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  statusBtnHalfActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  statusBtnAbsentActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  statusBtnLeaveActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  statusBtnText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBtnTextInactive: {
    color: colors.textSecondary,
  },
  statusBtnTextPresentActive: {
    color: '#FFFFFF',
  },
  statusBtnTextHalfActive: {
    color: '#FFFFFF',
  },
  statusBtnTextAbsentActive: {
    color: '#FFFFFF',
  },
  statusBtnTextLeaveActive: {
    color: '#FFFFFF',
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
    marginBottom: spacing.md,
  },
  formSectionLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
