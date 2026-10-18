'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/app/backoffice/layout/Header';
import Sidebar from '@/app/backoffice/layout/Sidebar';
import { isBackofficeHub } from '@/app/config/menu';
import { useStaff } from './StaffProvider';

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const staff = useStaff();
  const isHub = isBackofficeHub(pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isHub);

  useEffect(() => {
    setIsSidebarOpen(!isHub);
  }, [isHub]);

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(115,115,0,0.16), transparent 55%), linear-gradient(180deg, #f3f1dc 0%, #f7f4ea 180px, #f7f4ea 100%)',
      }}
    >
      <Header
        variant={isHub ? 'hub' : 'module'}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        userName={staff.displayName}
        userRole={staff.role}
      />

      {!isHub && (
        <Sidebar isOpen={isSidebarOpen} userRole={staff.role} userName={staff.displayName} />
      )}

      <main
        className={`
          pt-[72px]
          transition-all duration-300 ease-in-out
          ${!isHub && isSidebarOpen ? 'pl-[240px]' : 'pl-0'}
        `}
      >
        <div className={isHub ? 'p-0' : 'p-6'}>{children}</div>
      </main>
    </div>
  );
}
