import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'gold';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primaryTint,
          text: colors.primaryNavy,
          border: '#D0E1F2',
        };
      case 'success':
        return {
          bg: colors.successLight,
          text: colors.success,
          border: colors.successBorder,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          text: colors.warning,
          border: colors.warningBorder,
        };
      case 'error':
        return {
          bg: colors.errorLight,
          text: colors.error,
          border: colors.errorBorder,
        };
      case 'info':
        return {
          bg: colors.infoLight,
          text: colors.info,
          border: colors.infoBorder,
        };
      case 'gold':
        return {
          bg: colors.goldLight,
          text: colors.goldAccent,
          border: '#FDE68A',
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const currentVariant = getVariantStyles();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentVariant.bg,
          borderColor: currentVariant.border,
          paddingHorizontal: isSmall ? spacing.xs : spacing.sm,
          paddingVertical: isSmall ? 2 : spacing.xxs + 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.badge,
          { color: currentVariant.text, fontSize: isSmall ? 10 : 11 },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
