import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import { mapHonorItem, mapHonorList, type HonorRecord } from './mapping';

export const honorLoadError = 'ไม่สามารถโหลดข้อมูลผู้ได้รับรางวัลได้';
export const honorSaveError = 'เกิดข้อผิดพลาด';

export function listHonor(awardId: number, signal?: AbortSignal): Promise<HonorRecord[]> {
  return browserApi(`/admin/content/honor?category=${awardId}&pageSize=100`, { signal }).then(mapHonorList);
}

export function getHonor(id: number, signal?: AbortSignal): Promise<HonorRecord> {
  return browserApi(`/admin/content/honor/${id}`, { signal }).then(mapHonorItem);
}

export function reorderHonor(items: OrderItem[]) {
  return browserApi('/honor/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function saveHonor(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/honor/${id}` : '/honor', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteHonor(id: number) {
  return browserApi(`/honor/${id}`, { method: 'DELETE' });
}

export function uploadHonorImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('honor', file, signal);
}
