export type PharmacistHomeBanner = {
  id: string;
  url: string;
  originalUrl: string;
  title: string;
  clickable: boolean;
  linkUrl: string;
  active: boolean;
  order: number;
};

export type PharmacistHomeRecord = {
  id: number | null;
  revision: number;
  banners: PharmacistHomeBanner[];
  updatedAt: string | null;
};

function mapBanner(value: unknown): PharmacistHomeBanner {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    url: String(row.url ?? ''),
    originalUrl: typeof row.originalUrl === 'string' ? row.originalUrl : String(row.url ?? ''),
    title: String(row.title ?? ''),
    clickable: Boolean(row.clickable),
    linkUrl: String(row.linkUrl ?? ''),
    active: Boolean(row.active),
    order: Number(row.order ?? 0),
  };
}

export function mapPharmacistHome(value: unknown): PharmacistHomeRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof row.id === 'number' ? row.id : null,
    revision: Number(row.revision ?? 0),
    banners: Array.isArray(row.banners) ? row.banners.map(mapBanner) : [],
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}
