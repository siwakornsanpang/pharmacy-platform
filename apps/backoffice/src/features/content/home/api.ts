import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapHome, type HomeRecord } from './mapping';

export const homeLoadError = 'ไม่สามารถโหลดข้อมูลหน้าแรกได้';
export const homeSaveError = 'ไม่สามารถบันทึกได้ กรุณาลองใหม่';

export function getHomeContent(signal?: AbortSignal): Promise<HomeRecord> {
  return browserApi('/admin/content/home-content', { signal }).then(mapHome);
}

export function saveHomeContent(payload: Record<string, unknown>): Promise<HomeRecord> {
  return browserApi('/home-content', { method: 'POST', body: JSON.stringify(payload) }).then(mapHome);
}

export function uploadHomeImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('home-content', file, signal);
}
