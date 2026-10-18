export type WebSettingsRecord = {
  id: number | null;
  siteNameTh: string;
  siteNameEn: string;
  slogan: string;
  logoPath: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  googleMapsUrl: string;
  googleMapsEmbed: string;
  facebookUrl: string;
  lineId: string;
  youtubeUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export function mapWebSettings(value: unknown): WebSettingsRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === 'string' ? (row[key] as string) : '');
  return {
    id: typeof row.id === 'number' ? row.id : null,
    siteNameTh: text('siteNameTh') || 'สภาเภสัชกรรม',
    siteNameEn: text('siteNameEn') || 'The Pharmacy Council of Thailand',
    slogan: text('slogan'),
    logoPath: text('logoPath'),
    address: text('address'),
    phone: text('phone'),
    fax: text('fax'),
    email: text('email'),
    googleMapsUrl: text('googleMapsUrl'),
    googleMapsEmbed: text('googleMapsEmbed'),
    facebookUrl: text('facebookUrl'),
    lineId: text('lineId'),
    youtubeUrl: text('youtubeUrl'),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}
