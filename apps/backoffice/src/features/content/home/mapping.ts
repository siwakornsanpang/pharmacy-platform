export type HomeBanner = {
  id: string;
  url: string;
  originalUrl: string;
  title: string;
  clickable: boolean;
  linkUrl: string;
  active: boolean;
  order: number;
};

export type HomePopup = {
  id: string;
  url: string;
  title: string;
  active: boolean;
  order: number;
};

export type HomeRecord = {
  id: number | null;
  revision: number;
  banners: HomeBanner[];
  popups: HomePopup[];
  updatedAt: string | null;
};

function mapBanner(value: unknown): HomeBanner {
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

function mapPopup(value: unknown): HomePopup {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    url: String(row.url ?? ''),
    title: String(row.title ?? ''),
    active: Boolean(row.active),
    order: Number(row.order ?? 0),
  };
}

export function mapHome(value: unknown): HomeRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof row.id === 'number' ? row.id : null,
    revision: Number(row.revision ?? 0),
    banners: Array.isArray(row.banners) ? row.banners.map(mapBanner) : [],
    popups: Array.isArray(row.popups) ? row.popups.map(mapPopup) : [],
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}
