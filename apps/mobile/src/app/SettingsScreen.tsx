/**
 * ResortOS - Settings & Owner Profile Screen (Admin)
 * System preferences, active database indicators, and secure sign-out.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';

export const SettingsScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const { currentUser, logout, hotels } = useHotel();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of ResortOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          navigate('login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Settings & System"
        subtitle="Executive Account & Database Status"
        showBack
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card padding="lg" variant="elevated" style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Icon name="shield" size={28} color={colors.primaryNavy} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{currentUser?.fullName || 'Yash Godha'}</Text>
              <Text style={styles.userEmail}>{currentUser?.email || 'admin@resortos.com'}</Text>
              <Badge label="SYSTEM ADMINISTRATOR & OWNER" variant="primary" size="sm" style={styles.roleBadge} />
            </View>
          </View>
        </Card>

        {/* Database & Cloud Infrastructure Status */}
        <Text style={styles.sectionHeader}>System Architecture & Database</Text>
        <Card padding="md" variant="elevated" style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database Engine:</Text>
            <Text style={styles.infoVal}>TiDB Cloud Distributed SQL</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cloud Region:</Text>
            <Text style={styles.infoVal}>AWS Tokyo (ap-northeast-1)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SSL / TLS Protocol:</Text>
            <Text style={styles.infoVal}>TLSv1.2 Encrypted Connection</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target Properties:</Text>
            <Text style={[styles.infoVal, { fontWeight: '700' }]}>
              THE VILLA & NAVKAR PALACE & RESORT
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tax & Currency Regime:</Text>
            <Text style={styles.infoVal}>Indian Rupee (₹) • GST 18%</Text>
          </View>
        </Card>

        {/* Security & Access Management */}
        <Text style={styles.sectionHeader}>Security Controls</Text>
        <Card padding="md" variant="elevated" style={styles.card}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('hotels')}
          >
            <Icon name="hotel" size={18} color={colors.primaryNavy} />
            <Text style={styles.settingLabel}>Manage Hotel Properties</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('managers')}
          >
            <Icon name="users" size={18} color="#047857" />
            <Text style={styles.settingLabel}>Manage Hotel Managers</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('cloud-sync')}
          >
            <Icon name="database" size={18} color="#4338CA" />
            <Text style={styles.settingLabel}>TiDB Cloud Sync Monitor</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out of ResortOS"
          variant="outline"
          size="lg"
          onPress={handleSignOut}
          style={styles.logoutBtn}
        />

        <Text style={styles.versionNote}>
          ResortOS Enterprise Edition v2.0{'\n'}
          Built with React Native & TiDB Cloud
        </Text>
      </ScrollView>
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
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    ...typography.subtitle2,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoVal: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabel: {
    ...typography.body2,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: spacing.md,
    borderColor: '#EF4444',
  },
  versionNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});

export default SettingsScreen;
