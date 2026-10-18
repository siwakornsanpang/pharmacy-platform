import { listed } from '../listed';

export type AgencyRecord = {
  id: number;
  order: number;
  name: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  originalThumbnailUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  url: string;
  category: string;
  createdAt: string;
};

export function mapAgencyItem(value: unknown): AgencyRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    order: Number(row.order ?? 0),
    name: String(row.name ?? ''),
    title: typeof row.title === 'string' ? row.title : null,
    description: typeof row.description === 'string' ? row.description : null,
    thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : null,
    originalThumbnailUrl: typeof row.originalThumbnailUrl === 'string' ? row.originalThumbnailUrl : null,
    logoUrl: typeof row.logoUrl === 'string' ? row.logoUrl : null,
    iconUrl: typeof row.iconUrl === 'string' ? row.iconUrl : null,
    url: String(row.url ?? ''),
    category: String(row.category ?? ''),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapAgencyList(data: unknown): AgencyRecord[] {
  return listed(data).map(mapAgencyItem);
}
