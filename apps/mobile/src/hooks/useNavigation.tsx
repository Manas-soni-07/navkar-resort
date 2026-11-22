import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BackHandler } from 'react-native';
import { ScreenName, NavigationParams, NavigationContextType } from '../types/navigation';

interface HistoryItem {
  screen: ScreenName;
  params: NavigationParams;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({
  children,
  initialScreen = 'splash',
  initialParams = {},
}: {
  children: ReactNode;
  initialScreen?: ScreenName;
  initialParams?: NavigationParams;
}) {
  const [history, setHistory] = useState<HistoryItem[]>([
    { screen: initialScreen, params: initialParams },
  ]);

  const currentItem = history[history.length - 1];

  const navigate = (screen: ScreenName, params: NavigationParams = {}) => {
    setHistory((prev) => [...prev, { screen, params }]);
  };

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, prev.length - 1);
    });
  };

  // Android hardware back button support
  useEffect(() => {
    const onBackPress = () => {
      if (history.length > 1) {
        goBack();
        return true; // handled
      }
      return false; // let system handle exit
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backSubscription.remove();
  }, [history.length]);

  return (
    <NavigationContext.Provider
      value={{
        currentScreen: currentItem.screen,
        params: currentItem.params,
        navigate,
        goBack,
        canGoBack: history.length > 1,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
