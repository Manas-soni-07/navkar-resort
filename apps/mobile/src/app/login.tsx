import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Shield, User, ArrowRight } from 'lucide-react-native';
import { ScreenContainer, AppHeader, AppButton, AppInput, AppCard } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@resortos/shared';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER');
  const [email, setEmail] = useState('manager@resortos.com');
  const [password, setPassword] = useState('manager12345');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'ADMIN') {
      setEmail('admin@resortos.com');
      setPassword('admin12345');
    } else {
      setEmail('manager@resortos.com');
      setPassword('manager12345');
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
      const loggedUser = await login(email.trim(), password.trim());
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/manager');
      }
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
          Secure biometric & encrypted credentials authenticated via TiDB Cloud.
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
          helperText={`Pre-filled demo credentials for ${selectedRole}`}
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
          ⚡ Connected to live TiDB Cloud Serverless MySQL database. JWT sessions protected via SecureStore.
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
