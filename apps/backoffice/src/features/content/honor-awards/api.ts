import { browserApi } from '@/lib/api/browser';
import type { OrderItem } from '../listed';
import { mapHonorAward, mapHonorAwardList, type HonorAwardRecord } from './mapping';

export const honorAwardLoadError = 'ไม่สามารถโหลดข้อมูลรางวัลได้';
export const honorAwardSaveError = 'เกิดข้อผิดพลาด';

export function listHonorAwards(signal?: AbortSignal): Promise<HonorAwardRecord[]> {
  return browserApi('/admin/content/honor-awards?pageSize=100', { signal }).then(mapHonorAwardList);
}

export function getHonorAward(id: number, signal?: AbortSignal): Promise<HonorAwardRecord> {
  return browserApi(`/admin/content/honor-awards/${id}`, { signal }).then(mapHonorAward);
}

export function saveHonorAward(payload: { name: string; description?: string | null }, id?: number) {
  return browserApi(id ? `/honor-awards/${id}` : '/honor-awards', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function reorderHonorAwards(items: OrderItem[]) {
  return browserApi('/honor-awards/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function deleteHonorAward(id: number) {
  return browserApi(`/honor-awards/${id}`, { method: 'DELETE' });
}
