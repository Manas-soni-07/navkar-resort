/**
 * ResortOS - Common Login & Authentication Screen
 * Unified authentication gateway with role selection, show/hide password,
 * server-side role validation, and role-based routing.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';

type SelectedRole = 'admin' | 'manager';

export const LoginScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { login } = useHotel();

  // Selected Role in UI (Admin or Manager)
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('admin');
  // Demo e-mails are pre-filled only in development builds; passwords are never pre-filled.
  const [emailOrUsername, setEmailOrUsername] = useState(__DEV__ ? 'admin@resortos.com' : '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setFieldErrors({});

    if (__DEV__) {
      setEmailOrUsername(role === 'admin' ? 'admin@resortos.com' : 'manager.villa@resortos.com');
    }
    setPassword('');
  };

  const setDemoAccount = (role: SelectedRole, email: string) => {
    setSelectedRole(role);
    setEmailOrUsername(email);
    setPassword('');
    setErrorMessage(null);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!emailOrUsername.trim()) {
      errors.email = 'Please enter your username or email address';
    } else if (emailOrUsername.trim().length < 3) {
      errors.email = 'Must be at least 3 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await login(emailOrUsername, password, selectedRole.toUpperCase());

      if (result.success && result.user) {
        // Successful login: Redirect based on database-verified role
        if (result.user.role === 'ADMIN') {
          navigate('admin-dashboard', { role: 'admin' });
        } else {
          navigate('manager-dashboard', {
            role: 'manager',
            selectedHotelId: result.user.hotelId || 'h-villa',
          });
        }
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.brandIconWrapper}>
              <Icon name="hotel" size={32} color={colors.primaryNavy} />
            </View>
            <Text style={styles.brandTitle}>ResortOS</Text>
            <Text style={styles.brandSubtitle}>HOTEL & RESORT MANAGEMENT APPLICATION</Text>
            <View style={styles.propertiesTag}>
              <Text style={styles.propertiesText}>THE VILLA  •  NAVKAR PALACE & RESORT</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Role Selector Tabs */}
            <View style={styles.roleSelectorHeader}>
              <Text style={styles.selectorLabel}>Select Login Role</Text>
              <Badge
                label={selectedRole === 'admin' ? 'Owner / Admin' : 'Hotel Manager'}
                variant={selectedRole === 'admin' ? 'primary' : 'success'}
                size="sm"
              />
            </View>

            <View style={styles.roleTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'admin' && styles.roleTabActiveAdmin,
                ]}
                activeOpacity={0.8}
                onPress={() => handleRoleSelect('admin')}
              >
                <Icon
                  name="shield"
                  size={18}
                  color={selectedRole === 'admin' ? colors.primaryNavy : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'admin' && styles.roleTabTextActiveAdmin,
                  ]}
                >
                  Admin / Owner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'manager' && styles.roleTabActiveManager,
                ]}
                activeOpacity={0.8}
                onPress={() => handleRoleSelect('manager')}
              >
                <Icon
                  name="user"
                  size={18}
                  color={selectedRole === 'manager' ? '#047857' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'manager' && styles.roleTabTextActiveManager,
                  ]}
                >
                  Hotel Manager
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Alert Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Icon name="alert-triangle" size={18} color={colors.error} style={styles.errorIcon} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Username or Email Input */}
            <Input
              label="Username or Email Address"
              placeholder="e.g. admin@resortos.com"
              value={emailOrUsername}
              onChangeText={(text) => {
                setEmailOrUsername(text);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon="mail"
              autoCapitalize="none"
              keyboardType="email-address"
              error={fieldErrors.email}
              containerStyle={styles.inputContainer}
            />

            {/* Password Input with built-in Show/Hide eye toggle */}
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon="lock"
              isPassword
              error={fieldErrors.password}
              containerStyle={styles.inputContainer}
            />

            {/* Security Notice */}
            <View style={styles.securityRow}>
              <Icon name="check-circle" size={14} color={colors.success} />
              <Text style={styles.securityText}>
                Backend verifies actual role • Strict multi-hotel isolation
              </Text>
            </View>

            {/* Login Button */}
            <Button
              title={
                loading
                  ? 'Verifying Credentials...'
                  : selectedRole === 'admin'
                  ? 'Sign In as Admin'
                  : 'Sign In as Manager'
              }
              onPress={handleLogin}
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              style={styles.loginButton}
            />

            {/* Quick Demo Test Accounts (development builds only) */}
            {__DEV__ && (
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>QUICK DEMO ACCOUNTS</Text>
              <View style={styles.demoChipsRow}>
                <TouchableOpacity
                  style={[styles.demoChip, selectedRole === 'admin' && styles.demoChipActive]}
                  onPress={() => setDemoAccount('admin', 'admin@resortos.com')}
                >
                  <Text style={styles.demoChipText}>👑 Admin (Both Hotels)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.demoChip,
                    emailOrUsername === 'manager.villa@resortos.com' && styles.demoChipActive,
                  ]}
                  onPress={() => setDemoAccount('manager', 'manager.villa@resortos.com')}
                >
                  <Text style={styles.demoChipText}>🏨 The Villa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.demoChip,
                    emailOrUsername === 'manager.navkar@resortos.com' && styles.demoChipActive,
                  ]}
                  onPress={() => setDemoAccount('manager', 'manager.navkar@resortos.com')}
                >
                  <Text style={styles.demoChipText}>🏛️ Navkar Palace</Text>
                </TouchableOpacity>
              </View>
            </View>
            )}
          </View>

          {/* Footer Branding */}
          <Text style={styles.footerNote}>
            ResortOS v2.0 • Designed for Simple & Reliable Hotel Management
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    ...shadows.sm,
  },
  brandTitle: {
    ...typography.h1,
    color: colors.primaryNavy,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
    fontSize: 11,
  },
  propertiesTag: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: borderRadius.full,
  },
  propertiesText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.md,
  },
  roleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectorLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  roleTabActiveAdmin: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryNavy,
  },
  roleTabActiveManager: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  roleTabText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  roleTabTextActiveAdmin: {
    color: colors.primaryNavy,
    fontWeight: '800',
  },
  roleTabTextActiveManager: {
    color: '#047857',
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorIcon: {
    marginRight: spacing.sm,
  },
  errorBannerText: {
    ...typography.captionMedium,
    color: '#B91C1C',
    flex: 1,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: 2,
  },
  securityText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 6,
    fontSize: 11,
  },
  loginButton: {
    marginTop: spacing.xs,
  },
  demoSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  demoChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  demoChipActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryNavy,
  },
  demoChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 11,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 11,
  },
});

export default LoginScreen;
