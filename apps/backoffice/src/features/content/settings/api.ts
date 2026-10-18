import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapWebSettings, type WebSettingsRecord } from './mapping';

export const settingsLoadError = 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้';
export const settingsSaveError = 'Failed to save';

export function getWebSettings(signal?: AbortSignal): Promise<WebSettingsRecord> {
  return browserApi('/admin/content/web-settings', { signal }).then(mapWebSettings);
}

export function saveWebSettings(payload: Record<string, unknown>) {
  return browserApi('/web-settings', { method: 'POST', body: JSON.stringify(payload) });
}

export function uploadSettingsImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('web-settings', file, signal);
}
