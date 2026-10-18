export type NewsRecord = {
  id: number;
  title: string;
  content: string;
  category: 'news' | 'recruitment' | 'procurement';
  status: 'published' | 'draft';
  isHighlight: boolean;
  thumbnailUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  excerpt?: string;
};

function listed(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return [];
}

export function mapNewsItem(value: unknown): NewsRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    category: (row.category as NewsRecord['category']) || 'news',
    status: (row.status as NewsRecord['status']) || 'draft',
    isHighlight: Boolean(row.isHighlight),
    thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : undefined,
    publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
  };
}

export function mapNewsList(data: unknown): NewsRecord[] {
  return listed(data).map(mapNewsItem);
}
