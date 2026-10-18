import { listed } from '../listed';

export type ServiceRecord = {
  id: number;
  name: string;
  shortName: string | null;
  iconUrl: string | null;
  order: number;
  description: string | null;
  linkUrl: string | null;
  isPopular: boolean;
  popularOrder: number;
  createdAt: string;
};

export function mapServiceItem(value: unknown): ServiceRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    shortName: typeof row.shortName === 'string' ? row.shortName : null,
    iconUrl: typeof row.iconUrl === 'string' ? row.iconUrl : null,
    order: Number(row.order ?? 0),
    description: typeof row.description === 'string' ? row.description : null,
    linkUrl: typeof row.linkUrl === 'string' ? row.linkUrl : null,
    isPopular: Boolean(row.isPopular),
    popularOrder: Number(row.popularOrder ?? 0),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapServiceList(data: unknown): ServiceRecord[] {
  return listed(data).map(mapServiceItem);
}
