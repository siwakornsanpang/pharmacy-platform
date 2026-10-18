import { listed } from '../listed';

export type HistoryRecord = {
  id: number;
  term: string;
  startYear: string;
  endYear: string;
  presidentName: string;
  secretaryName: string;
  presidentImage: string | null;
  originalPresidentImage: string | null;
  secretaryImage: string | null;
  originalSecretaryImage: string | null;
  createdAt: string;
};

export function mapHistoryItem(value: unknown): HistoryRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    term: String(row.term ?? ''),
    startYear: String(row.startYear ?? ''),
    endYear: String(row.endYear ?? ''),
    presidentName: String(row.presidentName ?? ''),
    secretaryName: String(row.secretaryName ?? ''),
    presidentImage: typeof row.presidentImage === 'string' ? row.presidentImage : null,
    originalPresidentImage: typeof row.originalPresidentImage === 'string' ? row.originalPresidentImage : null,
    secretaryImage: typeof row.secretaryImage === 'string' ? row.secretaryImage : null,
    originalSecretaryImage: typeof row.originalSecretaryImage === 'string' ? row.originalSecretaryImage : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapHistoryList(data: unknown): HistoryRecord[] {
  return listed(data).map(mapHistoryItem);
}
