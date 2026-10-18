import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import {
  mapOtherServiceCategoryList,
  mapOtherServiceItemList,
  type OtherServiceCategoryRecord,
  type OtherServiceItemRecord,
} from './mapping';

export const otherServiceLoadError = 'ไม่สามารถโหลดข้อมูลบริการอื่นได้';
export const otherServiceSaveError = 'เกิดข้อผิดพลาด';

export function listOtherServiceCategories(signal?: AbortSignal): Promise<OtherServiceCategoryRecord[]> {
  return browserApi('/admin/content/other-service-categories?pageSize=100', { signal }).then(mapOtherServiceCategoryList);
}

export function saveOtherServiceCategory(name: string, id?: number) {
  return browserApi(id ? `/other-service-categories/${id}` : '/other-service-categories', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify({ name }),
  }) as Promise<{ success: true; category?: { id: number } }>;
}

export function reorderOtherServiceCategories(items: OrderItem[]) {
  return browserApi('/other-service-categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}

export function deleteOtherServiceCategory(id: number) {
  return browserApi(`/other-service-categories/${id}`, { method: 'DELETE' });
}

export function listOtherServiceItems(categoryId: number, signal?: AbortSignal): Promise<OtherServiceItemRecord[]> {
  return browserApi(`/admin/content/other-service-items?category=${categoryId}&pageSize=100`, { signal }).then(mapOtherServiceItemList);
}

export function reorderOtherServiceItems(items: OrderItem[]) {
  return browserApi('/other-service-items/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}

export function saveOtherServiceItem(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/other-service-items/${id}` : '/other-service-items', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteOtherServiceItem(id: number) {
  return browserApi(`/other-service-items/${id}`, { method: 'DELETE' });
}

export function uploadOtherServiceFile(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('other-service-items', file, signal);
}
