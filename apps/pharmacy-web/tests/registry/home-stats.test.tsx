import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { browserApi } = vi.hoisted(() => ({ browserApi: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ browserApi }));

import HomeStats from '@/components/public/01_home/HomeStats';
import { getPharmacistTotal } from '@/features/registry/browser-api';

beforeEach(() => {
  browserApi.mockReset();
  browserApi.mockResolvedValue({ total: 123 });
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

it('reads only the Registry stats total through the app-owned no-store browser client', async () => {
  await expect(getPharmacistTotal()).resolves.toBe(123);
  expect(browserApi).toHaveBeenCalledWith('/pharmacists/stats', { cache: 'no-store' });
});

it('keeps HomeStats markup while replacing only the pharmacist count source', async () => {
  render(<HomeStats />);
  await waitFor(() => expect(browserApi).toHaveBeenCalledWith('/pharmacists/stats', { cache: 'no-store' }));
  expect(browserApi).toHaveBeenCalledTimes(1);
  expect(screen.getByText('เภสัชกร')).toBeInTheDocument();
  expect(screen.getByText('ร้านยาคุณภาพ')).toBeInTheDocument();
  expect(screen.getByText(/อัพเดทข้อมูล ณ วันที่/)).toBeInTheDocument();
});
