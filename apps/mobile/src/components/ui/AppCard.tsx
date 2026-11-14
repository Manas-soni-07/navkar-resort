import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, borderRadius, spacing, shadows } from '@/theme';

interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
  padding = 'lg',
}) => {
  const cardStyles = [
    styles.card,
    styles[variant],
    { padding: spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
  },
  elevated: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 0,
  },
});
