import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapNewsItem, mapNewsList, type NewsRecord } from './mapping';

export const newsLoadError = 'ไม่สามารถโหลดข้อมูลข่าวได้';
export const newsSaveError = 'Failed to save';

export function listNews(signal?: AbortSignal): Promise<NewsRecord[]> {
  return browserApi('/admin/content/news?pageSize=100', { signal }).then(mapNewsList);
}

export function getNews(id: number, signal?: AbortSignal): Promise<NewsRecord> {
  return browserApi(`/admin/content/news/${id}`, { signal }).then(mapNewsItem);
}

export function saveNews(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/news/${id}` : '/news', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteNews(id: number) {
  return browserApi(`/news/${id}`, { method: 'DELETE' });
}

export async function uploadNewsImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('news', file, signal);
}
