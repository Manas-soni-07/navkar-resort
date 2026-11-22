import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon, IconName } from '../common/Icon';
import { Badge, BadgeVariant } from '../common/Badge';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: IconName;
  badgeText?: string;
  badgeVariant?: BadgeVariant;
  accentColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeVariant = 'neutral',
  accentColor = colors.primaryNavy,
  style,
  onPress,
}) => {
  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSubtle }]}>
          <Icon name={icon} size={18} color={accentColor} />
        </View>
        {badgeText ? (
          <Badge label={badgeText} variant={badgeVariant} size="sm" />
        ) : null}
      </View>

      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.titleText}>{title}</Text>
      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  titleText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleText: {
    ...typography.badge,
    color: colors.textMuted,
    marginTop: 2,
  },
});
