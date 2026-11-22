import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon, IconName } from '../common/Icon';
import { Badge, BadgeVariant } from '../common/Badge';

interface ModuleItemProps {
  title: string;
  subtitle: string;
  icon: IconName | string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ModuleItem: React.FC<ModuleItemProps> = ({
  title,
  subtitle,
  icon,
  badge,
  badgeVariant = 'primary',
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.iconContainer}>
        <Icon name={icon} size={20} color={colors.primaryNavy} />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {badge && (
            <Badge
              label={badge}
              variant={badgeVariant}
              size="sm"
              style={styles.badge}
            />
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.chevronContainer}>
        <Icon name="chevron-right" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.xs,
    ...shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#D0E1F2',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.xs,
  },
  badge: {
    marginLeft: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevronContainer: {
    marginLeft: spacing.sm,
    paddingLeft: spacing.xs,
  },
});
