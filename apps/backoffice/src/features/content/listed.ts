export function listed(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return [];
}

export type OrderItem = { id: number; order: number };
