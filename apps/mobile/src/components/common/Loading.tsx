import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface LoadingProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading data...',
  subMessage,
  fullScreen = false,
  size = 'large',
  color = colors.primaryNavy,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        fullScreen ? styles.fullScreen : styles.inline,
        style,
      ]}
    >
      <View style={styles.card}>
        <ActivityIndicator size={size} color={color} style={styles.spinner} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {subMessage ? <Text style={styles.subMessage}>{subMessage}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 250,
  },
  inline: {
    padding: spacing.xl,
    width: '100%',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subMessage: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
