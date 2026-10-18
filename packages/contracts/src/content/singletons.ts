import type { GoogleMapsEmbedUrl } from './html.js';
import { contentObject as object, contentNullable as nullable, contentId as id, contentInteger as integer, contentText as text, contentTimestamp as timestamp, contentBoolean as bool, type ContentTimestamp, type ContentJsonSchema } from './common.js';
/** Legacy JSON entry identity; unrelated to the UUID identity of a Media asset. */
export interface ContentBannerPublic { id: string; url: string; title: string; clickable: boolean; linkUrl: string; active: boolean; order: number }
export interface ContentBannerAdmin extends ContentBannerPublic { originalUrl: string }
export interface ContentPopup { id: string; url: string; title: string; active: boolean; order: number }
export interface HomeContentPublic { banners: ContentBannerPublic[] | null; popups: ContentPopup[] | null }
export interface HomeContentAdminSummary { id: number | null; revision: number; updatedAt: ContentTimestamp | null }
export interface HomeContentAdminDetail { id: number | null; revision: number; banners: ContentBannerAdmin[] | null; popups: ContentPopup[] | null; updatedAt: ContentTimestamp | null }
export interface PharmacistHomeContentPublic { banners: ContentBannerPublic[] | null }
export interface PharmacistHomeContentAdminSummary { id: number | null; revision: number; updatedAt: ContentTimestamp | null }
export interface PharmacistHomeContentAdminDetail { id: number | null; revision: number; banners: ContentBannerAdmin[] | null; updatedAt: ContentTimestamp | null }
export interface WebSettingsPublic { googleMapsEmbedUrl: GoogleMapsEmbedUrl | null; siteNameTh: string; siteNameEn: string; slogan: string | null; logoPath: string | null; address: string | null; phone: string | null; fax: string | null; email: string | null; googleMapsUrl: string | null; facebookUrl: string | null; lineId: string | null; youtubeUrl: string | null }
export interface WebSettingsAdminSummary extends Omit<WebSettingsPublic, 'googleMapsEmbedUrl'> { id: number | null; createdAt: ContentTimestamp | null; updatedAt: ContentTimestamp | null }
export interface WebSettingsAdminDetail extends WebSettingsAdminSummary { googleMapsEmbed: string | null }

const banner = { id: text, url: text, title: text, clickable: bool, linkUrl: text, active: bool, order: integer };
export const ContentBannerPublicSchema = object(banner);
export const ContentBannerAdminSchema = object({ ...banner, originalUrl: text });
export const ContentPopupSchema = object({ id: text, url: text, title: text, active: bool, order: integer });
const publicBanners = nullable({ type: 'array', items: ContentBannerPublicSchema });
const adminBanners = nullable({ type: 'array', items: ContentBannerAdminSchema });
const popups = nullable({ type: 'array', items: ContentPopupSchema });
const singleton = { id: nullable(id), revision: { type: 'integer', minimum: 0, maximum: 2147483647 }, updatedAt: nullable(timestamp) };
// Revision 0 belongs only to a virtual absent row; existing records start at 1.
const revisionIdentity = (empty: Record<string, ContentJsonSchema>) => [
  { properties: { id: { type: 'null' }, revision: { const: 0 }, updatedAt: { type: 'null' }, ...empty } },
  { properties: { id, revision: { type: 'integer', minimum: 1 } } },
];
const emptyArray = { type: 'array', maxItems: 0 };
export const HomeContentPublicSchema = object({ banners: publicBanners, popups });
export const HomeContentAdminSummarySchema = { ...object(singleton), anyOf: revisionIdentity({}) };
export const HomeContentAdminDetailSchema = { ...object({ ...singleton, banners: adminBanners, popups }), anyOf: revisionIdentity({ banners: emptyArray, popups: emptyArray }) };
export const PharmacistHomeContentPublicSchema = object({ banners: publicBanners });
export const PharmacistHomeContentAdminSummarySchema = { ...object(singleton), anyOf: revisionIdentity({}) };
export const PharmacistHomeContentAdminDetailSchema = { ...object({ ...singleton, banners: adminBanners }), anyOf: revisionIdentity({ banners: emptyArray }) };
const settings = { siteNameTh: text, siteNameEn: text, slogan: nullable(text), logoPath: nullable(text), address: nullable(text), phone: nullable(text), fax: nullable(text), email: nullable(text), googleMapsUrl: nullable(text), facebookUrl: nullable(text), lineId: nullable(text), youtubeUrl: nullable(text) };
export const WebSettingsPublicSchema = object({ ...settings, googleMapsEmbedUrl: nullable({ type: 'string', maxLength: 2081, pattern: '^https://www\\.google\\.com/maps/embed\\?[^#\\s]+$' }) });
export const WebSettingsAdminSummarySchema = object({ ...settings, id: nullable(id), createdAt: nullable(timestamp), updatedAt: nullable(timestamp) });
export const WebSettingsAdminDetailSchema = object({ ...settings, id: nullable(id), createdAt: nullable(timestamp), updatedAt: nullable(timestamp), googleMapsEmbed: nullable(text) });
