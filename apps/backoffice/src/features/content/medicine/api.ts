import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapMedicineItem, mapMedicineList, type MedicineRecord } from './mapping';

export const medicineLoadError = 'ไม่สามารถโหลดข้อมูลความรู้เรื่องยาได้';
export const medicineSaveError = 'Failed to save';

export function listMedicine(signal?: AbortSignal): Promise<MedicineRecord[]> {
  return browserApi('/admin/content/medicine?pageSize=100', { signal }).then(mapMedicineList);
}

export function getMedicine(id: number, signal?: AbortSignal): Promise<MedicineRecord> {
  return browserApi(`/admin/content/medicine/${id}`, { signal }).then(mapMedicineItem);
}

export function saveMedicine(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/medicine/${id}` : '/medicine', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteMedicine(id: number) {
  return browserApi(`/medicine/${id}`, { method: 'DELETE' });
}

export async function uploadMedicineImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('medicine', file, signal);
}
