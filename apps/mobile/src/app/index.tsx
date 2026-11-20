import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, ShieldCheck, UserCheck, ArrowRight, Sparkles } from 'lucide-react-native';
import { ScreenContainer, AppButton, AppCard, LoadingView } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { useAuth, homeRouteFor } from '@/context/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const restoreHandled = useRef(false);

  // Session restoration: once the stored token has been checked at app launch,
  // send a signed-in user straight to their dashboard. Runs only once, so it
  // doesn't interfere with the normal sign-in / sign-out navigation later.
  useEffect(() => {
    if (isLoading || restoreHandled.current) return;
    restoreHandled.current = true;
    if (user) {
      router.replace(homeRouteFor(user.role));
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <LoadingView message="Restoring your session..." />;
  }

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.container}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Building2 size={36} color={colors.primary} />
        </View>
        <View style={styles.statusPill}>
          <Sparkles size={12} color={colors.goldAccent} />
          <Text style={styles.statusPillText}>ResortOS Engine v1.0</Text>
        </View>
        <Text style={styles.brandTitle}>ResortOS</Text>
        <Text style={styles.brandSubtitle}>
          Next-generation operating system for luxury resorts, hotels, and hospitality operations.
        </Text>
      </View>

      {/* Feature Preview Cards */}
      <View style={styles.cardsSection}>
        <AppCard style={styles.featureCard} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
              <ShieldCheck size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={styles.cardTitle}>Executive Admin Portal</Text>
              <Text style={styles.cardDescription}>
                Complete property oversight, multi-branch control, and financial operations.
              </Text>
            </View>
          </View>
          <AppButton
            title="Preview Admin View"
            variant="outline"
            size="sm"
            onPress={() => router.push('/admin')}
            style={styles.cardButton}
          />
        </AppCard>

        <AppCard style={styles.featureCard} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.successLight }]}>
              <UserCheck size={20} color={colors.success} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={styles.cardTitle}>Operations Manager Portal</Text>
              <Text style={styles.cardDescription}>
                Daily guest check-ins, room inventory, housekeeping dispatch, and shift rosters.
              </Text>
            </View>
          </View>
          <AppButton
            title="Preview Manager View"
            variant="outline"
            size="sm"
            onPress={() => router.push('/manager')}
            style={styles.cardButton}
          />
        </AppCard>
      </View>

      {/* Primary Action Button */}
      <View style={styles.footerSection}>
        <AppButton
          title="Sign In to ResortOS"
          size="lg"
          onPress={() => router.push('/login')}
          icon={<ArrowRight size={18} color={colors.textInverse} />}
        />
        <Text style={styles.footerNote}>
          Phase 1 Foundation Setup &bull; Production Security Active
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.sm,
    gap: 4,
  },
  statusPillText: {
    ...typography.badge,
    color: '#92400E',
  },
  brandTitle: {
    ...typography.display,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cardsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureCard: {
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  footerSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
