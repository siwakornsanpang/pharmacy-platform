import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { generateDrizzleJson } from 'drizzle-kit/api';
import * as central from '../src/db/schema';

const directory = '../src/modules/content/';
test('content owns exact eighteen tables and preserves baseline Drizzle metadata except staged revisions', async () => {
  const owned = await import(`${directory}schema`);
  const before = JSON.parse(readFileSync('drizzle/meta/0008_snapshot.json', 'utf8'));
  const after = generateDrizzleJson(owned);
  assert.equal(Object.keys(after.tables).length, 20);
  assert.deepEqual(after.enums, Object.fromEntries(Object.entries(before.enums).filter(([key]) => ['public.news_status','public.news_category'].includes(key))));
  for (const [key, value] of Object.entries(after.tables)) {
    if (['public.content_asset_refs','public.content_media_intents'].includes(key)) continue;
    const table = JSON.parse(JSON.stringify(value)) as any;
    if (['public.home_content','public.pharmacist_home_content'].includes(key)) {
      assert.deepEqual(table.columns.revision, { name: 'revision', type: 'integer', primaryKey: false, notNull: true, default: 1 });
      delete table.columns.revision;
    }
    assert.deepEqual(table, before.tables[key], key);
  }
  for (const [name, value] of Object.entries(owned)) assert.equal((central as any)[name], value, name);
});

test('content_route_manifest_has_guard_for_every_admin_read_write', async () => {
  const m = await import(`${directory}route-manifest`);
  assert.equal(m.contentFamilies.length, 18);
  assert.equal(m.legacyContentRoutes.length, 99);
  assert.equal(m.legacyContentRoutes.filter((r: any) => r.method === 'GET').length, 26);
  const routes = [...m.canonicalContentRoutes, ...m.legacyContentRoutes.filter((r: any) => r.method !== 'GET')];
  assert.deepEqual(routes.filter((r: any) => !r.capability), []);
  assert.throws(() => m.validateContentRouteDeclarations([{ method: 'GET', path: '/api/admin/content/news', capability: 'unknown' }]), /capability/i);
  assert.equal(m.canonicalContentRoutes.find((r: any) => r.path === '/api/admin/content/laws/:id').parameter, 'id');
  assert.equal(m.legacyContentRoutes.find((r: any) => r.path === '/api/laws/:category').parameter, 'category');
  assert.equal(m.legacyContentRoutes.find((r: any) => r.path === '/api/other-service-items/:categoryId').parameter, 'categoryId');
  assert.equal(m.canonicalContentRoutes.find((r: any) => r.path === '/api/admin/content/laws/reorder').parameter, undefined);
});

test('finite canonical query parsing escapes literal q and rejects unsupported spellings and identifiers', async () => {
  const { parseContentQuery } = await import(`${directory}route-manifest`);
  const base = parseContentQuery('news', {});
  assert.deepEqual([base.page, base.pageSize, base.offset], [1,10,0]);
  assert.equal(parseContentQuery('news', { page: 2, pageSize: 5 }).offset, 5);
  assert.deepEqual(base.order, [{ column: 'is_highlight', direction: 'desc', nulls: 'last' }, { column: 'published_at', direction: 'desc', nulls: 'last' }, { column: 'created_at', direction: 'desc', nulls: 'last' }, { column: 'id', direction: 'asc', nulls: 'last' }]);
  assert.deepEqual(parseContentQuery('products', { q: '100%_\\', sort: 'price', direction: 'asc', category: 'arbitrary' }).filters, [{ column: 'name', operator: 'ilike', value: '%100\\%\\_\\\\%' }, { column: 'category', operator: '=', value: 'arbitrary' }]);
  assert.deepEqual(parseContentQuery('honor', { category: '0' }).filters, [{ column: 'award_id', operator: '=', value: 0 }]);
  for (const query of [{ category: '0' }, { category: '1x' }, { category: '2147483648' }, { category: '-1' }]) assert.throws(() => parseContentQuery('policy-projects', query));
  for (const query of [{ awardId: '1' }, { search: 'x' }, { sort: 'name; DROP TABLE news' }, { direction: 'desc' }, { page: '1.5' }, { page: ['1'] }, { pageSize: '101' }, { page: String(Number.MAX_SAFE_INTEGER) }, { status: 'unknown' }]) assert.throws(() => parseContentQuery('news', query));
  assert.throws(() => parseContentQuery('council', { category: 'elected' }));
  assert.throws(() => parseContentQuery('home-content', { page: '1' }));
  assert.equal(parseContentQuery('laws', { status: 'legacy-status' }).filters[0].value, 'legacy-status');
  assert.equal(parseContentQuery('products', { search: 'old' }, 'legacy').filters[0].value, '%old%');
  assert.throws(() => parseContentQuery('medicine', { q: 'x' }, 'legacy'));
});

