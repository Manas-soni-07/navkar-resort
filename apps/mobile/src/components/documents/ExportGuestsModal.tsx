/**
 * Admin-only guest register export (e.g. the monthly listing for the police station).
 * Choose hotel, period (by check-in date) and which columns to include, then download .xlsx.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { apiClient, GuestExportField } from '../../services/apiClient';
import type { HotelSummary } from '../../types/hotel';

type PeriodMode = 'this' | 'last' | 'month' | 'custom' | 'all';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in India as { y, m (1-12), d }. */
function istToday() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
    .split('-')
    .map(Number);
  return { y, m, d };
}
const pad = (n: number) => String(n).padStart(2, '0');
function monthRange(y: number, m: number) {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}
function shiftMonth(y: number, m: number, delta: number) {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  hotels: HotelSummary[];
  initialHotelId?: string;
}

export const ExportGuestsModal: React.FC<Props> = ({ visible, onClose, hotels, initialHotelId }) => {
  const today = useMemo(istToday, [visible]);
  const recentMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => shiftMonth(today.y, today.m, -i)),
    [today]
  );

  const [hotelId, setHotelId] = useState<string>('');
  const [mode, setMode] = useState<PeriodMode>('this');
  const [pickedMonth, setPickedMonth] = useState(recentMonths[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fields, setFields] = useState<GuestExportField[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const valid = hotels.map((h) => h.id);
    setHotelId(initialHotelId && valid.includes(initialHotelId) ? initialHotelId : valid[0] ?? '');
    setMode('this');
    setPickedMonth(recentMonths[1] ?? recentMonths[0]);
    const thisMonth = monthRange(today.y, today.m);
    setFrom(thisMonth.from);
    setTo(`${today.y}-${pad(today.m)}-${pad(today.d)}`);
    apiClient
      .getGuestExportFields()
      .then((f) => {
        setFields(f);
        setSelected(new Set(f.filter((x) => x.default).map((x) => x.key)));
      })
      .catch((e) => Alert.alert('Export', e?.message || 'Could not load export fields.'));
  }, [visible]);

  /** The from/to sent to the server for the chosen period (undefined = no limit). */
  const range = useMemo((): { from?: string; to?: string; label: string; error?: string } => {
    if (mode === 'this') return { ...monthRange(today.y, today.m), label: `${MONTHS[today.m - 1]} ${today.y}` };
    if (mode === 'last') {
      const p = shiftMonth(today.y, today.m, -1);
      return { ...monthRange(p.y, p.m), label: `${MONTHS[p.m - 1]} ${p.y}` };
    }
    if (mode === 'month') return { ...monthRange(pickedMonth.y, pickedMonth.m), label: `${MONTHS[pickedMonth.m - 1]} ${pickedMonth.y}` };
    if (mode === 'all') return { label: 'All dates' };
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { label: 'Custom', error: 'Enter dates as YYYY-MM-DD' };
    if (from > to) return { label: 'Custom', error: '"From" must be on or before "To"' };
    return { from, to, label: `${from} to ${to}` };
  }, [mode, pickedMonth, from, to, today]);

  const fieldList = useMemo(() => fields.filter((f) => selected.has(f.key)).map((f) => f.key), [fields, selected]);

  // Live count of matching guests for the current choices.
  useEffect(() => {
    if (!visible || !hotelId || range.error || !fields.length) {
      setCount(null);
      return;
    }
    let cancelled = false;
    setCounting(true);
    const t = setTimeout(() => {
      apiClient
        .getGuestExportSummary({ hotelId, from: range.from, to: range.to, fields: ['guestName'] })
        .then((r) => !cancelled && setCount(r.totalRecords))
        .catch(() => !cancelled && setCount(null))
        .finally(() => !cancelled && setCounting(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [visible, hotelId, range.from, range.to, range.error, fields.length]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleDownload = async () => {
    if (range.error) return Alert.alert('Check the dates', range.error);
    if (!fieldList.length) return Alert.alert('Choose fields', 'Select at least one field to include.');
    setDownloading(true);
    try {
      const url = await apiClient.getGuestExportUrl({ hotelId, from: range.from, to: range.to, fields: fieldList });
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not prepare the Excel file.');
    } finally {
      setDownloading(false);
    }
  };

  const groups: GuestExportField['group'][] = ['Guest', 'Stay', 'Payment', 'Other'];
  const PERIODS: { id: PeriodMode; label: string }[] = [
    { id: 'this', label: 'This month' },
    { id: 'last', label: 'Last month' },
    { id: 'month', label: 'Pick month' },
    { id: 'custom', label: 'Custom dates' },
    { id: 'all', label: 'All dates' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Export Guest Register</Text>
              <Text style={styles.subtitle}>Excel (.xlsx) • guests by check-in date</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Icon name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
            <Text style={styles.label}>Hotel</Text>
            <View style={styles.chipRow}>
              {hotels.map((h) => (
                <Chip key={h.id} label={h.name} active={hotelId === h.id} onPress={() => setHotelId(h.id)} />
              ))}
            </View>

            <Text style={styles.label}>Period</Text>
            <View style={styles.chipRow}>
              {PERIODS.map((p) => (
                <Chip key={p.id} label={p.label} active={mode === p.id} onPress={() => setMode(p.id)} />
              ))}
            </View>
            {mode === 'month' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                {recentMonths.map((rm) => (
                  <Chip
                    key={`${rm.y}-${rm.m}`}
                    label={`${MONTHS[rm.m - 1]} ${rm.y}`}
                    active={pickedMonth.y === rm.y && pickedMonth.m === rm.m}
                    onPress={() => setPickedMonth(rm)}
                  />
                ))}
              </ScrollView>
            )}
            {mode === 'custom' && (
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.small}>From</Text>
                  <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={styles.input} autoCapitalize="none" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.small}>To</Text>
                  <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={styles.input} autoCapitalize="none" />
                </View>
              </View>
            )}
            <Text style={[styles.small, range.error ? { color: colors.error } : null]}>
              {range.error ? range.error : `Period: ${range.label}`}
              {!range.error && (counting ? '  •  counting…' : count != null ? `  •  ${count} guest${count === 1 ? '' : 's'}` : '')}
            </Text>

            <View style={styles.fieldsHeader}>
              <Text style={styles.label}>Fields to include ({fieldList.length})</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity onPress={() => setSelected(new Set(fields.map((f) => f.key)))}>
                  <Text style={styles.link}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelected(new Set())}>
                  <Text style={styles.link}>None</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelected(new Set(fields.filter((f) => f.default).map((f) => f.key)))}>
                  <Text style={styles.link}>Police list</Text>
                </TouchableOpacity>
              </View>
            </View>
            {fields.length === 0 ? (
              <ActivityIndicator color={colors.primaryNavy} style={{ marginVertical: spacing.md }} />
            ) : (
              groups.map((g) => (
                <View key={g} style={{ marginBottom: spacing.sm }}>
                  <Text style={styles.groupTitle}>{g}</Text>
                  {fields
                    .filter((f) => f.group === g)
                    .map((f) => (
                      <TouchableOpacity key={f.key} style={styles.checkRow} onPress={() => toggle(f.key)}>
                        <View style={[styles.box, selected.has(f.key) && styles.boxOn]}>
                          {selected.has(f.key) ? <Icon name="check" size={14} color={colors.textInverse} /> : null}
                        </View>
                        <Text style={styles.checkLabel}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ))
            )}
          </ScrollView>

          <Button
            title={downloading ? 'Preparing…' : 'Download Excel'}
            icon="download"
            onPress={handleDownload}
            disabled={downloading || !hotelId || !!range.error || !fieldList.length}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
};

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  label: { ...typography.captionMedium, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs },
  small: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  link: { ...typography.captionMedium, color: colors.accentBlue },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { ...typography.captionMedium, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  fieldsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  groupTitle: { ...typography.captionMedium, color: colors.primaryNavy, marginTop: spacing.xs, marginBottom: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  checkLabel: { ...typography.body, color: colors.textPrimary },
});

export default ExportGuestsModal;
