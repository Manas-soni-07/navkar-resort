/**
 * ResortOS Design System - Typography
 * 
 * Clean, modern typography scale optimized for mobile readability and hierarchy.
 */

import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  bodySemiBold: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badge: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
};
