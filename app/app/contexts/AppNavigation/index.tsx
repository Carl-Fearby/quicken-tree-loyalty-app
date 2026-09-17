'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type AppView = 'home' | 'book' | 'details' | 'checkout' | 'bookings' | 'menu' | 'cart' | 'rewards' | 'profile';
type BookingsOrigin = 'home' | 'profile';
type NavigationContextValue = {
  navigate: (view: AppView, preserveOrderAhead?: boolean) => void;
  openBookings: (origin: BookingsOrigin) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function AppNavigationProvider({ value, children }: { value: NavigationContextValue; children: ReactNode }) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useAppNavigation must be used inside AppNavigationProvider');
  return context;
}