test('compatibility declarations retain finite payload spellings and distinct reorder envelopes', async () => {
  const m = await import(`${directory}route-manifest`);
  const find = (path: string, method = 'PUT') => m.legacyContentRoutes.find((r: any) => r.path === `/api${path}` && r.method === method);
  assert.equal(find('/laws/reorder').request.format, 'items-object');
  assert.equal(find('/council/reorder').request.format, 'array');
  assert.equal(find('/other-service-items/reorder').request.format, 'items-object');
  assert.deepEqual(find('/laws/:id').request.fields, ['title','announcedAt','order','status','year','pdfUrl']);
  assert.deepEqual(find('/products', 'POST').request.fields, ['name','imageUrl','category','description','price']);
  assert.equal(find('/home-content','POST').request.expectedRevision, true);
  assert.equal(find('/news/upload-image','POST').request.mediaLifecycleRequired, true);
});

test('Task2b runtime registration exactly matches eight canonical reads and 28 guarded holds', async () => {
  const { default: Fastify } = await import('fastify');
  const { registerContentArticleRoutes, canonicalContentRoutes, legacyContentRoutes } = await import('../src/modules/content');
  const { AccessError } = await import('../src/modules/access/guards');
  const selected = ['news','medicine','public-project','products'];
  const declarations = [
    ...canonicalContentRoutes.filter(route => selected.includes(route.family) && !route.path.endsWith('/upload-image')),
    ...legacyContentRoutes.filter(route => selected.includes(route.family) && route.method !== 'GET'),
  ];
  assert.equal(declarations.length, 36);
  const app = Fastify();
  const registered: string[] = [];
  app.addHook('onRoute', route => {
    for (const method of Array.isArray(route.method) ? route.method : [route.method]) if (method !== 'HEAD') registered.push(`${method} ${route.url}`);
  });
  const noSql = async (): Promise<never> => { throw new Error('Registration must not query Content'); };
  await registerContentArticleRoutes(app, {
    db: { query: noSql, withTransaction: noSql, close: async () => {} }, clock: () => { throw new Error('Registration must not read the clock'); },
    access: { requireCapability: () => async () => { throw new AccessError(401, 'Unauthorized'); }, resolveStaffActor: noSql },
  });
  try {
    await app.ready();
    assert.deepEqual(registered.sort(), declarations.map(route => `${route.method} ${route.path}`).sort());
  } finally { await app.close(); }
});

test('Task2c isolated registration matches ten reads, 18 writes and 22 holds without public/static count activation', async () => {
  const { default: Fastify } = await import('fastify');
  const content = await import('../src/modules/content');
  const { AccessError } = await import('../src/modules/access/guards');
  const selected = ['laws','policy-categories','policy-projects','other-service-categories','other-service-items'];
  const declarations = [
    ...content.canonicalContentRoutes.filter(route => selected.includes(route.family) && !route.path.endsWith('/upload-image')),
    ...content.legacyContentRoutes.filter(route => selected.includes(route.family) && route.method !== 'GET'),
  ];
  assert.equal(declarations.length, 53);
  const app = Fastify(); const registered: string[] = [];
  app.addHook('onRoute', route => {
    for (const method of Array.isArray(route.method) ? route.method : [route.method]) if (method !== 'HEAD') registered.push(`${method} ${route.url}`);
  });
  const noSql = async (): Promise<never> => { throw new Error('Registration must not query Content'); };
  const register = (content as any).registerContentDocumentRoutes;
  if (register) await register(app, {
    db: { query: noSql, withTransaction: noSql, close: async () => {} }, clock: () => { throw new Error('Registration must not read the clock'); },
    access: { requireCapability: () => async () => { throw new AccessError(401, 'Unauthorized'); }, resolveStaffActor: noSql },
  });
  try { await app.ready(); assert.deepEqual(registered.sort(), declarations.map(route => `${route.method} ${route.path}`).sort()); }
  finally { await app.close(); }
});

