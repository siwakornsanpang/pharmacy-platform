import { browserApi } from '@/lib/api/browser';
import { mapPharmacist, mapPharmacistPage, type RegisterPharmacist } from './mapping';

export function listPharmacists(query: URLSearchParams, signal?: AbortSignal): Promise<{ items: RegisterPharmacist[]; total: number; query: string }> {
  const params = new URLSearchParams(query);
  if (!params.has('pageSize')) params.set('pageSize', '100');
  const encoded = params.toString();
  return browserApi(`/admin/registry/pharmacists${encoded ? `?${encoded}` : ''}`, { signal }).then((data) => ({
    ...mapPharmacistPage(data),
    query: encoded,
  }));
}

export function getPharmacist(id: string, signal?: AbortSignal): Promise<RegisterPharmacist> {
  return browserApi(`/admin/registry/pharmacists/${id}`, { signal }).then(mapPharmacist);
}
