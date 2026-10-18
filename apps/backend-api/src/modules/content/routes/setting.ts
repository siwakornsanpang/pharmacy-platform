import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { WebSettingsAdminDetailSchema, type WebSettingsAdminDetail } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { jsonTimestamp } from './read-query';
import { registerJsonRecordWrites, webSettingsWrite } from './record-writes';

function detail(row: Record<string, unknown> | undefined): WebSettingsAdminDetail {
  if (!row) return { id: null, siteNameTh: 'สภาเภสัชกรรม', siteNameEn: 'The Pharmacy Council of Thailand', slogan: '', logoPath: '', address: '', phone: '', fax: '', email: '', googleMapsUrl: '', googleMapsEmbed: '', facebookUrl: '', lineId: '', youtubeUrl: '', createdAt: null, updatedAt: null };
  return { id: row.id as number, siteNameTh: row.site_name_th as string, siteNameEn: row.site_name_en as string,
    slogan: row.slogan as string | null, logoPath: row.logo_path as string | null, address: row.address as string | null,
    phone: row.phone as string | null, fax: row.fax as string | null, email: row.email as string | null,
    googleMapsUrl: row.google_maps_url as string | null, googleMapsEmbed: row.google_maps_embed as string | null,
    facebookUrl: row.facebook_url as string | null, lineId: row.line_id as string | null, youtubeUrl: row.youtube_url as string | null,
    createdAt: jsonTimestamp(row.created_at), updatedAt: jsonTimestamp(row.updated_at) };
}
export function registerSettingRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_WEB_SETTINGS);
  app.get('/api/admin/content/web-settings', { onRequest: guard, schema: { response: { 200: WebSettingsAdminDetailSchema } } }, async request => {
    parseContentQuery('web-settings', request.query);
    const row = (await db.query(`SELECT id, site_name_th, site_name_en, slogan, logo_path, address, phone, fax, email, google_maps_url, google_maps_embed, facebook_url, line_id, youtube_url, created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at FROM web_settings ORDER BY id ASC LIMIT 1`)).rows[0];
    return detail(row);
  });
  registerJsonRecordWrites(app, deps, webSettingsWrite);
}
