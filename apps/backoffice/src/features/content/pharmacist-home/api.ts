import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapPharmacistHome, type PharmacistHomeRecord } from './mapping';

export const pharmacistHomeLoadError = 'ไม่สามารถโหลดข้อมูลหน้าแรกเภสัชกรได้';
export const pharmacistHomeSaveError = 'ไม่สามารถบันทึกได้ กรุณาลองใหม่';

export function getPharmacistHomeContent(signal?: AbortSignal): Promise<PharmacistHomeRecord> {
  return browserApi('/admin/content/pharmacist-home-content', { signal }).then(mapPharmacistHome);
}

export function savePharmacistHomeContent(payload: Record<string, unknown>): Promise<PharmacistHomeRecord> {
  return browserApi('/pharmacist-home-content', { method: 'POST', body: JSON.stringify(payload) }).then(mapPharmacistHome);
}

export function uploadPharmacistHomeImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('pharmacist-home-content', file, signal);
}
