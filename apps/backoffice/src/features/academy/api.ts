import { browserApi } from '@/lib/api/browser';
import type { AcademyCommandResult } from '@pharmacy/contracts/academy';
import type { StagedAsset, UploadIntent } from '@pharmacy/contracts/media';
import { uploadWithIntent } from '@/shared/media/upload';
import { asList, pageRows, type AcademyAdminCourse, type AcademyEnrollment, type AcademyOrder, type AcademyRefund } from './mapping';

const commandKeys = new Map<string, string>();

export function academyCommandKey(scope: string, fingerprint: string) {
  const id = `${scope}:${fingerprint}`;
  const existing = commandKeys.get(id);
  if (existing) return existing;
  const key = crypto.randomUUID();
  commandKeys.set(id, key);
  return key;
}

export function resetAcademyCommandKeys() {
  commandKeys.clear();
}

export function listAdminCourses(signal?: AbortSignal) {
  return browserApi<AcademyAdminCourse[]>('/academy/admin/courses', { signal, cache: 'no-store' });
}

export function getAdminCourse(id: string, signal?: AbortSignal) {
  return browserApi(`/academy/admin/courses/${id}`, { signal, cache: 'no-store' });
}

export function saveAdminCourse(payload: Record<string, unknown>, id?: string) {
  return browserApi(id ? `/academy/admin/courses/${id}` : '/academy/admin/courses', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCourse(id: number) {
  return browserApi(`/academy/admin/courses/${id}`, { method: 'DELETE' });
}

export function listCategories(signal?: AbortSignal) {
  return browserApi('/academy/admin/categories', { signal, cache: 'no-store' });
}

export function saveCategory(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/academy/admin/categories/${id}` : '/academy/admin/categories', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteCategory(id: number) {
  return browserApi(`/academy/admin/categories/${id}`, { method: 'DELETE' });
}

export function listInstructors(signal?: AbortSignal) {
  return browserApi('/academy/admin/instructors', { signal, cache: 'no-store' });
}

export function saveInstructor(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/academy/admin/instructors/${id}` : '/academy/admin/instructors', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteInstructor(id: number) {
  return browserApi(`/academy/admin/instructors/${id}`, { method: 'DELETE' });
}

export function listReviews(signal?: AbortSignal) {
  return browserApi('/academy/admin/reviews', { signal, cache: 'no-store' });
}

export function saveReview(payload: Record<string, unknown>) {
  return browserApi('/academy/admin/reviews', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteReview(id: number) {
  return browserApi(`/academy/admin/reviews/${id}`, { method: 'DELETE' });
}

export async function listOrders(input: { page: number; pageSize: number; q: string; status: string }, signal?: AbortSignal) {
  const rows = asList<AcademyOrder>(await browserApi('/academy/admin/orders', { signal, cache: 'no-store' }));
  const q = input.q.trim().toLowerCase();
  return pageRows(rows, input.page, input.pageSize, (item) => {
    if (input.status && item.status !== input.status) return false;
    if (!q) return true;
    return [item.courseTitle, item.displayName, item.pharmacistLicense].some((value) => String(value || '').toLowerCase().includes(q));
  });
}

export async function listEnrollments(input: { page: number; pageSize: number; q: string; status: string }, signal?: AbortSignal) {
  const rows = asList<AcademyEnrollment>(await browserApi('/academy/admin/enrollments', { signal, cache: 'no-store' }));
  const q = input.q.trim().toLowerCase();
  return pageRows(rows, input.page, input.pageSize, (item) => {
    if (input.status && item.status !== input.status) return false;
    if (!q) return true;
    return [item.courseTitle, item.displayName, item.pharmacistLicense].some((value) => String(value || '').toLowerCase().includes(q));
  });
}

export function listRefunds(signal?: AbortSignal) {
  return browserApi<AcademyRefund[]>('/academy/admin/refunds', { signal, cache: 'no-store' }).then(asList<AcademyRefund>);
}

export function listCpe(signal?: AbortSignal) {
  return browserApi('/academy/admin/cpe', { signal, cache: 'no-store' });
}

export function reviewOrder(id: number, action: 'approve' | 'reject', key = academyCommandKey(action, `order:${id}`)) {
  return browserApi<AcademyCommandResult>(`/academy/admin/orders/${id}/${action}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: '{}',
  });
}

export function reviewRefund(id: number, action: 'approve' | 'reject', key = academyCommandKey(action, `refund:${id}`)) {
  return browserApi<AcademyCommandResult>(`/academy/admin/refunds/${id}/${action}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: '{}',
  });
}

async function uploadAcademyFile(path: string, file: File, signal?: AbortSignal): Promise<StagedAsset> {
  const intent = await browserApi<UploadIntent>(path, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name || 'file.bin',
      declaredMime: file.type || 'application/octet-stream',
      size: file.size,
    }),
    signal,
  });
  return uploadWithIntent(intent, file, signal);
}

export function uploadAcademyCover(file: File, signal?: AbortSignal) {
  return uploadAcademyFile('/academy/admin/upload-cover', file, signal);
}

export function uploadAcademyDocument(file: File, signal?: AbortSignal) {
  return uploadAcademyFile('/academy/admin/upload-document', file, signal);
}
