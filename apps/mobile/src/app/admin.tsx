import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import {
  ShieldAlert,
  Building,
  Users,
  DollarSign,
  Activity,
  BedDouble,
  LogOut,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { ScreenContainer, AppHeader, AppCard, AppButton, LoadingView, ErrorView } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { DashboardStats, Hotel } from '@resortos/shared';
import { RoleGuard } from '@/components/RoleGuard';
import { formatMoney } from '@/utils/format';

export default function AdminRoute() {
  return (
    <RoleGuard audience="admin">
      <AdminDashboardScreen />
    </RoleGuard>
  );
}

function AdminDashboardScreen() {
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const primaryHotel = await api.getPrimaryHotel();
      setHotel(primaryHotel);

      const dashboardStats = await api.getHotelDashboard(primaryHotel.id);
      setStats(dashboardStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch executive metrics';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Clearing the session is enough: RoleGuard then redirects to the sign-in
  // screen. (Navigating here as well raced with that redirect.)
  const handleSignOut = async () => {
    await logout();
  };

  if (isLoading) {
    return <LoadingView message="Loading hotel metrics..." />;
  }

  if (error && !stats) {
    return <ErrorView title="Metrics Unavailable" message={error} onRetry={loadData} />;
  }

  return (
    <ScreenContainer
      scrollable
      contentContainerStyle={styles.container}
    >
      <AppHeader
        title="Admin Console"
        subtitle={user ? `Signed in: ${user.fullName}` : 'Executive Property Control'}
        rightAction={
          <View style={styles.roleBadge}>
            <ShieldAlert size={14} color={colors.primary} />
            <Text style={styles.roleBadgeText}>ADMIN</Text>
          </View>
        }
      />

      {/* Property Hero Card */}
      <AppCard style={styles.heroCard} padding="lg">
        <View style={styles.heroRow}>
          <View style={styles.heroIconBox}>
            <Building size={24} color={colors.primary} />
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.propertyName}>
              {hotel?.name || stats?.hotelName || 'Grand Azure Horizon Resort'}
            </Text>
            <Text style={styles.propertyCode}>
              Property Code: {hotel?.code || stats?.hotelCode || '-'}
              {hotel?.starRating ? ` • ${hotel.starRating}-Star` : ''}
            </Text>
          </View>
        </View>
      </AppCard>

      {/* KPI Overview Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Key Operational Metrics</Text>
        <AppButton
          title="Refresh"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={handleRefresh}
          icon={<RefreshCw size={14} color={colors.primary} />}
        />
      </View>

      <View style={styles.metricsGrid}>
        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIconCircle, { backgroundColor: colors.primaryLight }]}>
            <BedDouble size={18} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>
            {stats?.occupiedRooms ?? 0} / {stats?.totalRooms ?? 0}
          </Text>
          <Text style={styles.metricLabel}>
            Occupancy Rate ({stats?.occupancyRate ?? 0}%)
          </Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIconCircle, { backgroundColor: colors.successLight }]}>
            <DollarSign size={18} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>
            {formatMoney(stats?.dailyRevenue, hotel?.currency)}
          </Text>
          <Text style={styles.metricLabel}>Collected Today</Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIconCircle, { backgroundColor: colors.infoLight }]}>
            <Users size={18} color={colors.info} />
          </View>
          <Text style={styles.metricValue}>
            {stats?.activeStaffCount ?? 0} Active
          </Text>
          <Text style={styles.metricLabel}>Active Staff Members</Text>
        </AppCard>

        <AppCard style={styles.metricCard} padding="md">
          <View style={[styles.metricIconCircle, { backgroundColor: colors.goldLight }]}>
            <Activity size={18} color={colors.goldAccent} />
          </View>
          <Text style={styles.metricValue}>Online</Text>
          <Text style={styles.metricLabel}>ResortOS Server</Text>
        </AppCard>
      </View>

      {/* Administrative Operations Modules */}
      <Text style={styles.sectionTitle}>Executive Management Modules</Text>
      <View style={styles.modulesList}>
        {[
          {
            title: 'Staff & Role Permissions',
            desc: `${stats?.activeStaffCount ?? 0} active staff members across departments`,
            icon: Users,
          },
          {
            title: 'Room Inventory & Pricing Tier',
            desc: `${stats?.totalRooms ?? 0} rooms configured at ${hotel?.name ?? 'this hotel'}`,
            icon: BedDouble,
          },
          {
            title: 'Financial & Billing Audit',
            desc: 'Billing, expenses and Daily Summary (coming in later phases)',
            icon: DollarSign,
          },
        ].map((module, index) => {
          const Icon = module.icon;
          return (
            <AppCard key={index} style={styles.moduleCard} padding="md">
              <View style={styles.moduleRow}>
                <View style={styles.moduleIconBox}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={styles.moduleTextContainer}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDesc}>{module.desc}</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  roleBadgeText: {
    ...typography.badge,
    color: colors.primary,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroTextContainer: {
    flex: 1,
  },
  propertyName: {
    ...typography.h3,
    marginBottom: 2,
  },
  propertyCode: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
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
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    ...typography.h2,
    fontSize: 18,
    marginBottom: 2,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  modulesList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  moduleCard: {
    borderColor: colors.borderLight,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  moduleTextContainer: {
    flex: 1,
  },
  moduleTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  moduleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    marginTop: spacing.md,
  },
});
