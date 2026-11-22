import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const getVariantStyles = (): {
    button: ViewStyle;
    text: TextStyle;
    spinnerColor: string;
    iconColor: string;
  } => {
    switch (variant) {
      case 'primary':
        return {
          button: {
            backgroundColor: isDisabled ? '#94A3B8' : colors.primaryNavy,
            borderColor: 'transparent',
            borderWidth: 1,
          },
          text: {
            color: colors.textInverse,
          },
          spinnerColor: colors.textInverse,
          iconColor: colors.textInverse,
        };

      case 'secondary':
        return {
          button: {
            backgroundColor: isDisabled ? colors.surfaceSubtle : colors.primaryTint,
            borderColor: '#D0E1F2',
            borderWidth: 1,
          },
          text: {
            color: isDisabled ? colors.textMuted : colors.primaryNavy,
          },
          spinnerColor: colors.primaryNavy,
          iconColor: colors.primaryNavy,
        };

      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: isDisabled ? colors.border : colors.borderFocus,
            borderWidth: 1.5,
          },
          text: {
            color: isDisabled ? colors.textMuted : colors.borderFocus,
          },
          spinnerColor: colors.borderFocus,
          iconColor: colors.borderFocus,
        };

      case 'ghost':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: isDisabled ? colors.textMuted : colors.accentBlue,
          },
          spinnerColor: colors.accentBlue,
          iconColor: colors.accentBlue,
        };

      case 'danger':
        return {
          button: {
            backgroundColor: isDisabled ? '#FCA5A5' : colors.error,
            borderColor: 'transparent',
            borderWidth: 1,
          },
          text: {
            color: colors.textInverse,
          },
          spinnerColor: colors.textInverse,
          iconColor: colors.textInverse,
        };
    }
  };

  const getSizeStyles = (): { button: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          button: {
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.sm,
            minHeight: 34,
          },
          text: {
            fontSize: 13,
            fontWeight: '600',
          },
          iconSize: 15,
        };
      case 'lg':
        return {
          button: {
            paddingVertical: spacing.md + 2,
            paddingHorizontal: spacing.xxl,
            borderRadius: borderRadius.lg,
            minHeight: 52,
          },
          text: {
            fontSize: 16,
            fontWeight: '600',
          },
          iconSize: 20,
        };
      case 'md':
      default:
        return {
          button: {
            paddingVertical: spacing.sm + 3,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            fontWeight: '600',
          },
          iconSize: 18,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.baseButton,
        variantStyle.button,
        sizeStyle.button,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator
            size="small"
            color={variantStyle.spinnerColor}
            style={styles.spinner}
          />
          <Text style={[sizeStyle.text, variantStyle.text, textStyle]}>
            Loading...
          </Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={[sizeStyle.text, variantStyle.text, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
