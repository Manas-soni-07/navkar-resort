import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

interface CardProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'elevated' | 'outlined' | 'subtle';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  onPress,
  padding = 'md',
  variant = 'elevated',
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
}) => {
  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: spacing.sm };
      case 'lg':
        return { padding: spacing.xl };
      case 'md':
      default:
        return { padding: spacing.lg };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1.2,
          borderColor: colors.border,
          ...shadows.none,
        };
      case 'subtle':
        return {
          backgroundColor: colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...shadows.none,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.sm,
        };
    }
  };

  const hasHeader = Boolean(title || subtitle || headerAction);
  const ContainerComponent = onPress ? TouchableOpacity : View;
  const touchProps = onPress ? { activeOpacity: 0.85, onPress } : {};

  return (
    <ContainerComponent
      {...touchProps}
      style={[styles.card, getVariantStyle(), getPaddingStyle(), style]}
    >
      {hasHeader && (
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
            {subtitle && (
              <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
            )}
          </View>
          {headerAction && <View style={styles.actionGroup}>{headerAction}</View>}
        </View>
      )}

      {children && <View style={[styles.content, contentStyle]}>{children}</View>}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    width: '100%',
  },
});
