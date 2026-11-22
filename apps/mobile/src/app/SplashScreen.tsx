import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';

export const SplashScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { currentUser, isRestoringSession } = useHotel();

  useEffect(() => {
    // Wait for the saved session check, then go to the right place.
    if (isRestoringSession) return;
    const timer = setTimeout(() => {
      if (currentUser?.role === 'ADMIN') {
        navigate('admin-dashboard', { role: 'admin' });
      } else if (currentUser) {
        navigate('manager-dashboard', { role: 'manager', selectedHotelId: currentUser.hotelId ?? undefined });
      } else {
        navigate('login');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isRestoringSession]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Brand Emblem */}
        <View style={styles.brandWrapper}>
          <View style={styles.emblemContainer}>
            <View style={styles.emblemOuterCircle}>
              <Icon name="hotel" size={38} color={colors.primaryNavy} />
            </View>
          </View>

          <Text style={styles.brandTitle}>ResortOS</Text>
          <Text style={styles.brandSubtitle}>HOTEL & RESORT MANAGEMENT</Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>THE VILLA & NAVKAR PALACE</Text>
          </View>
        </View>

        {/* Loading / Status Indicator */}
        <View style={styles.footerWrapper}>
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={colors.primaryNavy} style={styles.spinner} />
            <Text style={styles.statusText}>Connecting to ResortOS Cloud...</Text>
          </View>

          {/* Quick Skip Button */}
          <Button
            title="Continue to Login"
            onPress={() => navigate('login')}
            variant="ghost"
            size="sm"
            style={styles.skipButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  brandWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emblemContainer: {
    marginBottom: spacing.lg,
  },
  emblemOuterCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#D0E1F2',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  brandTitle: {
    ...typography.display,
    color: colors.primaryNavy,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    ...typography.overline,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: spacing.xs,
  },
  versionBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  versionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  footerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  spinner: {
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  skipButton: {
    marginTop: spacing.xs,
  },
});
