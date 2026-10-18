import type { FastifyInstance } from 'fastify';
import * as C from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery, parseContentId, ContentQueryError } from '../route-manifest';
import { readClauses, readDetailId } from './read-query';
import { notFoundSchema } from './write-input';
import { readHomeContent, singletonSerializer } from '../singleton-service';
import { createRichTextSanitizer } from '../rich-text';
import { publicArticlePredicate } from '../publication';
import * as project from '../public-projections';

const array = (items: C.ContentJsonSchema) => ({ type:'array', items });
/** Exact legacy GETs only. Arrays use accepted finite filters without staff pagination. */
export function registerPublicContentRoutes(app: FastifyInstance, { db, clock, config }: ContentDependencies) {
  const sanitize = createRichTextSanitizer(config?.contentImageSources ?? []);
  app.get('/api/news', { schema: { response: { 200: array(C.NewsPublicSummarySchema) } } }, async request => {
    const query = parseContentQuery('news',request.query,'legacy');
    const clauses = readClauses(query);
    // Publication is mandatory even when the supported legacy status filter asks for drafts.
    const values = [clock().toISOString(), ...clauses.values];
    const filters = clauses.where ? ' AND ' + clauses.where.slice(7).replace(/\$(\d+)/g, (_match,n) => '$' + (Number(n)+1)) : '';
    const rows = await db.query(`SELECT id, title, excerpt, thumbnail_url, category, created_at AT TIME ZONE 'UTC' AS created_at, published_at AT TIME ZONE 'UTC' AS published_at, is_highlight FROM news WHERE ${publicArticlePredicate}${filters}${clauses.order}`,values);
    return rows.rows.map(project.publicNews);
  });
  app.get('/api/news/:id', { schema: { response: { 200: C.NewsPublicDetailSchema, 404: notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT id, title, excerpt, thumbnail_url, category, created_at AT TIME ZONE 'UTC' AS created_at, published_at AT TIME ZONE 'UTC' AS published_at, is_highlight, content FROM news WHERE ${publicArticlePredicate} AND id=$2`,[clock().toISOString(),id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return { ...project.publicNews(row), content: sanitize(row.content as string) };
  });
  app.get('/api/medicine', { schema: { response: { 200: array(C.MedicinePublicSummarySchema) } } }, async request => {
    const query = parseContentQuery('medicine',request.query,'legacy');
    const clauses = readClauses(query);
    // Publication is mandatory even when the supported legacy status filter asks for drafts.
    const values = [clock().toISOString(), ...clauses.values];
    const filters = clauses.where ? ' AND ' + clauses.where.slice(7).replace(/\$(\d+)/g, (_match,n) => '$' + (Number(n)+1)) : '';
    const rows = await db.query(`SELECT id, title, excerpt, thumbnail_url, category, published_at AT TIME ZONE 'UTC' AS published_at FROM medicine_articles WHERE ${publicArticlePredicate}${filters}${clauses.order}`,values);
    return rows.rows.map(project.publicArticle);
  });
  app.get('/api/medicine/:id', { schema: { response: { 200: C.MedicinePublicDetailSchema, 404: notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT id, title, excerpt, thumbnail_url, category, published_at AT TIME ZONE 'UTC' AS published_at, content FROM medicine_articles WHERE ${publicArticlePredicate} AND id=$2`,[clock().toISOString(),id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return { ...project.publicArticle(row), content: sanitize(row.content as string) };
  });
  app.get('/api/public-project', { schema: { response: { 200: array(C.PublicProjectPublicSummarySchema) } } }, async request => {
    const query = parseContentQuery('public-project',request.query,'legacy');
    const clauses = readClauses(query);
    // Publication is mandatory even when the supported legacy status filter asks for drafts.
    const values = [clock().toISOString(), ...clauses.values];
    const filters = clauses.where ? ' AND ' + clauses.where.slice(7).replace(/\$(\d+)/g, (_match,n) => '$' + (Number(n)+1)) : '';
    const rows = await db.query(`SELECT id, title, excerpt, thumbnail_url, category, created_at AT TIME ZONE 'UTC' AS created_at, published_at AT TIME ZONE 'UTC' AS published_at FROM public_project_articles WHERE ${publicArticlePredicate}${filters}${clauses.order}`,values);
    return rows.rows.map(project.publicProject);
  });
  app.get('/api/public-project/:id', { schema: { response: { 200: C.PublicProjectPublicDetailSchema, 404: notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT id, title, excerpt, thumbnail_url, category, created_at AT TIME ZONE 'UTC' AS created_at, published_at AT TIME ZONE 'UTC' AS published_at, content FROM public_project_articles WHERE ${publicArticlePredicate} AND id=$2`,[clock().toISOString(),id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return { ...project.publicProject(row), content: sanitize(row.content as string) };
  });
  app.get('/api/products', { schema: { response: { 200: array(C.ProductPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('products',request.query,'legacy'));
    const rows = await db.query(`SELECT id, name, image_url, category, description, price FROM products${clauses.where}${clauses.order}`,clauses.values);
    return rows.rows.map(project.publicProduct);
  });
  app.get('/api/products/:id', { schema: { response: { 200: C.ProductPublicSchema, 404: notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query('SELECT id, name, image_url, category, description, price FROM products WHERE id=$1',[id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return project.publicProduct(row);
  });
  app.get('/api/policy-projects', { schema: { response: { 200: array(C.PolicyProjectPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('policy-projects',request.query,'legacy'));
    const rows = await db.query(`SELECT id, category_id, name, summary_pdf_url, status, "order" FROM policy_projects${clauses.where}${clauses.order}`,clauses.values);
    return rows.rows.map(project.publicPolicyProject);
  });
  app.get('/api/honor', { schema: { response: { 200: array(C.HonorPublicSummarySchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('honor',request.query,'legacy'));
    const rows = await db.query(`SELECT id, award_id, "order", prefix, name, award_name, work_name, award_detail, image_url, video_url FROM honors${clauses.where}${clauses.order}`,clauses.values);
    return rows.rows.map(project.publicHonor);
  });
  app.get('/api/honor/:id', { schema: { response: { 200:C.HonorPublicDetailSchema, 404:notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT id, award_id, "order", prefix, name, award_name, work_name, image_url, video_url, award_detail, full_detail FROM honors WHERE id=$1`,[id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return project.publicHonorDetail(row,sanitize);
  });
  app.get('/api/council', { schema: { response: { 200: array(C.CouncilPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('council',request.query,'legacy'));
    const rows = await db.query(`SELECT id, prefix, name, position, type, image_url, "order", background FROM council_members${clauses.order}`);
    return rows.rows.map(project.publicCouncil);
  });
  app.get('/api/history', { schema: { response: { 200: array(C.HistoryPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('history',request.query,'legacy'));
    const rows = await db.query(`SELECT id, term, start_year, end_year, president_name, secretary_name, president_image, secretary_image FROM council_history${clauses.order}`);
    return rows.rows.map(project.publicHistory);
  });
  app.get('/api/agencies', { schema: { response: { 200: array(C.AgencyPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('agencies',request.query,'legacy'));
    const rows = await db.query(`SELECT id, "order", name, title, description, thumbnail_url, logo_url, icon_url, url, category FROM agencies${clauses.order}`);
    return rows.rows.map(project.publicAgency);
  });
  app.get('/api/honor-awards', { schema: { response: { 200: array(C.HonorAwardPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('honor-awards',request.query,'legacy'));
    const rows = await db.query(`SELECT id, "order", name, description, (SELECT count(*) FROM honors WHERE award_id=honor_awards.id) AS recipient_count FROM honor_awards${clauses.order}`);
    return rows.rows.map(project.publicHonorAward);
  });
  app.get('/api/policy-categories', { schema: { response: { 200: array(C.PolicyCategoryPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('policy-categories',request.query,'legacy'));
    const rows = await db.query(`SELECT id, title, "order", (SELECT count(*) FROM policy_projects WHERE category_id=policy_categories.id) AS project_count FROM policy_categories${clauses.order}`);
    return rows.rows.map(project.publicPolicyCategory);
  });
  app.get('/api/policy-categories/:id', { schema: { response: { 200: C.PolicyCategoryPublicSchema, 404: notFoundSchema } } }, async (request,reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT id, title, "order", (SELECT count(*) FROM policy_projects WHERE category_id=policy_categories.id) AS project_count FROM policy_categories WHERE id=$1`,[id])).rows[0];
    if (!row) return reply.code(404).send({ message:'Content not found' });
    return project.publicPolicyCategory(row);
  });
  app.get('/api/other-service-categories', { schema: { response: { 200: array(C.OtherServiceCategoryPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('other-service-categories',request.query,'legacy'));
    const rows = await db.query(`SELECT id, name, "order", (SELECT count(*) FROM other_service_items WHERE category_id=other_service_categories.id AND status='online') AS item_count FROM other_service_categories${clauses.order}`);
    return rows.rows.map(project.publicOtherCategory);
  });
  app.get('/api/other-service-categories/with-count', { schema: { response: { 200: array(C.OtherServiceCategoryPublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('other-service-categories',request.query,'legacy'));
    return (await db.query(`SELECT id, name, "order", (SELECT count(*) FROM other_service_items WHERE category_id=other_service_categories.id AND status='online') AS item_count FROM other_service_categories${clauses.order}`)).rows.map(project.publicOtherCategory);
  });
  app.get('/api/services', { schema: { response: { 200: array(C.ServicePublicSchema) } } }, async request => {
    const clauses = readClauses(parseContentQuery('services',request.query,'legacy'));
    const rows = await db.query(`SELECT id, name, short_name, icon_url, "order", description, link_url, is_popular, popular_order FROM services${clauses.order}`);
    return rows.rows.map(project.publicService);
  });
  app.get('/api/services/popular', { schema: { response: { 200: array(C.ServicePublicSchema) } } }, async request => {
    parseContentQuery('services',request.query,'legacy');
    return (await db.query(`SELECT id, name, short_name, icon_url, "order", description, link_url, is_popular, popular_order FROM services WHERE is_popular=true ORDER BY popular_order ASC NULLS LAST, id ASC LIMIT 4`)).rows.map(project.publicService);
  });
  app.get('/api/laws/:category', { schema: { response: { 200: array(C.LawPublicSchema) } } }, async request => {
    parseContentQuery('laws',request.query,'legacy');
    const category = (request.params as {category:string}).category;
    if (!category.length || category.length > 100) throw new ContentQueryError('Invalid category');
    return (await db.query(`SELECT id, category, title, year, announced_at::text AS announced_at, "order", pdf_url FROM laws WHERE category=$1 AND status='online' ORDER BY "order" ASC NULLS LAST, id ASC`,[category])).rows.map(project.publicLaw);
  });
  app.get('/api/other-service-items', { schema: { response: { 200: array(C.OtherServiceItemPublicSchema) } } }, async request => {
    parseContentQuery('other-service-items',request.query,'legacy');
    return (await db.query(`SELECT id, category_id, name, pdf_url, "order" FROM other_service_items WHERE status='online' ORDER BY category_id ASC, "order" ASC, id ASC`)).rows.map(project.publicOtherItem);
  });
  app.get('/api/other-service-items/:categoryId', { schema: { response: { 200: array(C.OtherServiceItemPublicSchema) } } }, async request => {
    parseContentQuery('other-service-items',request.query,'legacy');
    const categoryId = parseContentId((request.params as {categoryId:string}).categoryId);
    return (await db.query(`SELECT id, category_id, name, pdf_url, "order" FROM other_service_items WHERE status='online' AND category_id=$1 ORDER BY "order" ASC, id ASC`,[categoryId])).rows.map(project.publicOtherItem);
  });
  app.get('/api/home-content', { serializerCompiler:singletonSerializer, schema: { response: { 200:C.HomeContentPublicSchema } } }, async request => {
    parseContentQuery('home-content',request.query,'legacy');
    const row = await readHomeContent(db,'home-content');
    return { banners:row.banners?.filter(b => b.active).map(project.publicBanner) ?? row.banners,
      popups:('popups' in row ? row.popups?.filter(p => p.active).map(project.publicPopup) ?? row.popups : []) };
  });
  app.get('/api/pharmacist-home-content', { serializerCompiler:singletonSerializer, schema: { response: { 200:C.PharmacistHomeContentPublicSchema } } }, async request => {
    parseContentQuery('pharmacist-home-content',request.query,'legacy');
    const row = await readHomeContent(db,'pharmacist-home-content');
    return { banners:row.banners?.filter(b => b.active).map(project.publicBanner) ?? row.banners };
  });
  app.get('/api/web-settings', { schema: { response: { 200:C.WebSettingsPublicSchema } } }, async request => {
    parseContentQuery('web-settings',request.query,'legacy');
    const row = (await db.query(`SELECT site_name_th, site_name_en, slogan, logo_path, address, phone, fax, email, google_maps_url, google_maps_embed, facebook_url, line_id, youtube_url FROM web_settings ORDER BY id ASC LIMIT 1`)).rows[0];
    return project.publicSettings(row ?? {site_name_th:'สภาเภสัชกรรม',site_name_en:'The Pharmacy Council of Thailand',slogan:'',logo_path:'',address:'',phone:'',fax:'',email:'',google_maps_url:'',google_maps_embed:'',facebook_url:'',line_id:'',youtube_url:''});
  });
}
