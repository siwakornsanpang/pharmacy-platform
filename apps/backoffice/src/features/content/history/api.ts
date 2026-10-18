import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapHistoryItem, mapHistoryList, type HistoryRecord } from './mapping';

export const historyLoadError = 'ไม่สามารถโหลดข้อมูลประวัติได้';
export const historySaveError = 'เกิดข้อผิดพลาด';

export function listHistory(signal?: AbortSignal): Promise<HistoryRecord[]> {
  return browserApi('/admin/content/history?pageSize=100', { signal }).then(mapHistoryList);
}

export function getHistory(id: number, signal?: AbortSignal): Promise<HistoryRecord> {
  return browserApi(`/admin/content/history/${id}`, { signal }).then(mapHistoryItem);
}

export function saveHistory(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/history/${id}` : '/history', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteHistory(id: number) {
  return browserApi(`/history/${id}`, { method: 'DELETE' });
}

export function uploadHistoryImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('history', file, signal);
}
