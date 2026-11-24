/**
 * ResortOS Lucide-Style Icon Component
 * 
 * Crisp, lightweight vector iconography crafted with pure React Native primitives.
 * Works seamlessly across Android, iOS, and Web with zero external dependencies.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Activity, ArrowLeft, Bed, Building, Calendar, ChartColumn, Check, ChevronDown, ChevronLeft,
  ChevronRight, Circle, CircleAlert, CircleArrowDown, CircleCheck, Clock, CreditCard, Database,
  DollarSign, Download, Eye, EyeOff, FileText, Filter, Globe, Hotel, Info, Key, Layers, LayoutGrid, Lock,
  LogIn, LogOut, Mail, MapPin, Phone, Plus, Receipt, RefreshCw, RotateCcw, Search, Settings,
  Share2, Shield, SquarePen, TrendingDown, TrendingUp, TriangleAlert, User, UserCheck, Users, X,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';

/**
 * Real vector icons (lucide-react-native + react-native-svg) for every IconName.
 * Names not listed here fall back to the hand-drawn primitives below.
 */
const LUCIDE: Record<string, LucideIcon> = {
  building: Building, shield: Shield, user: User, users: Users, key: Key, bed: Bed,
  'check-circle': CircleCheck, calendar: Calendar, receipt: Receipt, 'dollar-sign': DollarSign,
  'trending-up': TrendingUp, 'trending-down': TrendingDown, eye: Eye, 'eye-off': EyeOff, lock: Lock,
  mail: Mail, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft, 'alert-triangle': TriangleAlert, 'alert-circle': CircleAlert,
  'refresh-cw': RefreshCw, check: Check, x: X, 'log-out': LogOut, 'log-in': LogIn, clock: Clock,
  activity: Activity, hotel: Hotel, plus: Plus, grid: LayoutGrid, 'credit-card': CreditCard,
  'user-check': UserCheck, 'arrow-down-circle': CircleArrowDown, 'bar-chart-2': ChartColumn,
  database: Database, settings: Settings, filter: Filter, layers: Layers, globe: Globe,
  'map-pin': MapPin, phone: Phone, edit: SquarePen, 'rotate-ccw': RotateCcw, info: Info,
  search: Search, download: Download, 'share-2': Share2, 'file-text': FileText, circle: Circle,
};

export type IconName =
  | 'building'
  | 'shield'
  | 'user'
  | 'users'
  | 'key'
  | 'bed'
  | 'check-circle'
  | 'calendar'
  | 'receipt'
  | 'dollar-sign'
  | 'trending-up'
  | 'trending-down'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'mail'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-left'
  | 'alert-triangle'
  | 'alert-circle'
  | 'refresh-cw'
  | 'check'
  | 'x'
  | 'log-out'
  | 'log-in'
  | 'clock'
  | 'activity'
  | 'hotel'
  | 'plus'
  | 'grid'
  | 'credit-card'
  | 'user-check'
  | 'arrow-down-circle'
  | 'bar-chart-2'
  | 'database'
  | 'settings'
  | 'filter'
  | 'layers'
  | 'globe'
  | 'map-pin'
  | 'phone'
  | 'edit'
  | 'rotate-ccw'
  | 'info'
  | 'search'
  | 'share-2'
  | 'file-text'
  | 'download'
  | 'circle';

interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = colors.primaryNavy,
  style,
}) => {
  const strokeWidth = Math.max(1.75, size * 0.09);

  const renderIconContent = () => {
    const Vector = LUCIDE[name];
    if (Vector) return <Vector size={size} color={color} strokeWidth={2} />;

    switch (name) {
      case 'hotel':
      case 'building':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.72,
                height: size * 0.85,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRadius: 2,
                alignItems: 'center',
                paddingTop: 2,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
                <View style={{ width: 3, height: 3, backgroundColor: color }} />
                <View style={{ width: 3, height: 3, backgroundColor: color }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
                <View style={{ width: 3, height: 3, backgroundColor: color }} />
                <View style={{ width: 3, height: 3, backgroundColor: color }} />
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: size * 0.28,
                  height: size * 0.35,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  borderWidth: strokeWidth,
                  borderColor: color,
                  borderBottomWidth: 0,
                }}
              />
            </View>
          </View>
        );

      case 'shield':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.75,
                height: size * 0.85,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopLeftRadius: size * 0.35,
                borderTopRightRadius: size * 0.35,
                borderBottomLeftRadius: size * 0.45,
                borderBottomRightRadius: size * 0.45,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: strokeWidth,
                  height: size * 0.35,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'user':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.4,
                height: size * 0.4,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: size * 0.75,
                height: size * 0.4,
                borderTopLeftRadius: size * 0.35,
                borderTopRightRadius: size * 0.35,
                borderWidth: strokeWidth,
                borderColor: color,
                borderBottomWidth: 0,
              }}
            />
          </View>
        );

      case 'users':
        return (
          <View style={{ width: size, height: size, justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                left: 1,
                width: size * 0.35,
                height: size * 0.35,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                top: 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 0,
                bottom: 2,
                width: size * 0.55,
                height: size * 0.35,
                borderTopLeftRadius: size * 0.25,
                borderTopRightRadius: size * 0.25,
                borderWidth: strokeWidth,
                borderColor: color,
                borderBottomWidth: 0,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 2,
                width: size * 0.32,
                height: size * 0.32,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                top: 4,
                opacity: 0.8,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 2,
                width: size * 0.45,
                height: size * 0.3,
                borderTopLeftRadius: size * 0.2,
                borderTopRightRadius: size * 0.2,
                borderWidth: strokeWidth,
                borderColor: color,
                borderBottomWidth: 0,
                opacity: 0.8,
              }}
            />
          </View>
        );

      case 'key':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.45,
                height: size * 0.45,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                position: 'absolute',
                top: 2,
                left: 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.6,
                height: strokeWidth,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
                bottom: size * 0.3,
                right: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: strokeWidth * 2,
                height: strokeWidth,
                backgroundColor: color,
                bottom: size * 0.18,
                right: size * 0.1,
              }}
            />
          </View>
        );

      case 'bed':
        return (
          <View style={{ width: size, height: size, justifyContent: 'center' }}>
            {/* Headboard */}
            <View
              style={{
                position: 'absolute',
                left: 1,
                top: size * 0.2,
                bottom: size * 0.2,
                width: strokeWidth,
                backgroundColor: color,
              }}
            />
            {/* Pillow */}
            <View
              style={{
                position: 'absolute',
                left: 4,
                top: size * 0.3,
                width: size * 0.25,
                height: size * 0.2,
                borderRadius: 2,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
            {/* Mattress & base */}
            <View
              style={{
                position: 'absolute',
                left: 1,
                right: 1,
                top: size * 0.55,
                height: size * 0.2,
                borderTopRightRadius: 3,
                borderWidth: strokeWidth,
                borderColor: color,
                borderBottomWidth: 0,
              }}
            />
            {/* Right leg */}
            <View
              style={{
                position: 'absolute',
                right: 1,
                top: size * 0.45,
                bottom: size * 0.2,
                width: strokeWidth,
                backgroundColor: color,
              }}
            />
          </View>
        );

      case 'check-circle':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.85,
                height: size * 0.85,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.35,
                  height: size * 0.2,
                  borderLeftWidth: strokeWidth * 1.1,
                  borderBottomWidth: strokeWidth * 1.1,
                  borderColor: color,
                  transform: [{ rotate: '-45deg' }],
                  marginBottom: 2,
                }}
              />
            </View>
          </View>
        );

      case 'check':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.6,
                height: size * 0.35,
                borderLeftWidth: strokeWidth * 1.2,
                borderBottomWidth: strokeWidth * 1.2,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
                marginBottom: 2,
              }}
            />
          </View>
        );

      case 'calendar':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.85,
                height: size * 0.75,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRadius: 4,
                paddingTop: 3,
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: strokeWidth,
                  backgroundColor: color,
                  marginBottom: 3,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 2 }}>
                <View style={{ width: 2, height: 2, backgroundColor: color }} />
                <View style={{ width: 2, height: 2, backgroundColor: color }} />
                <View style={{ width: 2, height: 2, backgroundColor: color }} />
              </View>
            </View>
          </View>
        );

      case 'receipt':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.7,
                height: size * 0.85,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRadius: 2,
                paddingHorizontal: 2,
                paddingVertical: 3,
                justifyContent: 'space-around',
              }}
            >
              <View style={{ height: strokeWidth, backgroundColor: color, width: '70%' }} />
              <View style={{ height: strokeWidth, backgroundColor: color, width: '90%' }} />
              <View style={{ height: strokeWidth, backgroundColor: color, width: '50%' }} />
            </View>
          </View>
        );

      case 'dollar-sign':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: strokeWidth,
                height: size * 0.85,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: size * 0.55,
                height: size * 0.35,
                borderTopWidth: strokeWidth,
                borderLeftWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                top: 1,
              }}
            />
            <View
              style={{
                width: size * 0.55,
                height: size * 0.35,
                borderBottomWidth: strokeWidth,
                borderLeftWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                bottom: 1,
              }}
            />
          </View>
        );

      case 'trending-up':
        return (
          <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: size * 0.75,
                height: size * 0.5,
                borderBottomWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'trending-down':
        return (
          <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: size * 0.75,
                height: size * 0.5,
                borderTopWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'lock':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.45,
                height: size * 0.35,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopLeftRadius: 999,
                borderTopRightRadius: 999,
                borderBottomWidth: 0,
              }}
            />
            <View
              style={{
                width: size * 0.65,
                height: size * 0.45,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRadius: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: strokeWidth * 1.5,
                  height: size * 0.15,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'mail':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.85,
                height: size * 0.65,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: size * 0.6,
                  height: size * 0.6,
                  borderLeftWidth: strokeWidth,
                  borderBottomWidth: strokeWidth,
                  borderColor: color,
                  transform: [{ rotate: '-45deg' }],
                  top: -size * 0.25,
                  alignSelf: 'center',
                }}
              />
            </View>
          </View>
        );

      case 'eye':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.85,
                height: size * 0.5,
                borderRadius: size * 0.25,
                borderWidth: strokeWidth,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.22,
                  height: size * 0.22,
                  borderRadius: 999,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'eye-off':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.85,
                height: size * 0.5,
                borderRadius: size * 0.25,
                borderWidth: strokeWidth,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
              }}
            >
              <View
                style={{
                  width: size * 0.2,
                  height: size * 0.2,
                  borderRadius: 999,
                  backgroundColor: color,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                width: size * 0.9,
                height: strokeWidth,
                backgroundColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'chevron-left':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.35,
                height: size * 0.35,
                borderBottomWidth: strokeWidth * 1.2,
                borderLeftWidth: strokeWidth * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginLeft: 2,
              }}
            />
          </View>
        );

      case 'chevron-right':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.35,
                height: size * 0.35,
                borderTopWidth: strokeWidth * 1.2,
                borderRightWidth: strokeWidth * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginRight: 2,
              }}
            />
          </View>
        );

      case 'chevron-down':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.35,
                height: size * 0.35,
                borderBottomWidth: strokeWidth * 1.2,
                borderRightWidth: strokeWidth * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginBottom: 2,
              }}
            />
          </View>
        );

      case 'arrow-left':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: strokeWidth * 1.1,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: size * 0.18,
                width: size * 0.35,
                height: size * 0.35,
                borderTopWidth: strokeWidth * 1.1,
                borderLeftWidth: strokeWidth * 1.1,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'alert-triangle':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.8,
                height: size * 0.75,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                alignItems: 'center',
                paddingTop: 2,
              }}
            >
              <View style={{ width: strokeWidth, height: size * 0.25, backgroundColor: color, marginBottom: 2 }} />
              <View style={{ width: strokeWidth * 1.3, height: strokeWidth * 1.3, borderRadius: 999, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'refresh-cw':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.75,
                height: size * 0.75,
                borderRadius: 999,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRightColor: 'transparent',
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'log-out':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                left: 2,
                width: size * 0.45,
                height: size * 0.75,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRightWidth: 0,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 2,
                width: size * 0.5,
                height: strokeWidth,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 2,
                width: size * 0.25,
                height: size * 0.25,
                borderTopWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'x':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: strokeWidth / 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: strokeWidth / 2,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'plus':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: strokeWidth / 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: strokeWidth,
                height: size * 0.65,
                backgroundColor: color,
                borderRadius: strokeWidth / 2,
              }}
            />
          </View>
        );

      case 'clock':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: (size * 0.8) / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: size * 0.15,
                  width: strokeWidth,
                  height: size * 0.25,
                  backgroundColor: color,
                  borderRadius: strokeWidth / 2,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: size * 0.38,
                  top: size * 0.38,
                  width: size * 0.22,
                  height: strokeWidth,
                  backgroundColor: color,
                  borderRadius: strokeWidth / 2,
                }}
              />
            </View>
          </View>
        );

      case 'search':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: (size * 0.55) / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                position: 'absolute',
                top: size * 0.12,
                left: size * 0.12,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                right: size * 0.14,
                width: size * 0.35,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: strokeWidth / 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'share-2':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                right: size * 0.1,
                top: size * 0.1,
                width: size * 0.24,
                height: size * 0.24,
                borderRadius: (size * 0.24) / 2,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.1,
                bottom: size * 0.1,
                width: size * 0.24,
                height: size * 0.24,
                borderRadius: (size * 0.24) / 2,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: size * 0.1,
                top: size * 0.38,
                width: size * 0.24,
                height: size * 0.24,
                borderRadius: (size * 0.24) / 2,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: size * 0.28,
                top: size * 0.3,
                width: size * 0.45,
                height: strokeWidth * 0.8,
                backgroundColor: color,
                transform: [{ rotate: '-30deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: size * 0.28,
                bottom: size * 0.3,
                width: size * 0.45,
                height: strokeWidth * 0.8,
                backgroundColor: color,
                transform: [{ rotate: '30deg' }],
              }}
            />
          </View>
        );

      case 'file-text':
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: size * 0.65,
                height: size * 0.8,
                borderRadius: 2,
                borderWidth: strokeWidth,
                borderColor: color,
                padding: 2,
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <View style={{ height: strokeWidth, width: '70%', backgroundColor: color }} />
              <View style={{ height: strokeWidth, width: '90%', backgroundColor: color }} />
              <View style={{ height: strokeWidth, width: '50%', backgroundColor: color }} />
            </View>
          </View>
        );

      default:
        // Generic fallback indicator
        return (
          <View
            style={{
              width: size * 0.65,
              height: size * 0.65,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
            }}
          />
        );
    }
  };

  return <View style={[styles.container, { width: size, height: size }, style]}>{renderIconContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
