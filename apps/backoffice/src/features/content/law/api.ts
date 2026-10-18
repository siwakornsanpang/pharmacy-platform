import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import { mapLawList, type LawRecord } from './mapping';

export const lawLoadError = 'ไม่สามารถโหลดข้อมูลกฎหมายได้';
export const lawSaveError = 'เกิดข้อผิดพลาด';

export function listLaws(category: string, signal?: AbortSignal): Promise<LawRecord[]> {
  return browserApi(`/admin/content/laws?category=${encodeURIComponent(category)}&pageSize=100`, { signal }).then(mapLawList);
}

export function reorderLaws(items: OrderItem[]) {
  return browserApi('/laws/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}

export function saveLaw(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/laws/${id}` : '/laws', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteLaw(id: number) {
  return browserApi(`/laws/${id}`, { method: 'DELETE' });
}

export function uploadLawFile(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('laws', file, signal);
}
