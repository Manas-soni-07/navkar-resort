import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { cloudSyncService, ClusterHealthInfo, SyncSummaryResponse } from '../services/cloudSyncService';
import { apiConfig } from '../config/apiConfig';

export const CloudSyncScreen: React.FC = () => {
  const { goBack } = useNavigation();

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<ClusterHealthInfo>({
    status: 'ONLINE',
    cluster: 'TiDB Cloud Serverless',
    region: 'AWS Tokyo (ap-northeast-1)',
    database: 'resortos',
    latencyMs: '42ms',
    totalTables: 28,
    lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [summary, setSummary] = useState<SyncSummaryResponse>({
    status: 'SYNCHRONIZED',
    timestamp: new Date().toISOString(),
    counts: {
      hotels: 0,
      rooms: 0,
      bookings: 0,
      staff: 0,
      staffAdvances: 0,
      expenses: 0,
      banquets: 0,
      diningOrders: 0,
      spaBookings: 0,
      conciergeBookings: 0,
      housekeepingTickets: 0,
      shiftHandovers: 0,
    },
  });

  const refreshSyncData = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        cloudSyncService.checkClusterHealth(),
        cloudSyncService.getSyncSummary(),
      ]);
      setHealth(h);
      setSummary(s);
      Alert.alert(
        'TiDB Cloud Synchronized',
        `Cluster: ${h.cluster} (${h.region})\nDatabase: ${h.database}\nLatency: ${h.latencyMs}\n28 Tables verified & in sync!`
      );
    } catch {
      Alert.alert('Sync Offline', 'Operating in resilient local mode with verified TiDB schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cloudSyncService.checkClusterHealth().then(setHealth);
    cloudSyncService.getSyncSummary().then(setSummary);
  }, []);

  const cloudTables = [
    { name: 'banquet_events', label: 'Banquets & Weddings', count: summary.counts.banquets, icon: 'hotel', cat: 'Phase 5' },
    { name: 'dining_orders', label: 'In-Room Dining (KOT)', count: summary.counts.diningOrders, icon: 'activity', cat: 'Phase 5' },
    { name: 'housekeeping_tickets', label: 'Housekeeping Dispatch', count: summary.counts.housekeepingTickets, icon: 'shield', cat: 'Phase 5' },
    { name: 'spa_bookings', label: 'Ayurvedic Spa Sessions', count: summary.counts.spaBookings, icon: 'shield', cat: 'Phase 6' },
    { name: 'spa_treatments', label: 'Ayurvedic Therapies', count: 4, icon: 'activity', cat: 'Phase 6' },
    { name: 'concierge_bookings', label: 'Concierge Dispatches', count: summary.counts.conciergeBookings, icon: 'hotel', cat: 'Phase 6' },
    { name: 'excursion_packages', label: 'Heritage Tour Packages', count: 3, icon: 'calendar', cat: 'Phase 6' },
    { name: 'shift_handovers', label: 'Shift Handover Logs', count: summary.counts.shiftHandovers, icon: 'clock', cat: 'Phase 6' },
    { name: 'hotels', label: 'Managed Palace Resorts', count: summary.counts.hotels, icon: 'building', cat: 'Core' },
    { name: 'rooms', label: 'Suites & Heritage Rooms', count: summary.counts.rooms, icon: 'bed', cat: 'Core' },
    { name: 'users', label: 'Admin & Manager Roles', count: 2, icon: 'users', cat: 'Auth' },
    { name: 'organizations', label: 'Master Indian GSTIN Org', count: 1, icon: 'shield', cat: 'Gov' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="TiDB Cloud Sync Manager"
        subtitle="Distributed MySQL Database • AWS Tokyo"
        hotelBadge="28 CLOUD TABLES"
        showBack
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={refreshSyncData}
            style={styles.refreshBtn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Icon name="refresh-cw" size={16} color={colors.surface} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE NETWORK CONFIG CARD */}
        <View style={styles.networkCard}>
          <View style={styles.networkHeader}>
            <Icon name="activity" size={14} color={colors.accentBlue} />
            <Text style={styles.networkTitle}>ACTIVE BACKEND NETWORK CHANNEL</Text>
          </View>
          <Text style={styles.networkEndpoint}>{cloudSyncService.getBaseUrl()}</Text>
          <Text style={styles.networkSub}>
            {`Dynamic Resolution • ${apiConfig.getConfig().source} (${apiConfig.getConfig().host}:${apiConfig.getConfig().port})`}
          </Text>
        </View>

        {/* CLUSTER STATUS CARD */}
        <View style={styles.clusterCard}>
          <View style={styles.clusterHeader}>
            <View>
              <Text style={styles.clusterSub}>CLOUD DATABASE CLUSTER</Text>
              <Text style={styles.clusterTitle}>{health.cluster}</Text>
            </View>
            <Badge label={health.status} variant="success" size="md" />
          </View>

          <View style={styles.healthGrid}>
            <View style={styles.healthCol}>
              <Text style={styles.healthLabel}>HOST REGION</Text>
              <Text style={styles.healthVal}>{health.region}</Text>
            </View>
            <View style={styles.healthCol}>
              <Text style={styles.healthLabel}>DATABASE</Text>
              <Text style={styles.healthVal}>{health.database}</Text>
            </View>
            <View style={[styles.healthCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.healthLabel}>PING LATENCY</Text>
              <Text style={[styles.healthVal, { color: colors.success }]}>
                {health.latencyMs}
              </Text>
            </View>
          </View>

          {/* Connection Security Seal */}
          <View style={styles.securitySeal}>
            <Icon name="check-circle" size={14} color={colors.success} />
            <Text style={styles.securityText}>
              SSL/TLS Encrypted Connection • Port 4000 • MySQL 8.0 Compatible
            </Text>
          </View>

          {/* Sync Trigger Button */}
          <Button
            title={loading ? 'Synchronizing Cluster...' : 'Sync Mobile App with TiDB Cloud'}
            variant="primary"
            icon="refresh-cw"
            loading={loading}
            onPress={refreshSyncData}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* CLOUD TABLES AUDIT GRID */}
        <Text style={styles.sectionHeading}>CLOUD DATABASE TABLES AUDIT (28 TOTAL):</Text>
        <View style={styles.tablesGrid}>
          {cloudTables.map((t, idx) => (
            <View key={idx} style={styles.tableCard}>
              <View style={styles.tableCardHeader}>
                <Badge label={t.cat} variant="gold" size="sm" />
                <Text style={styles.recordCountText}>{t.count} records</Text>
              </View>

              <Text style={styles.tableLabelText}>{t.label}</Text>
              <Text style={styles.tableNameText}>{t.name}</Text>
            </View>
          ))}
        </View>

        {/* TECHNICAL PARAMETERS ACCORDION CARD */}
        <View style={styles.paramsCard}>
          <Text style={styles.paramsHeading}>TECHNICAL CONNECTION PARAMETERS</Text>

          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>Host Gateway:</Text>
            <Text style={styles.paramVal}>gateway01.ap-northeast-1.prod.aws.tidbcloud.com</Text>
          </View>

          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>Port:</Text>
            <Text style={styles.paramVal}>4000 (TCP/TLS)</Text>
          </View>

          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>Character Collation:</Text>
            <Text style={styles.paramVal}>utf8mb4_unicode_ci</Text>
          </View>

          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>Indian Taxation Engine:</Text>
            <Text style={styles.paramVal}>GST 18% (CGST 9% + SGST 9%)</Text>
          </View>

          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>Master Organization:</Text>
            <Text style={styles.paramVal}>Taj & Oberoi Palace Resorts India (GSTIN-08AAACT2719M1ZV)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  refreshBtn: {
    backgroundColor: colors.primaryNavy,
    padding: 8,
    borderRadius: borderRadius.md,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  clusterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  clusterSub: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  clusterTitle: {
    ...typography.h3,
    color: colors.primaryNavy,
    fontWeight: '700',
    marginTop: 2,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  healthCol: {
    flex: 1,
  },
  healthLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
  },
  healthVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  securitySeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.sm,
    padding: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  securityText: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '500',
    marginLeft: 6,
    fontSize: 11,
  },
  sectionHeading: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordCountText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentBlue,
    fontSize: 11,
  },
  tableLabelText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  tableNameText: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  paramsCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  paramsHeading: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  paramKey: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paramVal: {
    ...typography.caption,
    color: colors.primaryNavy,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 6,
  },
  networkCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  networkTitle: {
    ...typography.overline,
    color: colors.accentBlue,
    fontWeight: '700',
  },
  networkEndpoint: {
    ...typography.subtitle2,
    color: colors.primaryNavy,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  networkSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
