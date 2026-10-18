import { CAPABILITY, isPermissionKey, type PermissionKey } from '@pharmacy/contracts/access';
import type { ContentListQuery } from '@pharmacy/contracts/content';

/** Declarations only: no handler is registered here. Public activation belongs to Task3. */
export const contentFamilies = [
  'home-content','pharmacist-home-content','news','medicine','public-project','laws','council','history','agencies',
  'web-settings','honor-awards','honor','services','policy-categories','policy-projects','products','other-service-categories','other-service-items',
] as const;
export type ContentFamily = typeof contentFamilies[number];
const capabilities: Record<ContentFamily, PermissionKey> = {
  'home-content': CAPABILITY.MANAGE_HOME, 'pharmacist-home-content': CAPABILITY.MANAGE_HOME,
  news: CAPABILITY.MANAGE_NEWS, medicine: CAPABILITY.MANAGE_NEWS, 'public-project': CAPABILITY.MANAGE_NEWS,
  laws: CAPABILITY.MANAGE_LAW, council: CAPABILITY.MANAGE_ABOUT, history: CAPABILITY.MANAGE_ABOUT,
  agencies: CAPABILITY.MANAGE_AGENCY, 'web-settings': CAPABILITY.MANAGE_WEB_SETTINGS,
  'honor-awards': CAPABILITY.MANAGE_ABOUT, honor: CAPABILITY.MANAGE_ABOUT, services: CAPABILITY.MANAGE_SERVICE,
  'policy-categories': CAPABILITY.MANAGE_ABOUT, 'policy-projects': CAPABILITY.MANAGE_ABOUT,
  products: CAPABILITY.MANAGE_PRODUCT, 'other-service-categories': CAPABILITY.MANAGE_OTHER_SERVICE, 'other-service-items': CAPABILITY.MANAGE_OTHER_SERVICE,
};
interface QueryPolicy {
  q: string; category?: string | { column: string; minimum: number } | readonly string[]; status?: string | readonly string[];
  sorts: Readonly<Record<string, string>>; defaults: readonly (readonly [string, 'asc' | 'desc'])[];
}
/** Every column identifier is code-owned. Text storage is not converted into an invented enum. */
export const contentQueryPolicies: Partial<Record<ContentFamily, QueryPolicy>> = {
  news: { q: 'title', category: ['news','recruitment','procurement'], status: ['draft','published'], sorts: { id: 'id', title: 'title', createdAt: 'created_at', updatedAt: 'updated_at', publishedAt: 'published_at', isHighlight: 'is_highlight' }, defaults: [['is_highlight','desc'],['published_at','desc'],['created_at','desc']] },
  medicine: { q: 'title', category: 'category', status: ['draft','published'], sorts: { id: 'id', title: 'title', createdAt: 'created_at', updatedAt: 'updated_at', publishedAt: 'published_at' }, defaults: [['published_at','desc'],['created_at','desc']] },
  'public-project': { q: 'title', category: 'category', status: ['draft','published'], sorts: { id: 'id', title: 'title', createdAt: 'created_at', updatedAt: 'updated_at', publishedAt: 'published_at' }, defaults: [['published_at','desc'],['created_at','desc']] },
  laws: { q: 'title', category: 'category', status: 'status', sorts: { id: 'id', title: 'title', year: 'year', announcedAt: 'announced_at', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  council: { q: 'name', sorts: { id: 'id', name: 'name', type: 'type', order: 'order' }, defaults: [['type','asc'],['order','asc']] },
  history: { q: 'term', sorts: { id: 'id', term: 'term', createdAt: 'created_at' }, defaults: [['id','desc']] },
  agencies: { q: 'name', category: 'category', sorts: { id: 'id', name: 'name', category: 'category', order: 'order', createdAt: 'created_at' }, defaults: [['category','asc'],['order','asc']] },
  'honor-awards': { q: 'name', sorts: { id: 'id', name: 'name', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  honor: { q: 'name', category: { column: 'award_id', minimum: 0 }, sorts: { id: 'id', name: 'name', awardId: 'award_id', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  services: { q: 'name', sorts: { id: 'id', name: 'name', order: 'order', popularOrder: 'popular_order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  'policy-categories': { q: 'title', sorts: { id: 'id', title: 'title', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  'policy-projects': { q: 'name', category: { column: 'category_id', minimum: 1 }, status: 'status', sorts: { id: 'id', name: 'name', categoryId: 'category_id', status: 'status', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  products: { q: 'name', category: 'category', sorts: { id: 'id', name: 'name', category: 'category', price: 'price', createdAt: 'created_at', updatedAt: 'updated_at' }, defaults: [['created_at','desc']] },
  'other-service-categories': { q: 'name', sorts: { id: 'id', name: 'name', order: 'order', createdAt: 'created_at' }, defaults: [['order','asc']] },
  'other-service-items': { q: 'name', category: { column: 'category_id', minimum: 1 }, status: 'status', sorts: { id: 'id', name: 'name', categoryId: 'category_id', status: 'status', order: 'order', createdAt: 'created_at' }, defaults: [['category_id','asc'],['order','asc']] },
};
const legacyQueryKeys: Record<ContentFamily, readonly string[]> = {
  'home-content': [], 'pharmacist-home-content': [], news: ['category','status'], medicine: ['status'], 'public-project': ['status'], laws: [],
  council: [], history: [], agencies: [], 'web-settings': [], 'honor-awards': [], honor: ['awardId'], services: [], 'policy-categories': [],
  'policy-projects': ['categoryId'], products: ['category','search'], 'other-service-categories': [], 'other-service-items': [],
};
export class ContentQueryError extends Error { readonly statusCode = 400; }
const invalid = (key: string): never => { throw new ContentQueryError(`Invalid Content query: ${key}`); };
export function parseContentId(value: unknown, minimum = 1): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return invalid('id');
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > 2147483647) return invalid('id');
  return number;
}
export interface ContentFilter { column: string; operator: '=' | 'ilike'; value: string | number }
export interface ContentOrder { column: string; direction: 'asc' | 'desc'; nulls: 'last' }
export interface ParsedContentQuery { page: number; pageSize: number; offset: number; filters: ContentFilter[]; order: ContentOrder[] }
/** Parses URL query values without coercing arrays, accepting partial integers, or taking SQL identifiers. */
export function parseContentQuery(family: ContentFamily, input: unknown, spelling: 'canonical' | 'legacy' = 'canonical'): ParsedContentQuery {
  if (!['canonical','legacy'].includes(spelling) || !contentFamilies.includes(family) || !input || typeof input !== 'object' || Array.isArray(input)) return invalid('query');
  const raw = input as Record<string, unknown>;
  const policy = contentQueryPolicies[family];
  const keys = spelling === 'legacy' ? legacyQueryKeys[family] : policy ? ['page','pageSize','q','category','status','sort','direction'] : [];
  for (const key of Object.keys(raw)) if (!keys.includes(key)) return invalid(key);
  const query: Record<string, unknown> = { ...raw };
  if (spelling === 'legacy') {
    if ('awardId' in query) { query.category = query.awardId; delete query.awardId; }
    if ('categoryId' in query) { query.category = query.categoryId; delete query.categoryId; }
    if ('search' in query) { query.q = query.search; delete query.search; }
  }
  const positive = (key: string, fallback: number, maximum: number) => {
    const value = query[key];
    if (value === undefined) return fallback;
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return invalid(key);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) return invalid(key);
    return number;
  };
  const page = positive('page', 1, Number.MAX_SAFE_INTEGER), pageSize = positive('pageSize', 10, 100);
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(offset + pageSize)) return invalid('page');
  const filters: ContentFilter[] = [];
  const text = (key: string, max: number, empty = false) => {
    const value = query[key];
    if (typeof value !== 'string' || (!empty && !value.length) || value.length > max) return invalid(key);
    return value;
  };
  if (query.q !== undefined) {
    if (!policy) return invalid('q');
    filters.push({ column: policy.q, operator: 'ilike', value: `%${text('q', 200, true).replace(/[\\%_]/g, '\\$&')}%` });
  }
  for (const key of ['category','status'] as const) if (query[key] !== undefined) {
    const rule = policy?.[key];
    if (!rule) return invalid(key);
    const value = text(key, 100);
    if (typeof rule === 'string') filters.push({ column: rule, operator: '=', value });
    else if (Array.isArray(rule)) {
      if (!rule.includes(value)) return invalid(key);
      filters.push({ column: key, operator: '=', value });
    } else {
      const relation = rule as { column: string; minimum: number };
      filters.push({ column: relation.column, operator: '=', value: parseContentId(value, relation.minimum) });
    }
  }
  if (query.direction !== undefined && (query.sort === undefined || !['asc','desc'].includes(text('direction', 4)))) return invalid('direction');
  const order: ContentOrder[] = [];
  if (query.sort !== undefined) {
    const sort = text('sort', 100);
    if (!policy || !Object.hasOwn(policy.sorts, sort)) return invalid('sort');
    order.push({ column: policy.sorts[sort]!, direction: (query.direction ?? 'asc') as NonNullable<ContentListQuery['direction']>, nulls: 'last' });
  } else for (const [column, direction] of policy?.defaults ?? []) order.push({ column, direction, nulls: 'last' });
  if (policy && !order.some(item => item.column === 'id')) order.push({ column: 'id', direction: 'asc', nulls: 'last' });
  return { page, pageSize, offset, filters, order };
}

export interface ContentRouteDeclaration {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE'; readonly path: string; readonly family: ContentFamily;
  readonly capability?: PermissionKey; readonly parameter?: 'id' | 'category' | 'categoryId';
  readonly queryKeys: readonly string[]; readonly response: string; readonly request: ContentRequestDeclaration; readonly activation: 'declared-unmounted';
}
export interface ContentRequestDeclaration {
  readonly format: 'none' | 'json' | 'multipart' | 'array' | 'items-object' | 'legacy-first-file';
  readonly fields: readonly string[]; readonly fileFields?: readonly string[];
  readonly expectedRevision?: true; readonly mediaLifecycleRequired?: true;
}
interface LegacyPayload {
  format: 'json' | 'multipart'; create: readonly string[]; update?: readonly string[]; files?: readonly string[];
}
// Historical spellings are evidence only; Media owns safe upload matching/replacement before activation.
const legacyPayloads: Record<ContentFamily, LegacyPayload> = {
  'home-content': { format: 'json', create: ['expectedRevision','banners','popups'] },
  'pharmacist-home-content': { format: 'json', create: ['expectedRevision','banners'] },
  news: { format: 'json', create: ['title','content','excerpt','category','status','publishedAt','isHighlight','thumbnailUrl'] },
  medicine: { format: 'json', create: ['title','content','excerpt','status','publishedAt','thumbnailUrl','category'] },
  'public-project': { format: 'json', create: ['title','content','excerpt','status','publishedAt','thumbnailUrl','category'] },
  laws: { format: 'json', create: ['title','category','announcedAt','order','status','year','pdfUrl'], update: ['title','announcedAt','order','status','year','pdfUrl'] },
  council: { format: 'json', create: ['prefix','name','position','type','order','background','imageUrl','originalImageUrl'] },
  history: { format: 'json', create: ['term','startYear','endYear','presidentName','secretaryName','presidentImage','secretaryImage','originalPresidentImage','originalSecretaryImage'] },
  agencies: { format: 'json', create: ['name','title','description','url','category','order','thumbnailUrl','originalThumbnailUrl','logoUrl','iconUrl'] },
  // The old unrestricted settings assignment is replaced by this finite owned field set.
  'web-settings': { format: 'json', create: ['siteNameTh','siteNameEn','slogan','logoPath','address','phone','fax','email','googleMapsUrl','googleMapsEmbed','facebookUrl','lineId','youtubeUrl'] },
  'honor-awards': { format: 'json', create: ['name','description','order'], update: ['name','description'] },
  honor: { format: 'json', create: ['prefix','name','awardName','workName','awardDetail','fullDetail','videoUrl','order','awardId','imageUrl','originalImageUrl'] },
  services: { format: 'json', create: ['name','shortName','description','linkUrl','order','isPopular','popularOrder','iconUrl'] },
  'policy-categories': { format: 'json', create: ['title','order'] },
  'policy-projects': { format: 'json', create: ['name','status','order','categoryId','summaryPdfUrl'] },
  products: { format: 'json', create: ['name','imageUrl','category','description','price'] },
  'other-service-categories': { format: 'json', create: ['name'] },
  'other-service-items': { format: 'json', create: ['name','categoryId','status','pdfUrl'] },
};
const noBody: ContentRequestDeclaration = { format: 'none', fields: [] };
function legacyRequest(route: LegacyDeclaration, family: ContentFamily): ContentRequestDeclaration {
  if (route.method === 'GET') return noBody;
  if (route.path.endsWith('/reorder')) return ['laws','other-service-categories','other-service-items'].includes(family)
    ? { format: 'items-object', fields: ['items'] } : { format: 'array', fields: ['id','order'] };
  if (route.path.endsWith('/upload-image'))
    return { format: 'json', fields: ['filename', 'declaredMime', 'size'], mediaLifecycleRequired: true };
  if (route.method === 'DELETE') return noBody;
  const payload = legacyPayloads[family];
  return { format: payload.format, fields: route.method === 'PUT' ? payload.update ?? payload.create : payload.create,
    fileFields: payload.files, ...(['home-content','pharmacist-home-content'].includes(family) ? { expectedRevision: true as const } : {}),
    ...(payload.format === 'multipart' ? { mediaLifecycleRequired: true as const } : {}) };
}
interface LegacyDeclaration { method: ContentRouteDeclaration['method']; path: string; response: string; parameter?: ContentRouteDeclaration['parameter'] }
// Exact compatibility spellings and response envelopes, rather than inferred CRUD routes.
const legacy: readonly LegacyDeclaration[] = [
  { method: 'GET', path: '/home-content', response: 'singleton-or-empty' },
  { method: 'POST', path: '/home-content/upload-image', response: 'url' },
  { method: 'POST', path: '/home-content', response: 'success' },
  { method: 'GET', path: '/pharmacist-home-content', response: 'singleton-or-empty' },
  { method: 'POST', path: '/pharmacist-home-content/upload-image', response: 'url' },
  { method: 'POST', path: '/pharmacist-home-content', response: 'success' },
  { method: 'GET', path: '/news', response: 'array' },
  { method: 'GET', path: '/news/:id', parameter: 'id', response: 'row-or-404' },
  { method: 'POST', path: '/news/upload-image', response: 'url' },
  { method: 'POST', path: '/news', response: 'success-data' },
  { method: 'PUT', path: '/news/:id', parameter: 'id', response: 'success-data' },
  { method: 'DELETE', path: '/news/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/medicine', response: 'array' },
  { method: 'GET', path: '/medicine/:id', parameter: 'id', response: 'row-or-404' },
  { method: 'POST', path: '/medicine/upload-image', response: 'url' },
  { method: 'POST', path: '/medicine', response: 'success-data' },
  { method: 'PUT', path: '/medicine/:id', parameter: 'id', response: 'success-data' },
  { method: 'DELETE', path: '/medicine/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/public-project', response: 'array' },
  { method: 'GET', path: '/public-project/:id', parameter: 'id', response: 'row-or-404' },
  { method: 'POST', path: '/public-project/upload-image', response: 'url' },
  { method: 'POST', path: '/public-project', response: 'success-data' },
  { method: 'PUT', path: '/public-project/:id', parameter: 'id', response: 'success-data' },
  { method: 'DELETE', path: '/public-project/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/laws/:category', parameter: 'category', response: 'array' },
  { method: 'POST', path: '/laws/upload-image', response: 'url' },
  { method: 'POST', path: '/laws', response: 'success' },
  { method: 'PUT', path: '/laws/:id', parameter: 'id', response: 'success' },
  { method: 'DELETE', path: '/laws/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/laws/reorder', response: 'success' },
  { method: 'GET', path: '/council', response: 'array' },
  { method: 'POST', path: '/council/upload-image', response: 'url' },
  { method: 'POST', path: '/council', response: 'success' },
  { method: 'PUT', path: '/council/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/council/reorder', response: 'success' },
  { method: 'DELETE', path: '/council/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/history', response: 'array' },
  { method: 'POST', path: '/history/upload-image', response: 'url' },
  { method: 'POST', path: '/history', response: 'success' },
  { method: 'PUT', path: '/history/:id', parameter: 'id', response: 'success' },
  { method: 'DELETE', path: '/history/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/agencies', response: 'array' },
  { method: 'POST', path: '/agencies/upload-image', response: 'url' },
  { method: 'POST', path: '/agencies', response: 'success' },
  { method: 'PUT', path: '/agencies/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/agencies/reorder', response: 'success' },
  { method: 'DELETE', path: '/agencies/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/web-settings', response: 'singleton-or-empty' },
  { method: 'POST', path: '/web-settings/upload-image', response: 'url' },
  { method: 'POST', path: '/web-settings', response: 'success-logoUrl' },
  { method: 'GET', path: '/honor-awards', response: 'array-recipientCount' },
  { method: 'POST', path: '/honor-awards', response: 'success-data' },
  { method: 'PUT', path: '/honor-awards/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/honor-awards/reorder', response: 'success' },
  { method: 'DELETE', path: '/honor-awards/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/honor', response: 'array' },
  { method: 'POST', path: '/honor/upload-image', response: 'url' },
  { method: 'POST', path: '/honor', response: 'success' },
  { method: 'PUT', path: '/honor/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/honor/reorder', response: 'success' },
  { method: 'DELETE', path: '/honor/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/services', response: 'array' },
  { method: 'GET', path: '/services/popular', response: 'array-popular-fixed-limit' },
  { method: 'POST', path: '/services/upload-image', response: 'url' },
  { method: 'POST', path: '/services', response: 'success' },
  { method: 'PUT', path: '/services/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/services/reorder', response: 'success' },
  { method: 'DELETE', path: '/services/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/policy-categories', response: 'array-projectCount' },
  { method: 'GET', path: '/policy-categories/:id', parameter: 'id', response: 'row-or-404' },
  { method: 'POST', path: '/policy-categories', response: 'success-data' },
  { method: 'PUT', path: '/policy-categories/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/policy-categories/reorder', response: 'success' },
  { method: 'DELETE', path: '/policy-categories/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/policy-projects', response: 'array' },
  { method: 'POST', path: '/policy-projects/upload-image', response: 'url' },
  { method: 'POST', path: '/policy-projects', response: 'success' },
  { method: 'PUT', path: '/policy-projects/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/policy-projects/reorder', response: 'success' },
  { method: 'DELETE', path: '/policy-projects/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/products', response: 'array' },
  { method: 'GET', path: '/products/:id', parameter: 'id', response: 'row-or-404' },
  { method: 'POST', path: '/products/upload-image', response: 'url' },
  { method: 'POST', path: '/products', response: 'success-data' },
  { method: 'PUT', path: '/products/:id', parameter: 'id', response: 'success-data' },
  { method: 'DELETE', path: '/products/:id', parameter: 'id', response: 'success' },
  { method: 'GET', path: '/other-service-categories', response: 'array' },
  { method: 'GET', path: '/other-service-categories/with-count', response: 'array-itemCount' },
  { method: 'POST', path: '/other-service-categories', response: 'success-category' },
  { method: 'PUT', path: '/other-service-categories/:id', parameter: 'id', response: 'success' },
  { method: 'DELETE', path: '/other-service-categories/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/other-service-categories/reorder', response: 'success' },
  { method: 'GET', path: '/other-service-items/:categoryId', parameter: 'categoryId', response: 'array' },
  { method: 'GET', path: '/other-service-items', response: 'array' },
  { method: 'POST', path: '/other-service-items/upload-image', response: 'url' },
  { method: 'POST', path: '/other-service-items', response: 'success-item' },
  { method: 'PUT', path: '/other-service-items/:id', parameter: 'id', response: 'success' },
  { method: 'DELETE', path: '/other-service-items/:id', parameter: 'id', response: 'success' },
  { method: 'PUT', path: '/other-service-items/reorder', response: 'success' },
];
export const legacyContentRoutes: readonly ContentRouteDeclaration[] = legacy.map(route => {
  const family = route.path.split('/')[1] as ContentFamily;
  return { ...route, family, path: `/api${route.path}`, capability: route.method === 'GET' ? undefined : capabilities[family],
    queryKeys: route.method === 'GET' && !route.parameter ? legacyQueryKeys[family] : [], request: legacyRequest(route, family), activation: 'declared-unmounted' };
});
/** Task3 reviewed refinement: modal detail is separate from the frozen 26 legacy GET inventory. */
export const additionalPublicContentRoutes: readonly ContentRouteDeclaration[] = [
  { method:'GET', path:'/api/honor/:id', family:'honor', parameter:'id', queryKeys:[], response:'HonorPublicDetail', request:noBody, activation:'declared-unmounted' },
];
const adminReads: readonly [ContentFamily, 'singleton' | 'collection'][] = [
  ['home-content','singleton'],['pharmacist-home-content','singleton'],['news','collection'],['medicine','collection'],['public-project','collection'],
  ['laws','collection'],['council','collection'],['history','collection'],['agencies','collection'],['web-settings','singleton'],
  ['honor-awards','collection'],['honor','collection'],['services','collection'],['policy-categories','collection'],['policy-projects','collection'],
  ['products','collection'],['other-service-categories','collection'],['other-service-items','collection'],
];
export const canonicalContentRoutes: readonly ContentRouteDeclaration[] = [
  ...adminReads.flatMap(([family, kind]): ContentRouteDeclaration[] => {
    const read: ContentRouteDeclaration = { method: 'GET', path: `/api/admin/content/${family}`, family, capability: capabilities[family],
      queryKeys: kind === 'singleton' ? [] : ['page','pageSize','q', ...(contentQueryPolicies[family]?.category ? ['category'] : []), ...(contentQueryPolicies[family]?.status ? ['status'] : []), 'sort','direction'],
      response: kind === 'singleton' ? 'AdminDetail' : 'Page<AdminSummary>', request: noBody, activation: 'declared-unmounted' };
    return kind === 'singleton' ? [read] : [read, { ...read, path: `${read.path}/:id`, parameter: 'id', queryKeys: [], response: 'AdminDetail' }];
  }),
  ...legacyContentRoutes.filter(route => route.method !== 'GET').map(route => ({ ...route, path: route.path.replace('/api/', '/api/admin/content/') })),
];
export function validateContentRouteDeclarations(routes: readonly { method: string; path: string; capability?: unknown }[]): void {
  const seen = new Set<string>();
  for (const route of routes) {
    if ((route.path.startsWith('/api/admin/content/') || route.method !== 'GET') && !isPermissionKey(route.capability)) throw new Error(`Unknown or missing Content capability: ${route.path}`);
    if (route.capability !== undefined && !isPermissionKey(route.capability)) throw new Error(`Unknown Content capability: ${route.path}`);
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) throw new Error(`Duplicate Content declaration: ${key}`);
    seen.add(key);
  }
}
validateContentRouteDeclarations(canonicalContentRoutes);
validateContentRouteDeclarations(legacyContentRoutes);

validateContentRouteDeclarations([...legacyContentRoutes,...additionalPublicContentRoutes]);