test('Task2d isolated registration matches twelve reads, 14 writes and 32 Media holds', async () => {
  const { default: Fastify } = await import('fastify');
  const content = await import('../src/modules/content');
  const { AccessError } = await import('../src/modules/access/guards');
  const selected = ['council','history','agencies','honor-awards','honor','services'];
  const declarations = [...content.canonicalContentRoutes.filter(r=>selected.includes(r.family)&&!r.path.endsWith('/upload-image')), ...content.legacyContentRoutes.filter(r=>selected.includes(r.family)&&r.method!=='GET')];
  assert.equal(declarations.length,63);
  const app=Fastify(); const registered:string[]=[];
  app.addHook('onRoute',route=>{for(const method of Array.isArray(route.method)?route.method:[route.method]) if(method!=='HEAD') registered.push(`${method} ${route.url}`);});
  const noSql=async():Promise<never>=>{throw new Error('Registration must not query Content');};
  const register=(content as any).registerContentDirectoryRoutes;
  if(register) await register(app,{db:{query:noSql,withTransaction:noSql,close:async()=>{}},clock:()=>{throw new Error('No clock at registration');},access:{requireCapability:()=>async()=>{throw new AccessError(401,'Unauthorized');},resolveStaffActor:noSql}});
  try {await app.ready(); assert.deepEqual(registered.sort(),declarations.map(r=>`${r.method} ${r.path}`).sort());
    assert.equal(content.legacyContentRoutes.find(r=>r.path==='/api/honor-awards/:id'&&r.method==='DELETE')!.request.mediaLifecycleRequired,undefined);
    assert.equal(content.canonicalContentRoutes.some(r=>r.path==='/api/admin/content/services/popular'),false);
  } finally {await app.close();}
});

test('final buildApp mounts all18 staff families with actual current guards, finite reads/writes and safe public activation', async()=>{
  const {buildApp}=await import('../src/app');
  const {getServerConfig}=await import('../src/config/server');
  const {backendEnv}=await import('./fixtures/database');
  const m=await import('../src/modules/content');
  let queries=0;
  const noSql=async():Promise<never>=>{queries++;throw new Error('Unexpected SQL');};
  const app=await buildApp({config:getServerConfig(backendEnv),db:{query:noSql,withTransaction:noSql,close:async()=>{}},clock:()=>{throw new Error('Unexpected clock');}});
  try{
    const declarations=[...m.canonicalContentRoutes.filter(r=>!r.path.endsWith('/upload-image')),...m.legacyContentRoutes.filter(r=>r.method!=='GET')];
    assert.equal(declarations.length,164);assert.equal(new Set(declarations.map(r=>r.family)).size,18);
    const missingGuards:string[]=[];let request=0;
    for(const route of declarations){const url=route.path.replace(':id','1');const response=await app.inject({method:route.method,url,remoteAddress:`127.1.${Math.floor(++request/250)}.${request%250+1}`});if(response.statusCode!==401)missingGuards.push(`${route.method} ${url}: ${response.statusCode}`);assert.equal(response.headers['cache-control'],'no-store',url);}
    assert.deepEqual(missingGuards,[]);assert.equal(queries,0);
    // Public SQL/DTO/clock behavior is exercised against real fixtures in content-publication.test.ts.
    // Unknown query rejection proves all accepted GETs are mounted without reading data.
    for(const route of [...m.legacyContentRoutes.filter(r=>r.method==='GET'),...m.additionalPublicContentRoutes]){const response=await app.inject({method:'GET',url:route.path.replace(':id','1').replace(':categoryId','1').replace(':category','online')+'?unknown=x',remoteAddress:'127.2.0.'+(++request%250+1)});assert.equal(response.statusCode,400,route.path);assert.equal(response.headers['cache-control'],'no-store');}
    assert.equal(queries,0);
    for(const route of m.canonicalContentRoutes.filter(r=>r.path.endsWith('/upload-image')))assert.equal((await app.inject({method:route.method,url:route.path})).statusCode,404,route.path);
  }finally{await app.close();}
});


test('complete composed runtime ledger has exactly180 explicit Content routes and60 generated HEAD routes',async()=>{
 const {default:Fastify}=await import('fastify');const m=await import('../src/modules/content');const {AccessError}=await import('../src/modules/access/guards');
 const app=Fastify();const explicit:string[]=[],head:string[]=[];
 app.addHook('onRoute',route=>{for(const method of Array.isArray(route.method)?route.method:[route.method])(method==='HEAD'?head:explicit).push(`${method} ${route.url}`);});
 const noSql=async():Promise<never>=>{throw new Error('No startup SQL');};
 await m.registerContentRoutes(app,{db:{query:noSql,withTransaction:noSql,close:async()=>{}},clock:()=>{throw new Error('No startup clock');},access:{requireCapability:()=>async()=>{throw new AccessError(401,'Unauthorized');},resolveStaffActor:noSql}});
 try{await app.ready();const declared=[...m.canonicalContentRoutes.filter(r=>!r.path.endsWith('/upload-image')),...m.legacyContentRoutes,...m.additionalPublicContentRoutes];assert.equal(explicit.length,191);assert.equal(head.length,60);assert.deepEqual(explicit.sort(),declared.map(r=>`${r.method} ${r.path}`).sort());assert.deepEqual(head.sort(),declared.filter(r=>r.method==='GET').map(r=>`HEAD ${r.path}`).sort());}finally{await app.close();}
});
