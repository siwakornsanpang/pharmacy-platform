import { listed } from '../listed';

export type PublicProjectRecord = {
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

export function mapPublicProjectItem(value: unknown): PublicProjectRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    status: (row.status as PublicProjectRecord['status']) || 'draft',
    category: typeof row.category === 'string' ? row.category : 'public_project',
    thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : undefined,
    publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
  };
}

export function mapPublicProjectList(data: unknown): PublicProjectRecord[] {
  return listed(data).map(mapPublicProjectItem);
}
