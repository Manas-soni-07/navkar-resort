import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { Badge } from '../components/common/Badge';

export const RoleSelectionScreen: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Header */}
        <View style={styles.headerSection}>
          <View style={styles.brandIconSmall}>
            <Icon name="hotel" size={24} color={colors.primaryNavy} />
          </View>
          <Text style={styles.headerTitle}>ResortOS Access</Text>
          <Text style={styles.headerSubtitle}>
            Select your administrative level to continue to the authentication gateway.
          </Text>
        </View>

        {/* Admin Role Card */}
        <Card
          style={styles.roleCard}
          padding="lg"
          variant="elevated"
          onPress={() => navigate('login', { role: 'admin' })}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.roleIconContainer, { backgroundColor: colors.primaryTint }]}>
              <Icon name="shield" size={24} color={colors.primaryNavy} />
            </View>
            <Badge label="FULL ACCESS" variant="primary" size="sm" />
          </View>

          <Text style={styles.roleTitle}>Administrator Portal</Text>
          <Text style={styles.roleDescription}>
            Full multi-property oversight, executive daily summaries, financial RevPAR metrics, and organizational control.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Multi-Hotel Property Switcher</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Daily Financial P&L & Summary</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Complete Operational Oversight</Text>
            </View>
          </View>

          <Button
            title="Continue as Administrator"
            onPress={() => navigate('login', { role: 'admin' })}
            variant="primary"
            size="md"
            icon="chevron-right"
            iconPosition="right"
            fullWidth
            style={styles.cardButton}
          />
        </Card>

        {/* Manager Role Card */}
        <Card
          style={styles.roleCard}
          padding="lg"
          variant="elevated"
          onPress={() => navigate('login', { role: 'manager' })}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.roleIconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Icon name="key" size={24} color={colors.success} />
            </View>
            <Badge label="OPERATIONAL" variant="success" size="sm" />
          </View>

          <Text style={styles.roleTitle}>Hotel Manager Portal</Text>
          <Text style={styles.roleDescription}>
            Dedicated front-desk operations, room status management, staff attendance, guest check-ins, and daily expenses.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Assigned Property Operations</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Front Desk Check-ins & Room Status</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check" size={14} color={colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>Shift Attendance & Daily Expenses</Text>
            </View>
          </View>

          <Button
            title="Continue as Hotel Manager"
            onPress={() => navigate('login', { role: 'manager' })}
            variant="secondary"
            size="md"
            icon="chevron-right"
            iconPosition="right"
            fullWidth
            style={styles.cardButton}
          />
        </Card>

        {/* Security Footer Notice */}
        <View style={styles.securityNotice}>
          <Icon name="lock" size={14} color={colors.textMuted} style={styles.lockIcon} />
          <Text style={styles.securityText}>
            Enterprise-grade encrypted session gateway. UI preview mode enabled.
          </Text>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brandIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: '#D0E1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.primaryNavy,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  roleCard: {
    marginBottom: spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  roleDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  featureList: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: spacing.sm,
  },
  featureText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lockIcon: {
    marginRight: 6,
  },
  securityText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
