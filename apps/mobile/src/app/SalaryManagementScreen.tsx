/**
 * ResortOS - Salary Management Screen (Admin Only)
 * Attendance-based monthly salary calculations with automated advance deductions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { apiClient } from '../services/apiClient';

interface StaffSalaryRow {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  hotelId: string;
  hotelName: string;
  baseSalary: number;
  totalDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  advanceDeductions: number;
  status: 'PENDING' | 'PAID';
}

export const SalaryManagementScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();

  const [selectedMonth, setSelectedMonth] = useState('November 2026');
  const [filterHotel, setFilterHotel] = useState<'all' | 'h-villa' | 'h-navkar'>('all');
  const [payrollRows, setPayrollRows] = useState<StaffSalaryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.getSalaries(filterHotel);
      setPayrollRows(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load live payroll records from database');
    } finally {
      setLoading(false);
    }
  }, [filterHotel]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const filteredPayroll = useMemo(() => {
    if (filterHotel === 'all') return payrollRows;
    return payrollRows.filter((r) => r.hotelId === filterHotel);
  }, [payrollRows, filterHotel]);

  // Financial summary
  const summary = useMemo(() => {
    let grossTotal = 0;
    let advanceTotal = 0;
    let netTotal = 0;

    for (const row of filteredPayroll) {
      const payableDays = row.presentDays + row.halfDays * 0.5;
      const gross = Math.round((row.baseSalary / row.totalDays) * payableDays);
      const net = Math.max(0, gross - row.advanceDeductions);
      grossTotal += gross;
      advanceTotal += row.advanceDeductions;
      netTotal += net;
    }

    return { grossTotal, advanceTotal, netTotal };
  }, [filteredPayroll]);

  const handleMarkAsPaid = (staffId: string, staffName: string, netAmount: number, hotelId: string) => {
    Alert.alert(
      'Confirm Salary Payment',
      `Mark salary of ${formatCurrency(netAmount)} as PAID for ${staffName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Mark Paid',
          onPress: async () => {
            try {
              await apiClient.paySalary({
                staffId,
                hotelId,
                netAmount,
                month: 11,
                year: 2026,
              });
              await fetchSalaries();
            } catch (err: any) {
              Alert.alert('Payment Error', err.message || 'Failed to persist salary payment to database');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Salary Management"
        subtitle="Admin Access • Attendance & Advance Formulas"
        showBack
        onBack={goBack}
        rightAction={
          <Button
            title="View Advances"
            size="sm"
            variant="ghost"
            onPress={() => navigate('salary-advances')}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Formula Explanation Banner */}
        <View style={styles.formulaCard}>
          <View style={styles.formulaHeader}>
            <Icon name="info" size={16} color={colors.accentBlue} />
            <Text style={styles.formulaTitle}>Automated Salary Computation Rules</Text>
          </View>
          <Text style={styles.formulaText}>
            • Present = Full Day Pay  •  Half Day = 50% Pay  •  Absent = Unpaid{'\n'}
            • Net Salary = (Base / 30 × Payable Days) − Salary Advances
          </Text>
        </View>

        {/* Property & Month Filter */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.chip, filterHotel === 'all' && styles.chipActive]}
            onPress={() => setFilterHotel('all')}
          >
            <Text style={[styles.chipText, filterHotel === 'all' && styles.chipTextActive]}>
              All Hotels
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, filterHotel === 'h-villa' && styles.chipActive]}
            onPress={() => setFilterHotel('h-villa')}
          >
            <Text style={[styles.chipText, filterHotel === 'h-villa' && styles.chipTextActive]}>
              The Villa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, filterHotel === 'h-navkar' && styles.chipActive]}
            onPress={() => setFilterHotel('h-navkar')}
          >
            <Text style={[styles.chipText, filterHotel === 'h-navkar' && styles.chipTextActive]}>
              Navkar Palace
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card padding="md" variant="elevated" style={styles.summaryCard}>
          <Text style={styles.monthTag}>{selectedMonth} Payroll Total</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>Gross Earnings</Text>
              <Text style={styles.sumVal}>{formatCurrency(summary.grossTotal)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>Advance Deductions</Text>
              <Text style={[styles.sumVal, { color: colors.error }]}>
                − {formatCurrency(summary.advanceTotal)}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>Net Disbursable</Text>
              <Text style={[styles.sumVal, { color: '#047857', fontWeight: '800' }]}>
                {formatCurrency(summary.netTotal)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Payroll Staff List */}
        <Text style={styles.sectionHeader}>Staff Monthly Slips ({filteredPayroll.length})</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primaryNavy} />
            <Text style={styles.loadingText}>Loading payroll records from database...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={32} color={colors.error} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Button title="Retry" size="sm" variant="outline" onPress={fetchSalaries} style={{ marginTop: 8 }} />
          </View>
        ) : filteredPayroll.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No salary records found for this hotel/period.</Text>
          </View>
        ) : (
          filteredPayroll.map((row) => {
            const payableDays = row.presentDays + row.halfDays * 0.5;
            const grossSalary = Math.round((row.baseSalary / row.totalDays) * payableDays);
            const netSalary = Math.max(0, grossSalary - row.advanceDeductions);
            const isPaid = row.status === 'PAID';

            return (
              <Card key={row.id} padding="lg" variant="elevated" style={styles.payrollCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.staffBlock}>
                    <Text style={styles.staffName}>{row.staffName}</Text>
                    <Text style={styles.roleSub}>{row.role} • {row.hotelName}</Text>
                  </View>
                  <Badge
                    label={isPaid ? 'PAID' : 'PENDING'}
                    variant={isPaid ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                {/* Attendance Breakdown */}
                <View style={styles.attendanceBar}>
                  <Text style={styles.attItem}>
                    Present: <Text style={styles.attBold}>{row.presentDays}d</Text>
                  </Text>
                  <Text style={styles.attItem}>
                    Half Day: <Text style={styles.attBold}>{row.halfDays}d</Text>
                  </Text>
                  <Text style={styles.attItem}>
                    Absent: <Text style={styles.attBold}>{row.absentDays}d</Text>
                  </Text>
                  <Text style={styles.attItem}>
                    Payable: <Text style={[styles.attBold, { color: colors.primaryNavy }]}>{payableDays}d</Text>
                  </Text>
                </View>

                {/* Calculation Line Items */}
                <View style={styles.calcBox}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Base Monthly Salary:</Text>
                    <Text style={styles.calcVal}>{formatCurrency(row.baseSalary)}</Text>
                  </View>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Gross Earned ({payableDays}/30 days):</Text>
                    <Text style={styles.calcVal}>{formatCurrency(grossSalary)}</Text>
                  </View>

                  {row.advanceDeductions > 0 && (
                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { color: colors.error }]}>
                        Salary Advance Deduction:
                      </Text>
                      <Text style={[styles.calcVal, { color: colors.error }]}>
                        − {formatCurrency(row.advanceDeductions)}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.calcRow, styles.netRow]}>
                    <Text style={styles.netLabel}>Net Payable Salary:</Text>
                    <Text style={styles.netValue}>{formatCurrency(netSalary)}</Text>
                  </View>
                </View>

                {/* Action Button */}
                {!isPaid ? (
                  <Button
                    title={`Mark ${formatCurrency(netSalary)} as Paid`}
                    size="sm"
                    variant="primary"
                    onPress={() => handleMarkAsPaid(row.staffId, row.staffName, netSalary, row.hotelId)}
                    style={styles.payBtn}
                  />
                ) : (
                  <View style={styles.paidBadgeBox}>
                    <Icon name="check" size={14} color="#047857" />
                    <Text style={styles.paidBadgeText}>Salary Disbursed</Text>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  formulaCard: {
    backgroundColor: colors.accentBlueLight,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  formulaTitle: {
    ...typography.captionMedium,
    color: colors.accentBlue,
    fontWeight: '700',
    marginLeft: 6,
  },
  formulaText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  filterBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  chipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  monthTag: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.xs,
  },
  summaryBox: {
    flex: 1,
  },
  sumLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  sumVal: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  payrollCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  staffBlock: {
    flex: 1,
  },
  staffName: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  roleSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attendanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  attItem: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  attBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcBox: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.xs,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calcLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calcVal: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  netLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  netValue: {
    ...typography.subtitle1,
    color: '#047857',
    fontWeight: '800',
  },
  payBtn: {
    marginTop: spacing.sm,
  },
  paidBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  paidBadgeText: {
    ...typography.captionMedium,
    color: '#047857',
    fontWeight: '700',
    marginLeft: 4,
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorBox: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default SalaryManagementScreen;
