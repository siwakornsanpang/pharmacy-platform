'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StaffIdentity } from '@pharmacy/contracts/access';
import { browserApi } from '@/lib/api/browser';

export type StaffContextValue = StaffIdentity & {
  refresh(): Promise<void>;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ identity, children }: { identity: StaffIdentity; children: ReactNode }) {
  const [staff, setStaff] = useState(identity);
  const value = useMemo<StaffContextValue>(() => ({
    ...staff,
    async refresh() {
      setStaff(await browserApi<StaffIdentity>('/auth/me'));
    },
  }), [staff]);
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffIdentity {
  const value = useContext(StaffContext);
  if (!value) throw new Error('Staff session is required');
  return value;
}

export function useStaffSession(): StaffContextValue {
  const value = useContext(StaffContext);
  if (!value) throw new Error('Staff session is required');
  return value;
}
