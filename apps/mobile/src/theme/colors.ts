/**
 * ResortOS Design System - Colors
 * 
 * Theme:
 * - White / Smoke background
 * - Premium Navy / Blue accents
 * - Clean Slate typography
 * - Subtle status colors
 */

export const colors = {
  // Base backgrounds (White / Smoke luxury palette)
  background: '#F8FAFC',        // Slate 50 - clean smoke background
  surface: '#FFFFFF',           // Pure white for cards & elevated surfaces
  surfaceSubtle: '#F1F5F9',     // Slate 100 - secondary surface
  surfaceHover: '#E2E8F0',      // Slate 200 - pressed/hover state
  surfaceElevated: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',            // Subtle border for clean card contours
  borderLight: '#EDF2F7',       // Ultra subtle divider
  borderFocus: '#1E3A8A',       // Focused input border

  // Primary Navy & Blue Accents
  primaryNavy: '#0F2942',       // Luxury Navy - brand primary
  primaryNavyDark: '#0A1C2E',   // Darker Navy for pressed state
  primaryNavyLight: '#1E3A5F',  // Lighter Navy for secondary elements
  primaryTint: '#EBF3FA',       // Soft Navy tint for badges & icon backgrounds

  accentBlue: '#2563EB',        // Professional Blue (Blue 600)
  accentBlueLight: '#EFF6FF',   // Blue 50 for highlights
  accentBlueHover: '#1D4ED8',   // Blue 700

  // Optional warm gold/amber touch for VIP / luxury accents
  goldAccent: '#B45309',        // Warm Amber 700
  goldDark: '#92400E',          // Amber 800 - rich luxury gold text
  goldLight: '#FEF3C7',         // Warm Amber 100
  goldBorder: '#FDE68A',        // Amber 200

  // Typography
  textPrimary: '#0F172A',       // Slate 900 - rich charcoal
  textSecondary: '#475569',     // Slate 600 - crisp secondary
  textMuted: '#94A3B8',         // Slate 400 - placeholders & captions
  textInverse: '#FFFFFF',       // Pure white on dark navy backgrounds
  textOnAccent: '#FFFFFF',

  // Functional Status Colors
  success: '#059669',           // Emerald 600
  successLight: '#ECFDF5',      // Emerald 50
  successBorder: '#A7F3D0',

  warning: '#D97706',           // Amber 600
  warningLight: '#FFFBEB',      // Amber 50
  warningBorder: '#FDE68A',

  error: '#DC2626',             // Red 600
  errorLight: '#FEF2F2',        // Red 50
  errorBorder: '#FECACA',

  info: '#2563EB',              // Blue 600
  infoLight: '#EFF6FF',         // Blue 50
  infoBorder: '#BFDBFE',
} as const;

export type ColorName = keyof typeof colors;
