import { listed } from '../listed';

export type ProductRecord = {
  id: number;
  name: string;
  imageUrl: string | null;
  category: string;
  description: string | null;
  price: string;
  createdAt: string;
  updatedAt: string;
};

export function mapProductItem(value: unknown): ProductRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
    category: String(row.category ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    price: String(row.price ?? '0'),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
  };
}

export function mapProductList(data: unknown): ProductRecord[] {
  return listed(data).map(mapProductItem);
}
