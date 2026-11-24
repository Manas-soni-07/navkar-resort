import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { SplashScreen } from './SplashScreen';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { LoginScreen } from './LoginScreen';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { ManagerDashboardScreen } from './ManagerDashboardScreen';
import { HotelsManagementScreen } from './HotelsManagementScreen';
import { ManagersManagementScreen } from './ManagersManagementScreen';
import { StaffManagementScreen } from './StaffManagementScreen';
import { SalaryManagementScreen } from './SalaryManagementScreen';
import { SalaryAdvancesScreen } from './SalaryAdvancesScreen';
import { SettingsScreen } from './SettingsScreen';
import { AttendanceScreen } from './AttendanceScreen';
import { AdvanceBookingScreen } from './AdvanceBookingScreen';
import { CheckInRoomsScreen } from './CheckInRoomsScreen';
import { BillingFoliosScreen } from './BillingFoliosScreen';
import { DailyExpensesScreen } from './DailyExpensesScreen';
import { DailySummaryScreen } from './DailySummaryScreen';
import { CloudSyncScreen } from './CloudSyncScreen';
import { colors } from '../theme/colors';

const PUBLIC_SCREENS = new Set(['splash', 'role-selection', 'login']);
// Salary (advances + payroll) and the daily summary are admin-only (client decision 24 Nov 2026).
const ADMIN_ONLY_SCREENS = new Set([
  'admin-dashboard',
  'hotels',
  'managers',
  'cloud-sync',
  'salary-advances',
  'salaries',
  'daily-summary',
]);

export const MainAppNavigator: React.FC = () => {
  const { currentScreen } = useNavigation();
  const { currentUser } = useHotel();

  const renderScreen = () => {
    // Screen guard (the API enforces the same rules server-side).
    if (!PUBLIC_SCREENS.has(currentScreen)) {
      if (!currentUser) return <LoginScreen />;
      if (currentUser.role !== 'ADMIN' && ADMIN_ONLY_SCREENS.has(currentScreen)) {
        return <ManagerDashboardScreen />;
      }
    }

    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'role-selection':
        return <RoleSelectionScreen />;
      case 'login':
        return <LoginScreen />;
      case 'admin-dashboard':
        return <AdminDashboardScreen />;
      case 'manager-dashboard':
        return <ManagerDashboardScreen />;
      case 'hotels':
        return <HotelsManagementScreen />;
      case 'managers':
        return <ManagersManagementScreen />;
      case 'rooms':
        return <CheckInRoomsScreen />;
      case 'staff':
        return <StaffManagementScreen />;
      case 'salaries':
        return <SalaryManagementScreen />;
      case 'salary-advances':
        return <SalaryAdvancesScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'attendance':
        return <AttendanceScreen />;
      case 'advance-booking':
        return <AdvanceBookingScreen />;
      case 'checkin-rooms':
        return <CheckInRoomsScreen />;
      case 'billing':
        return <BillingFoliosScreen />;
      case 'daily-expenses':
        return <DailyExpensesScreen />;
      case 'daily-summary':
        return <DailySummaryScreen />;
      case 'cloud-sync':
        return <CloudSyncScreen />;
      default:
        return <SplashScreen />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default MainAppNavigator;
