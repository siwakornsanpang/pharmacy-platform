import { listed } from '../listed';

export type LawRecord = {
  id: number;
  category: string;
  title: string;
  year: number | null;
  announcedAt: string;
  order: number;
  pdfUrl: string;
  status: string;
  createdAt: string;
};

export function mapLawItem(value: unknown): LawRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    category: String(row.category ?? ''),
    title: String(row.title ?? ''),
    year: typeof row.year === 'number' ? row.year : null,
    announcedAt: typeof row.announcedAt === 'string' ? row.announcedAt : '',
    order: Number(row.order ?? 0),
    pdfUrl: typeof row.pdfUrl === 'string' ? row.pdfUrl : '',
    status: typeof row.status === 'string' ? row.status : 'offline',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapLawList(data: unknown): LawRecord[] {
  return listed(data).map(mapLawItem);
}
