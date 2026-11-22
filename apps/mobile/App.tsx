import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationProvider } from './src/hooks/useNavigation';
import { HotelProvider } from './src/context/HotelContext';
import { MainAppNavigator } from './src/app/index';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <HotelProvider initialHotelId="h-villa">
      <NavigationProvider initialScreen="splash">
        <View style={styles.container}>
          <MainAppNavigator />
          <StatusBar style="dark" />
        </View>
      </NavigationProvider>
    </HotelProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
