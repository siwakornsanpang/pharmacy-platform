import { listed } from '../listed';

export type OtherServiceCategoryRecord = {
  id: number;
  name: string;
  order: number;
  itemCount: number;
  createdAt: string;
};

export type OtherServiceItemRecord = {
  id: number;
  categoryId: number;
  name: string;
  status: string;
  pdfUrl: string | null;
  order: number;
  createdAt: string;
};

export function mapOtherServiceCategory(value: unknown): OtherServiceCategoryRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    order: Number(row.order ?? 0),
    itemCount: Number(row.itemCount ?? 0),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapOtherServiceItem(value: unknown): OtherServiceItemRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    categoryId: Number(row.categoryId ?? 0),
    name: String(row.name ?? ''),
    status: String(row.status ?? 'offline'),
    pdfUrl: typeof row.pdfUrl === 'string' ? row.pdfUrl : null,
    order: Number(row.order ?? 0),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapOtherServiceCategoryList(data: unknown): OtherServiceCategoryRecord[] {
  return listed(data).map(mapOtherServiceCategory);
}

export function mapOtherServiceItemList(data: unknown): OtherServiceItemRecord[] {
  return listed(data).map(mapOtherServiceItem);
}
