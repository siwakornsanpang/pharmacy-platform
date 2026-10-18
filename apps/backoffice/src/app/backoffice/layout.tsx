import { requireVerifiedStaff } from '@/lib/auth/session';
import { StaffProvider } from '@/features/access/StaffProvider';
import { BackofficeShell } from '@/features/access/BackofficeShell';

export default async function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await requireVerifiedStaff();
  return (
    <StaffProvider identity={identity}>
      <BackofficeShell>{children}</BackofficeShell>
    </StaffProvider>
  );
}
