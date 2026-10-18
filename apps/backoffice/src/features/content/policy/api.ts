import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import type { OrderItem } from '../listed';
import {
  mapPolicyCategory,
  mapPolicyCategoryList,
  mapPolicyProjectList,
  type PolicyCategoryRecord,
  type PolicyProjectRecord,
} from './mapping';

export const policyLoadError = 'ไม่สามารถโหลดข้อมูลนโยบายได้';
export const policySaveError = 'เกิดข้อผิดพลาด';

export function listPolicyCategories(signal?: AbortSignal): Promise<PolicyCategoryRecord[]> {
  return browserApi('/admin/content/policy-categories?pageSize=100', { signal }).then(mapPolicyCategoryList);
}

export function getPolicyCategory(id: number, signal?: AbortSignal): Promise<PolicyCategoryRecord> {
  return browserApi(`/admin/content/policy-categories/${id}`, { signal }).then(mapPolicyCategory);
}

export function savePolicyCategory(payload: { title: string }, id?: number) {
  return browserApi(id ? `/policy-categories/${id}` : '/policy-categories', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function reorderPolicyCategories(items: OrderItem[]) {
  return browserApi('/policy-categories/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function deletePolicyCategory(id: number) {
  return browserApi(`/policy-categories/${id}`, { method: 'DELETE' });
}

export function listPolicyProjects(categoryId: number, signal?: AbortSignal): Promise<PolicyProjectRecord[]> {
  return browserApi(`/admin/content/policy-projects?category=${categoryId}&pageSize=100`, { signal }).then(mapPolicyProjectList);
}

export function reorderPolicyProjects(items: OrderItem[]) {
  return browserApi('/policy-projects/reorder', { method: 'PUT', body: JSON.stringify(items) });
}

export function savePolicyProject(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/policy-projects/${id}` : '/policy-projects', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePolicyProject(id: number) {
  return browserApi(`/policy-projects/${id}`, { method: 'DELETE' });
}

export function uploadPolicyFile(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('policy-projects', file, signal);
}
