export type RegisterPharmacist = {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  province: string;
  status: string;
  idCardNumber?: string;
  idCardAddress?: string;
  contactAddress?: string;
  workplace?: string;
  address?: string;
  expiryDate?: string;
  imageUrl?: string;
  requestNumber?: string;
  startDate?: string;
  endDate?: string;
};

function listed(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  return [];
}

export function mapPharmacist(value: unknown): RegisterPharmacist {
  const p = (value ?? {}) as Record<string, unknown>;
  const name = String(p.name ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`);
  const cleanName = name.replace('ภก.', '').replace('ภญ.', '').trim();
  const parts = cleanName.split(' ');
  return {
    id: String(p.id ?? ''),
    title: typeof p.title === 'string' ? p.title : '',
    firstName: typeof p.firstName === 'string' ? p.firstName : (parts[0] || ''),
    lastName: typeof p.lastName === 'string' ? p.lastName : parts.slice(1).join(' '),
    licenseNumber: String(p.licenseNumber ?? p.registrationId ?? ''),
    province: String(p.province ?? ''),
    status: String(p.status ?? ''),
    idCardNumber: typeof p.idCardNumber === 'string' ? p.idCardNumber : '',
    idCardAddress: typeof p.idCardAddress === 'string' ? p.idCardAddress : '',
    contactAddress: typeof p.contactAddress === 'string' ? p.contactAddress : '',
    workplace: typeof p.workplace === 'string' ? p.workplace : '',
    address: typeof p.address === 'string' ? p.address : '',
    expiryDate: typeof p.expiryDate === 'string' ? p.expiryDate : '',
    imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : '',
    requestNumber: typeof p.requestNumber === 'string' ? p.requestNumber : '-',
    startDate: typeof p.startDate === 'string' ? p.startDate : '-',
    endDate: typeof p.expiryDate === 'string' ? p.expiryDate : (typeof p.endDate === 'string' ? p.endDate : '-'),
  };
}

export function mapPharmacistPage(data: unknown): { items: RegisterPharmacist[]; total: number } {
  const items = listed(data).map(mapPharmacist);
  const total = data && typeof data === 'object' && typeof (data as { total?: unknown }).total === 'number'
    ? (data as { total: number }).total
    : items.length;
  return { items, total };
}
