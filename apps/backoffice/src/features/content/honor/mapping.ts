import { listed } from '../listed';

export type HonorRecord = {
  id: number;
  awardId: number;
  order: number;
  prefix: string | null;
  name: string;
  awardName: string | null;
  workName: string | null;
  awardDetail: string | null;
  fullDetail: string | null;
  imageUrl: string | null;
  originalImageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
};

export function mapHonorItem(value: unknown): HonorRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    awardId: Number(row.awardId ?? 0),
    order: Number(row.order ?? 0),
    prefix: typeof row.prefix === 'string' ? row.prefix : null,
    name: String(row.name ?? ''),
    awardName: typeof row.awardName === 'string' ? row.awardName : null,
    workName: typeof row.workName === 'string' ? row.workName : null,
    awardDetail: typeof row.awardDetail === 'string' ? row.awardDetail : null,
    fullDetail: typeof row.fullDetail === 'string' ? row.fullDetail : null,
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
    originalImageUrl: typeof row.originalImageUrl === 'string' ? row.originalImageUrl : null,
    videoUrl: typeof row.videoUrl === 'string' ? row.videoUrl : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapHonorList(data: unknown): HonorRecord[] {
  return listed(data).map(mapHonorItem);
}
