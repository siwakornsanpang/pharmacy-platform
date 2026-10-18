import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import { mapServiceItem, mapServiceList, type ServiceRecord } from './mapping';

export const serviceLoadError = 'ไม่สามารถโหลดข้อมูลบริการได้';
export const serviceSaveError = 'เกิดข้อผิดพลาด';

export function listServices(signal?: AbortSignal): Promise<ServiceRecord[]> {
  return browserApi('/admin/content/services?pageSize=100', { signal }).then(mapServiceList);
}

export function getService(id: number, signal?: AbortSignal): Promise<ServiceRecord> {
  return browserApi(`/admin/content/services/${id}`, { signal }).then(mapServiceItem);
}

export function reorderServices(items: OrderItem[]) {
  return browserApi('/services/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function saveService(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/services/${id}` : '/services', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteService(id: number) {
  return browserApi(`/services/${id}`, { method: 'DELETE' });
}

export function uploadServiceImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('services', file, signal);
}
