import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Shield, User, ArrowRight } from 'lucide-react-native';
import { ScreenContainer, AppHeader, AppButton, AppInput, AppCard } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { useAuth, homeRouteFor } from '@/context/AuthContext';

// Demo accounts from apps/api/prisma/seed.mjs — pre-filled in development builds only,
// never shipped in a release build.
const DEV_CREDENTIALS: Record<'ADMIN' | 'MANAGER', { email: string; password: string }> = {
  ADMIN: { email: 'admin@resortos.com', password: 'admin12345' },
  MANAGER: { email: 'manager.villa@resortos.com', password: 'manager12345' },
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER'>('MANAGER');
  const [email, setEmail] = useState(__DEV__ ? DEV_CREDENTIALS.MANAGER.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_CREDENTIALS.MANAGER.password : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = (role: 'ADMIN' | 'MANAGER') => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (__DEV__) {
      setEmail(DEV_CREDENTIALS[role].email);
      setPassword(DEV_CREDENTIALS[role].password);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both corporate email and password');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // The server verifies the account's real role and rejects a portal mismatch;
      // navigation follows the role the server returned, not the tab selected here.
      const loggedUser = await login(email.trim(), password, selectedRole);
      router.replace(homeRouteFor(loggedUser.role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.container}>
      <AppHeader
        title="Sign In"
        subtitle="ResortOS Unified Access"
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />

      {/* Role Selection Tabs */}
      <View style={styles.roleSelector}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleRoleChange('MANAGER')}
          style={[
            styles.roleTab,
            selectedRole === 'MANAGER' && styles.roleTabActive,
          ]}
        >
          <User
            size={16}
            color={selectedRole === 'MANAGER' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.roleTabText,
              selectedRole === 'MANAGER' && styles.roleTabTextActive,
            ]}
          >
            Manager Portal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleRoleChange('ADMIN')}
          style={[
            styles.roleTab,
            selectedRole === 'ADMIN' && styles.roleTabActive,
          ]}
        >
          <Shield
            size={16}
            color={selectedRole === 'ADMIN' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.roleTabText,
              selectedRole === 'ADMIN' && styles.roleTabTextActive,
            ]}
          >
            Admin Portal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Login Card Form */}
      <AppCard style={styles.formCard} padding="xl">
        <Text style={styles.cardHeaderTitle}>
          {selectedRole === 'ADMIN' ? 'Executive Login' : 'Property Manager Login'}
        </Text>
        <Text style={styles.cardHeaderSubtitle}>
          Sign in with the account your administrator created for you.
        </Text>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <AppInput
          label="Corporate Email Address"
          placeholder="user@resortos.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={18} color={colors.textSecondary} />}
        />

        <AppInput
          label="Access Password"
          placeholder="••••••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Lock size={18} color={colors.textSecondary} />}
          helperText={__DEV__ ? `Development build: demo ${selectedRole} credentials pre-filled` : undefined}
        />

        <AppButton
          title={isSubmitting ? 'Verifying Credentials...' : `Enter as ${selectedRole === 'ADMIN' ? 'Administrator' : 'Manager'}`}
          size="lg"
          loading={isSubmitting}
          onPress={handleLogin}
          style={styles.submitButton}
          icon={<ArrowRight size={18} color={colors.textInverse} />}
        />
      </AppCard>

      {/* Production Notice */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Your session is stored securely on this device and is verified by the server on every request.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.xxs + 2,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  roleTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTabText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  roleTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  formCard: {
    marginTop: spacing.sm,
  },
  cardHeaderTitle: {
    ...typography.h2,
    marginBottom: spacing.xxs,
  },
  cardHeaderSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  noticeBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
