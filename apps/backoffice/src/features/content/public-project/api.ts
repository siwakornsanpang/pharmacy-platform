import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapPublicProjectItem, mapPublicProjectList, type PublicProjectRecord } from './mapping';

export const publicProjectLoadError = 'ไม่สามารถโหลดข้อมูลโครงการของประชาชนได้';
export const publicProjectSaveError = 'Failed to save';

export function listPublicProjects(signal?: AbortSignal): Promise<PublicProjectRecord[]> {
  return browserApi('/admin/content/public-project?pageSize=100', { signal }).then(mapPublicProjectList);
}

export function getPublicProject(id: number, signal?: AbortSignal): Promise<PublicProjectRecord> {
  return browserApi(`/admin/content/public-project/${id}`, { signal }).then(mapPublicProjectItem);
}

export function savePublicProject(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/public-project/${id}` : '/public-project', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePublicProject(id: number) {
  return browserApi(`/public-project/${id}`, { method: 'DELETE' });
}

export async function uploadPublicProjectImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('public-project', file, signal);
}
