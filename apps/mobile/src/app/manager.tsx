import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  UserCheck,
  Clock,
  Sparkles,
  UserPlus,
  DoorClosed,
  BellRing,
  LogOut,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react-native';
import { ScreenContainer, AppHeader, AppCard, AppButton, LoadingView, ErrorView } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { Room, RoomStatus, Hotel } from '@resortos/shared';
import { RoleGuard } from '@/components/RoleGuard';
import { formatMoney } from '@/utils/format';

export default function ManagerRoute() {
  return (
    <RoleGuard audience="manager">
      <ManagerDashboardScreen />
    </RoleGuard>
  );
}

function ManagerDashboardScreen() {
  const { user, logout } = useAuth();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const primaryHotel = await api.getPrimaryHotel();
      setHotel(primaryHotel);

      const allRooms = await api.getRooms(primaryHotel.id);
      setRooms(allRooms);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch manager data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusTransition = async (room: Room) => {
    let nextStatus: RoomStatus | null = null;
    let confirmPrompt = '';

    if (room.status === 'DIRTY') {
      nextStatus = 'CLEANING';
      confirmPrompt = `Assign housekeeping to clean Room ${room.roomNumber}?`;
    } else if (room.status === 'CLEANING') {
      nextStatus = 'INSPECTION';
      confirmPrompt = `Mark Room ${room.roomNumber} as cleaned and submit for supervisor inspection?`;
    } else if (room.status === 'INSPECTION') {
      nextStatus = 'AVAILABLE';
      confirmPrompt = `Approve inspection and mark Room ${room.roomNumber} as AVAILABLE for guest check-in?`;
    } else if (room.status === 'AVAILABLE') {
      nextStatus = 'OCCUPIED';
      confirmPrompt = `Simulate guest arrival and mark Room ${room.roomNumber} as OCCUPIED?`;
    } else if (room.status === 'OCCUPIED') {
      nextStatus = 'DIRTY';
      confirmPrompt = `Process guest check-out and flag Room ${room.roomNumber} for housekeeping (DIRTY)?`;
    }

    if (!nextStatus) return;

    setIsUpdating(room.id);
    try {
      const updated = await api.updateRoomStatus(room.id, nextStatus, 'Status updated via Manager Desk');
      setRooms((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      Alert.alert('Status Transition Error', msg);
    } finally {
      setIsUpdating(null);
    }
  };

  // Clearing the session is enough: RoleGuard then redirects to the sign-in
  // screen. (Navigating here as well raced with that redirect.)
  const handleSignOut = async () => {
    await logout();
  };

  if (isLoading) {
    return <LoadingView message="Loading rooms..." />;
  }

  if (error && rooms.length === 0) {
    return <ErrorView title="Manager Desk Offline" message={error} onRetry={loadData} />;
  }

  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const availableCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const dirtyCount = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING').length;
  const inspectionCount = rooms.filter((r) => r.status === 'INSPECTION').length;

  const filteredRooms = rooms.filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'AVAILABLE') return r.status === 'AVAILABLE';
    if (activeFilter === 'OCCUPIED') return r.status === 'OCCUPIED';
    if (activeFilter === 'HOUSEKEEPING') return r.status === 'DIRTY' || r.status === 'CLEANING' || r.status === 'INSPECTION';
    return true;
  });

  const getStatusBadgeStyle = (status: RoomStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return { bg: colors.successLight, text: colors.success };
      case 'OCCUPIED':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'CLEANING':
      case 'DIRTY':
        return { bg: colors.warningLight, text: colors.warning };
      case 'INSPECTION':
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary };
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.container}>
      <AppHeader
        title="Manager Desk"
        subtitle={user ? `Signed in: ${user.fullName}` : 'Daily Operations & Guest Flow'}
        rightAction={
          <View style={styles.roleBadge}>
            <UserCheck size={14} color={colors.success} />
            <Text style={styles.roleBadgeText}>MANAGER</Text>
          </View>
        }
      />

      {/* Shift Banner */}
      <AppCard style={styles.shiftCard} padding="md">
        <View style={styles.shiftRow}>
          <Clock size={20} color={colors.primary} />
          <View style={styles.shiftTextWrapper}>
            <Text style={styles.shiftTitle}>
              {hotel?.name ?? 'Your hotel'}
            </Text>
            <Text style={styles.shiftTiming}>
              Hotel code {hotel?.code ?? '-'} &bull; Check-in {hotel?.checkInTime ?? '-'} &bull; Check-out{' '}
              {hotel?.checkOutTime ?? '-'}
            </Text>
          </View>
        </View>
      </AppCard>

      {/* Daily Operations Quick Metrics */}
      <Text style={styles.sectionTitle}>Live Property Inventory Breakdown</Text>
      <View style={styles.metricsGrid}>
        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIcon, { backgroundColor: colors.successLight }]}>
            <UserPlus size={18} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>{availableCount}</Text>
          <Text style={styles.metricLabel}>Ready for Check-In</Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIcon, { backgroundColor: colors.primaryLight }]}>
            <DoorClosed size={18} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{occupiedCount}</Text>
          <Text style={styles.metricLabel}>Currently Occupied</Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIcon, { backgroundColor: colors.warningLight }]}>
            <Sparkles size={18} color={colors.warning} />
          </View>
          <Text style={styles.metricValue}>{dirtyCount}</Text>
          <Text style={styles.metricLabel}>Pending Housekeeping</Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIcon, { backgroundColor: colors.infoLight }]}>
            <BellRing size={18} color={colors.info} />
          </View>
          <Text style={styles.metricValue}>{inspectionCount}</Text>
          <Text style={styles.metricLabel}>Awaiting Inspection</Text>
        </AppCard>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Room Dispatch & Status State Machine</Text>
          <TouchableOpacity onPress={loadData} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <RefreshCw size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.filterSubtitle}>
          Tap any room card below to trigger next lifecycle state transition
        </Text>

        <View style={styles.filterTabs}>
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[
                styles.filterTab,
                activeFilter === tab && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === tab && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dynamic Room List */}
      <View style={styles.roomList}>
        {filteredRooms.map((room) => {
          const badge = getStatusBadgeStyle(room.status);
          const isBusy = isUpdating === room.id;

          let actionLabel = 'Transition';
          if (room.status === 'DIRTY') actionLabel = '▶ Start Cleaning';
          else if (room.status === 'CLEANING') actionLabel = '▶ Submit for Inspection';
          else if (room.status === 'INSPECTION') actionLabel = '✓ Pass Inspection';
          else if (room.status === 'AVAILABLE') actionLabel = '▶ Check In Guest';
          else if (room.status === 'OCCUPIED') actionLabel = '◀ Check Out';

          return (
            <AppCard
              key={room.id}
              style={styles.roomCard}
              padding="md"
              onPress={() => handleStatusTransition(room)}
            >
              <View style={styles.roomCardRow}>
                <View style={styles.roomInfoLeft}>
                  <View style={styles.roomTitleRow}>
                    <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {room.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roomType}>
                    Floor {room.floor} &bull; {room.type.replace(/_/g, ' ')} &bull; {formatMoney(room.basePricePerNight, hotel?.currency)}/night
                  </Text>
                  {room.hasOceanView && (
                    <Text style={styles.featurePill}>🌊 Ocean View</Text>
                  )}
                </View>

                <View style={styles.actionColumn}>
                  <Text style={styles.actionHintText}>
                    {isBusy ? 'Syncing...' : actionLabel}
                  </Text>
                </View>
              </View>
            </AppCard>
          );
        })}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <AppButton
          title="Sign Out"
          variant="outline"
          size="md"
          onPress={handleSignOut}
          icon={<LogOut size={16} color={colors.textPrimary} />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  roleBadgeText: {
    ...typography.badge,
    color: colors.success,
  },
  shiftCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderColor: colors.borderLight,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftTextWrapper: {
    marginLeft: spacing.md,
    flex: 1,
  },
  shiftTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  shiftTiming: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  filterSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    ...typography.h2,
    fontSize: 20,
    marginBottom: 2,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  roomList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  roomCard: {
    borderColor: colors.borderLight,
  },
  roomCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomInfoLeft: {
    flex: 1,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  roomNumber: {
    ...typography.bodyMedium,
    fontWeight: '700',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.badge,
    fontSize: 10,
    fontWeight: '700',
  },
  roomType: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  featurePill: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  actionHintText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
});
