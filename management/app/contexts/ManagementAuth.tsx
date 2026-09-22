'use client';

import { createContext, useContext } from 'react';

export type ManagementUser = {
  displayName: string;
  role: 'admin' | 'staff';
  configurationAccess: boolean;
  bookingAccess: 'none' | 'read' | 'write';
  permissions: Record<string, string>;
};

const ManagementAuthContext = createContext<ManagementUser | null>(null);

export function ManagementAuthProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ManagementUser;
}) {
  return <ManagementAuthContext.Provider value={user}>{children}</ManagementAuthContext.Provider>;
}

export function useManagementUser() {
  const user = useContext(ManagementAuthContext);
  if (!user) throw Error('Management user context is unavailable.');
  return user;
}
