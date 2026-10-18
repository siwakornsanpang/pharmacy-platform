import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import { mapAgencyItem, mapAgencyList, type AgencyRecord } from './mapping';

export const agencyLoadError = 'ไม่สามารถโหลดข้อมูลหน่วยงานได้';
export const agencySaveError = 'เกิดข้อผิดพลาด';

export function listAgencies(signal?: AbortSignal): Promise<AgencyRecord[]> {
  return browserApi('/admin/content/agencies?pageSize=100', { signal }).then(mapAgencyList);
}

export function getAgency(id: number, signal?: AbortSignal): Promise<AgencyRecord> {
  return browserApi(`/admin/content/agencies/${id}`, { signal }).then(mapAgencyItem);
}

export function reorderAgencies(items: OrderItem[]) {
  return browserApi('/agencies/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function saveAgency(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/agencies/${id}` : '/agencies', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteAgency(id: number) {
  return browserApi(`/agencies/${id}`, { method: 'DELETE' });
}

export function uploadAgencyImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('agencies', file, signal);
}
