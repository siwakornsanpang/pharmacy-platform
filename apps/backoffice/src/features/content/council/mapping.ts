import { listed } from '../listed';

export type CouncilRecord = {
  id: number;
  prefix: string | null;
  name: string;
  position: string;
  type: 'elected' | 'appointed';
  imageUrl: string | null;
  originalImageUrl: string | null;
  order: number;
  background?: string;
};

export function mapCouncilItem(value: unknown): CouncilRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  const type = row.type === 'appointed' ? 'appointed' : 'elected';
  return {
    id: Number(row.id),
    prefix: typeof row.prefix === 'string' ? row.prefix : null,
    name: String(row.name ?? ''),
    position: String(row.position ?? ''),
    type,
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
    originalImageUrl: typeof row.originalImageUrl === 'string' ? row.originalImageUrl : null,
    order: Number(row.order ?? 0),
    background: typeof row.background === 'string' ? row.background : undefined,
  };
}

export function mapCouncilList(data: unknown): CouncilRecord[] {
  return listed(data).map(mapCouncilItem);
}
