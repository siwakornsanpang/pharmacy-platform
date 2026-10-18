import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import { mapCouncilItem, mapCouncilList, type CouncilRecord } from './mapping';

export const councilLoadError = 'ไม่สามารถโหลดข้อมูลกรรมการได้';
export const councilSaveError = 'เกิดข้อผิดพลาด';

export function listCouncil(signal?: AbortSignal): Promise<CouncilRecord[]> {
  return browserApi('/admin/content/council?pageSize=100', { signal }).then(mapCouncilList);
}

export function getCouncil(id: number, signal?: AbortSignal): Promise<CouncilRecord> {
  return browserApi(`/admin/content/council/${id}`, { signal }).then(mapCouncilItem);
}

export function reorderCouncil(items: OrderItem[]) {
  return browserApi('/council/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function saveCouncil(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/council/${id}` : '/council', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteCouncil(id: number) {
  return browserApi(`/council/${id}`, { method: 'DELETE' });
}

export function uploadCouncilImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('council', file, signal);
}
