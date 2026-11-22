import React from 'react';
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
import { AttendanceStatus } from '../../types/hotel';

interface AttendanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  visible,
  onClose,
}) => {
  const { staff, attendanceSummary, updateStaffAttendance, selectedHotel } =
    useHotel();

  const handleToggleStatus = (
    staffId: string,
    currentStatus: AttendanceStatus
  ) => {
    const nextStatus: AttendanceStatus =
      currentStatus === 'present' ? 'on_leave' : 'present';
    const checkInTime = nextStatus === 'present' ? '08:00 AM' : undefined;
    updateStaffAttendance(staffId, nextStatus, checkInTime);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Icon name="users" size={20} color={colors.primaryNavy} />
            </View>
            <View>
              <Text style={styles.title}>Staff Attendance</Text>
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

        {/* Attendance Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{attendanceSummary.totalStaff}</Text>
            <Text style={styles.statLabel}>Total Staff</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.success }]}>
              {attendanceSummary.presentStaff}
            </Text>
            <Text style={styles.statLabel}>Active Duty</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.warning }]}>
              {attendanceSummary.onLeaveStaff}
            </Text>
            <Text style={styles.statLabel}>On Leave</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.error }]}>
              {attendanceSummary.absentStaff}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        <Text style={styles.listSectionHeader}>
          ROSTER ({staff.length} EMPLOYEES) • TAP TO TOGGLE STATUS
        </Text>

        {/* Staff List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {staff.map((member) => {
            const isPresent = member.status === 'present';
            const isLate = member.status === 'late';
            const isOnLeave = member.status === 'on_leave';

            const badgeVariant = isPresent
              ? 'success'
              : isLate
              ? 'warning'
              : isOnLeave
              ? 'neutral'
              : 'error';

            return (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.7}
                onPress={() => handleToggleStatus(member.id, member.status)}
                style={styles.staffCard}
              >
                <View style={styles.staffInfoRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {member.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.staffDetails}>
                    <Text style={styles.staffName}>{member.fullName}</Text>
                    <Text style={styles.staffRole}>
                      {member.role} • {member.department}
                    </Text>
                    <Text style={styles.staffShift}>
                      Shift: {member.shift} {member.checkInTime ? `• In: ${member.checkInTime}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={member.status.replace('_', ' ').toUpperCase()}
                    variant={badgeVariant}
                    size="sm"
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom Done CTA */}
        <View style={styles.footer}>
          <Button title="Done" variant="primary" onPress={onClose} fullWidth />
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...shadows.sm,
  },
  statBox: {
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
  listSectionHeader: {
    ...typography.overline,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  staffInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.captionBold,
    color: colors.surface,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  staffRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  staffShift: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
