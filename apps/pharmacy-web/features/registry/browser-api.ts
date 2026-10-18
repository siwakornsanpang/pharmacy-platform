import type { RegistryStats } from '@pharmacy/contracts/registry';
import { browserApi } from '@/lib/api/browser';

export async function getPharmacistTotal(): Promise<number> {
  return (await browserApi<RegistryStats>('/pharmacists/stats', { cache: 'no-store' })).total;
}
