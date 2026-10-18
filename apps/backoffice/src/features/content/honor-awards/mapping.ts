import { listed } from '../listed';

export type HonorAwardRecord = {
  id: number;
  order: number;
  name: string;
  description: string | null;
  recipientCount: number;
};

export function mapHonorAward(value: unknown): HonorAwardRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    order: Number(row.order ?? 0),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    recipientCount: Number(row.recipientCount ?? 0),
  };
}

export function mapHonorAwardList(data: unknown): HonorAwardRecord[] {
  return listed(data).map(mapHonorAward);
}
