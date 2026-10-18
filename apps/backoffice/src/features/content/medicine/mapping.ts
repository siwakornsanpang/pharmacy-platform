import { listed } from '../listed';

export type MedicineRecord = {
  id: number;
  title: string;
  content: string;
  status: 'published' | 'draft';
  category: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  excerpt?: string;
};

export function mapMedicineItem(value: unknown): MedicineRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    status: (row.status as MedicineRecord['status']) || 'draft',
    category: typeof row.category === 'string' ? row.category : 'medicine',
    thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : undefined,
    publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
  };
}

export function mapMedicineList(data: unknown): MedicineRecord[] {
  return listed(data).map(mapMedicineItem);
}
