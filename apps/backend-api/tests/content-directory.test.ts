import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import Ajv from 'ajv';
import * as contracts from '@pharmacy/contracts/content';
import * as content from '../src/modules/content';
import type { ContentDependencies } from '../src/modules/content';
import type { QueryClient } from '../src/db/client';
import { createAccessService } from '../src/modules/access/service';
import { accessFixture, seedStaff, fixedNow } from './fixtures/access';

const families = [
  { name: 'council', table: 'council_members', dto: 'Council', capability: 'manage_about', display: 'name', sorts: ['name','type','order','id'] },
  { name: 'history', table: 'council_history', dto: 'History', capability: 'manage_about', display: 'term', sorts: ['term','createdAt','id'] },
  { name: 'agencies', table: 'agencies', dto: 'Agency', capability: 'manage_agency', display: 'name', sorts: ['name','category','order','createdAt','id'] },
  { name: 'honor-awards', table: 'honor_awards', dto: 'HonorAward', capability: 'manage_about', display: 'name', sorts: ['name','order','createdAt','id'] },
  { name: 'honor', table: 'honors', dto: 'Honor', capability: 'manage_about', display: 'name', sorts: ['name','awardId','order','createdAt','id'] },
  { name: 'services', table: 'services', dto: 'Service', capability: 'manage_service', display: 'name', sorts: ['name','order','popularOrder','createdAt','id'] },
] as const;
const prefixes = ['/api/admin/content/', '/api/'];
const reads = families.flatMap(f => ['', '/1'].map(suffix => ({ method: 'GET' as const, url: `/api/admin/content/${f.name}${suffix}` })));
const reorders = families.filter(f => f.name !== 'history');
const writes = reorders.flatMap(f => prefixes.map(prefix => ({ method: 'PUT' as const, url: `${prefix}${f.name}/reorder`, payload: [{ id: 1, order: 8 }] })))
  .concat(prefixes.flatMap(prefix => [
    { method: 'POST' as any, url: prefix + 'honor-awards', payload: { name: 'New' } },
    { method: 'PUT' as const, url: prefix + 'honor-awards/1', payload: { name: 'Renamed' } },
  ]) as any);
const holds = families.flatMap(f => prefixes.flatMap(prefix => f.name === 'honor-awards'
  ? [{ method: 'DELETE' as const, url: `${prefix}${f.name}/1` }]
  : [{ method: 'POST' as const, url: prefix + f.name }, { method: 'PUT' as const, url: `${prefix}${f.name}/1` }, { method: 'DELETE' as const, url: `${prefix}${f.name}/1` }]));
const publicUrls = families.map(f => '/api/' + f.name).concat('/api/services/popular');
const ajv = new Ajv({ strict: true });

async function setup(bodyLimit = 1048576) {
  const fixture = await accessFixture();
  const app = Fastify({ logger: false, bodyLimit });
  try {
    await app.register(jwt, { secret: fixture.config.jwtSecret }); await app.register(multipart);
    const staff = await seedStaff(fixture.db);
    for (const key of ['manage_about','manage_agency','manage_service']) {
      await fixture.db.query('INSERT INTO permissions(key,label) VALUES($1,$2) ON CONFLICT DO NOTHING', [key, key]);
      await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('editor',$1,true)", [key]);
    }
    let failAfter: RegExp | undefined;
    let accessUnavailable = false, parsing = 0, files = 0, transactions = 0, nextFailure = false;
    const calls: { sql: string; values?: unknown[]; tx: number }[] = [];
    const access = createAccessService({ ...fixture, db: { ...fixture.db, query: (sql, values) => {
      if (accessUnavailable) throw new Error('private Access error');
      return fixture.db.query(sql, values);
    } } }, app.jwt);
    const query = async (client: QueryClient, tx: number, sql: string, values?: unknown[]) => {
      calls.push({ sql, values, tx });
      if (nextFailure && calls.filter(c => c.tx === tx && /^UPDATE/.test(c.sql)).length === 2) {
        nextFailure = false; throw new Error('private late SQL failure');
      }
      const result = await client.query(sql, values);
      if (failAfter?.test(sql)) {
        failAfter = undefined;
        throw new Error('private post-statement failure');
      }
      return result;
    };
    const db: ContentDependencies['db'] = { ...fixture.db, query: (sql, values) => query(fixture.db, 0, sql, values),
      withTransaction: work => { const id = ++transactions; return fixture.db.withTransaction(tx => work({ query: (sql, values) => query(tx, id, sql, values) })); } };
    app.addHook('preParsing', async (_request, _reply, payload) => { parsing++; return payload; });
    app.addHook('onRequest', async request => {
      for (const method of ['file','files','parts'] as const) {
        const original = request[method];
        (request as any)[method] = function (...args: unknown[]) { files++; return original.apply(this, args as any); };
      }
    });
    // During RED, missing registration deliberately leaves requests reaching the router as 404.
    const register = (content as unknown as { registerContentDirectoryRoutes?: (app: typeof app, deps: ContentDependencies) => Promise<void> }).registerContentDirectoryRoutes;
    if (register) await register(app, { db, access, clock: () => fixedNow });
    const token = (await access.login(staff.username, 'only-fake-fixture-password')).token;
    const headers = { authorization: `Bearer ${token}` };
    await fixture.db.query(`INSERT INTO council_members(id,name,position,type,"order",image_url,original_image_url,background) VALUES(1,'Alpha','President','a',0,'crop','original','bio'),(2,'Beta','Secretary','b',1,NULL,NULL,NULL)`);
    await fixture.db.query(`INSERT INTO council_history(id,term,start_year,end_year,president_name,secretary_name,president_image,original_president_image,secretary_image,original_secretary_image,created_at) VALUES(1,'Alpha','๒๕๖๘','2025/26','President','Secretary','crop','original','crop2','original2','2025-01-01 00:00:00.123'),(2,'Beta','','present','P2','S2',NULL,NULL,NULL,NULL,NULL)`);
    await fixture.db.query(`INSERT INTO agencies(id,name,url,category,"order",description,thumbnail_url,original_thumbnail_url,logo_url,icon_url,created_at) VALUES(1,'Alpha','https://example.test','a',0,'body','crop','original','logo','icon','2025-01-01 00:00:00.123'),(2,'Beta','https://example.test','b',1,NULL,NULL,NULL,NULL,NULL,NULL)`);
    await fixture.db.query(`INSERT INTO honor_awards(id,name,description,"order",created_at) VALUES(1,'Alpha','description',0,'2025-01-01 00:00:00.123'),(2,'Beta',NULL,1,NULL)`);
    await fixture.db.query(`INSERT INTO honors(id,award_id,name,award_name,"order",award_detail,full_detail,image_url,original_image_url,video_url,created_at) VALUES(1,1,'Alpha','unrelated',0,'award body','<p>full body</p>','crop','original','video','2025-01-01 00:00:00.123'),(2,1,'Beta','Alpha',1,NULL,NULL,NULL,NULL,NULL,NULL),(3,0,'Unassigned','Alpha',2,NULL,NULL,NULL,NULL,NULL,NULL),(4,99,'Orphan','Alpha',3,NULL,NULL,NULL,NULL,NULL,NULL)`);
    await fixture.db.query(`INSERT INTO services(id,name,short_name,"order",description,icon_url,link_url,is_popular,popular_order,created_at) VALUES(1,'Alpha','A',0,'body','icon','link',true,1,'2025-01-01 00:00:00.123'),(2,'Beta',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL)`);
    await fixture.db.query(`SELECT setval(pg_get_serial_sequence('honor_awards','id'),2)`);
    return { ...fixture, app, staff, headers, calls, stats: () => ({ parsing, files, transactions }),
      reset: () => { calls.length = 0; parsing = 0; files = 0; transactions = 0; },
      unavailable: (value: boolean) => { accessUnavailable = value; }, failLate: () => { nextFailure = true; }, failAfter: (pattern: RegExp) => { failAfter = pattern; },
      cleanup: async () => { await app.close(); await fixture.cleanup(); } };
  } catch (error) { await app.close(); await fixture.cleanup(); throw error; }
}

test('all twelve reads, 14 independent mutations and 32 holds use current Access before Content work', async () => {
  const f = await setup();
  try {
    assert.deepEqual([reads.length,writes.length,holds.length], [12,14,32]);
    const routes = [...reads,...writes,...holds];
    const check = async (status: number, authenticated = true) => {
      for (const route of routes) {
        f.reset(); const response = await f.app.inject({ ...route, headers: authenticated ? f.headers : {} });
        assert.equal(response.statusCode, status, `${route.method} ${route.url}: ${response.body}`);
        assert.equal(response.headers['cache-control'], 'no-store'); assert.equal(f.calls.length, 0);
        assert.deepEqual(f.stats(), { parsing: 0, files: 0, transactions: 0 });
      }
    };
    await check(401, false);
    for (const route of routes) {
      const r = await f.app.inject({ ...route, headers: f.headers });
      assert.equal(r.statusCode, holds.includes(route as any) ? 503 : 200, `${route.method} ${route.url}: ${r.body}`);
    }
    await f.db.query('UPDATE role_permissions SET is_active=false'); await check(403);
    await f.db.query('UPDATE role_permissions SET is_active=true');
    await f.db.query("INSERT INTO roles(name) VALUES('fixture_viewer')");
    await f.db.query("UPDATE users SET role='fixture_viewer' WHERE id=$1", [f.staff.id]); await check(403);
    await f.db.query("UPDATE users SET role='editor',active=false WHERE id=$1", [f.staff.id]); await check(401);
    await f.db.query('UPDATE users SET active=true'); await f.db.query('UPDATE staff_sessions SET revoked_at=$1', [fixedNow]); await check(401);
    await f.db.query('UPDATE staff_sessions SET revoked_at=NULL'); f.unavailable(true); await check(503); f.unavailable(false);
    for (const capability of ['manage_about','manage_agency','manage_service']) {
      await f.db.query('UPDATE role_permissions SET is_active=(permission_key=$1)', [capability]);
      for (const route of routes) {
        const family = families.find(family => route.url.split('/').includes(family.name))!;
        const r = await f.app.inject({ ...route, headers: f.headers });
        assert.equal(r.statusCode, family.capability === capability ? holds.includes(route as any) ? 503 : 200 : 403, route.url);
      }
    }
    await f.db.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT DO NOTHING");
    await f.db.query("UPDATE users SET role='admin' WHERE id=$1", [f.staff.id]); await f.db.query('UPDATE role_permissions SET is_active=false');
    for (const route of routes) assert.equal((await f.app.inject({ ...route, headers: f.headers })).statusCode, holds.includes(route as any) ? 503 : 200, route.url);
  } finally { await f.cleanup(); }
});

test('Media holds guard before malformed JSON, multipart, parts and business SQL; public aliases stay unmounted', async () => {
  const f = await setup();
  try {
    for (const route of holds) for (const [type,payload] of [['application/json','{"actor":'],['multipart/form-data; boundary=broken','--broken\r\nContent-Disposition: form-data; name="pdfFile"; filename="a.pdf"\r\n\r\nunfinished']]) {
      for (const state of ['anonymous','denied','allowed']) {
        await f.db.query('UPDATE role_permissions SET is_active=$1', [state !== 'denied']); f.reset();
        const r = await f.app.inject({ ...route, url: route.url.replace(/\/1$/, '/1x'), headers: { ...(state === 'anonymous' ? {} : f.headers), 'content-type': type }, payload });
        assert.equal(r.statusCode, state === 'anonymous' ? 401 : state === 'denied' ? 403 : 503, `${route.url} ${state}: ${r.body}`);
        assert.equal(f.calls.length, 0); assert.deepEqual(f.stats(), { parsing: 0, files: 0, transactions: 0 });
        if (state === 'allowed') assert.match(r.body, /media operations/);
      }
    }
    for (const url of publicUrls) for (const headers of [{}, f.headers]) assert.equal((await f.app.inject({ method: 'GET', url, headers })).statusCode, 404, url);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/admin/content/services/popular', headers: f.headers })).statusCode, 400);
    for (const family of families) assert.equal((await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}/reorder`, headers: f.headers })).statusCode, 400);
  } finally { await f.cleanup(); }
});


test('directory IDs and finite queries reject unsupported values before SQL', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      const base = `/api/admin/content/${family.name}`;
      for (const suffix of ['/0','/-1','/+1','/1.0','/1x','/2147483648']) {
        f.reset(); assert.equal((await f.app.inject({ method: 'GET', url: base + suffix, headers: f.headers })).statusCode, 400, base + suffix); assert.equal(f.calls.length, 0);
      }
      const invalid = ['page=0','page=01','page=-1','page=1.2','page=1&page=2','pageSize=0','pageSize=101','pageSize=1.2','pageSize=01','page=9007199254740991&pageSize=100','q=a&q=b','q=' + 'x'.repeat(201),'direction=desc','sort=id&direction=DESC','sort=id%3BDROP%20TABLE%20honors','search=x','awardId=1','categoryId=1','actor=admin','sort=unknown','status=x'];
      if (family.name === 'agencies') invalid.push('category=','category=' + 'x'.repeat(101));
      else if (family.name === 'honor') invalid.push('category=-1','category=2147483648','category=1x','category=1.0','category=Alpha');
      else invalid.push('category=x');
      for (const query of invalid) {
        f.reset(); const r = await f.app.inject({ method: 'GET', url: base + '?' + query, headers: f.headers });
        assert.equal(r.statusCode, 400, `${base}?${query}: ${r.body}`); assert.equal(f.calls.length, 0);
      }
      assert.equal((await f.app.inject({ method: 'GET', url: base + '/1?q=x', headers: f.headers })).statusCode, 400);
      assert.equal((await f.app.inject({ method: 'GET', url: base + '/2147483647', headers: f.headers })).statusCode, 404);
      assert.equal((await f.app.inject({ method: 'GET', url: base + '?pageSize=100', headers: f.headers })).statusCode, 200);
    }
    assert.equal(content.legacyContentRoutes.find(r => r.path === '/api/honor')!.queryKeys.includes('awardId'), true);
    assert.equal(content.legacyContentRoutes.find(r => r.path === '/api/honor-awards/:id' && r.method === 'DELETE')!.request.mediaLifecycleRequired, undefined);
  } finally { await f.cleanup(); }
});

test('explicit summaries/details preserve nulls, UTC, text years and full actual recipient counts', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      await f.db.query(`ALTER TABLE ${family.table} ADD COLUMN fixture_secret text DEFAULT 'private'`);
      const get = (suffix = '') => f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}${suffix}`, headers: f.headers });
      const all = await get(); assert.equal(all.statusCode, 200, all.body);
      assert.deepEqual(all.json().items.map((r: any) => r.id), family.name === 'history' ? [2,1] : family.name === 'honor' ? [1,2,3,4] : [1,2]);
      for (const row of all.json().items) {
        assert.equal(ajv.validate((contracts as any)[family.dto + 'AdminSummarySchema'], row), true, JSON.stringify(ajv.errors));
        const omitted = ['fixture_secret','fullDetail','originalImageUrl','originalPresidentImage','originalSecretaryImage','originalThumbnailUrl'];
        if (family.name !== 'honor') omitted.push('awardDetail');
        if (family.name !== 'council') omitted.push('background');
        if (!['agencies','honor-awards','services'].includes(family.name)) omitted.push('description');
        for (const key of omitted) assert.equal(key in row, false, family.name + key);
      }
      const detail = (await get('/1')).json();
      assert.equal(ajv.validate((contracts as any)[family.dto + 'AdminDetailSchema'], detail), true, JSON.stringify(ajv.errors));
      assert.equal('fixture_secret' in detail, false);
      if (family.name !== 'council') {
        assert.equal(detail.createdAt, '2025-01-01T00:00:00.123Z'); assert.equal((await get('/2')).json().createdAt, null);
      }
      if (family.name === 'history') { assert.equal(detail.startYear, '๒๕๖๘'); assert.equal(detail.endYear, '2025/26'); assert.equal(detail.originalPresidentImage, 'original'); }
      if (family.name === 'council') { assert.equal(detail.originalImageUrl, 'original'); assert.equal(detail.background, 'bio'); assert.equal(all.json().items[0].background, 'bio'); }
      if (family.name === 'agencies') { assert.equal(detail.originalThumbnailUrl, 'original'); assert.equal(detail.description, 'body'); assert.equal(all.json().items[0].description, 'body'); assert.equal((await get('?category=a')).json().total, 1); assert.equal((await get('?category=A')).json().total, 0); }
      if (family.name === 'honor-awards') {
        assert.equal(detail.description, 'description'); assert.equal(all.json().items[0].description, 'description'); assert.equal(detail.recipientCount, 2); assert.equal(all.json().items[0].recipientCount, 2);
        const page = (await get('?pageSize=1')).json(); assert.equal(page.total, 2); assert.equal(page.items[0].recipientCount, 2);
      }
      if (family.name === 'honor') {
        assert.equal(detail.awardId, 1); assert.equal(detail.awardName, 'unrelated'); assert.equal(detail.fullDetail, '<p>full body</p>'); assert.equal(detail.originalImageUrl, 'original');
        assert.equal(all.json().items[0].awardDetail, 'award body'); assert.equal('fullDetail' in all.json().items[0], false);
        assert.equal((await get('?category=01')).json().total, 2); assert.equal((await get('?category=0')).json().total, 1); assert.equal((await get('?category=1')).json().total, 2); assert.equal((await get('?category=99')).json().total, 1);
      }
      if (family.name === 'services') { assert.equal(detail.description, 'body'); assert.equal(all.json().items[0].description, 'body'); assert.equal((await get('/2')).json().isPopular, null); assert.equal((await get('/2')).json().popularOrder, null); }
      assert.deepEqual((await get('?page=100')).json(), { items: [], total: family.name === 'honor' ? 4 : 2, page: 100, pageSize: 10 });
    }
    assert.ok(f.calls.every(c => !/SELECT\s+\*/i.test(c.sql)));
    assert.equal(f.stats().transactions, 0);
  } finally { await f.cleanup(); }
});

test('all directory finite sorts, literal substring filters, stable ties and nullable ordering execute in SQL', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      await f.db.query(`UPDATE ${family.table} SET ${family.display}=CASE id WHEN 1 THEN 'A 100%_\\ literal' ELSE 'B 100%_\\ literal' END WHERE id IN (1,2)`);
      const get = (q: string) => f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}?${q}`, headers: f.headers });
      for (const q of ['%','_','\\','100%_\\']) {
        const r = await get('sort=id&q=' + encodeURIComponent(q)); assert.equal(r.statusCode, 200, r.body); assert.equal(r.json().total, 2); assert.deepEqual(r.json().items.map((r: any) => r.id), [1,2]);
      }
      assert.equal((await get('q=' + encodeURIComponent("' OR TRUE --"))).json().total, 0);
      assert.deepEqual((await get('q=100%25&page=2&pageSize=1&sort=id')).json().items.map((r: any) => r.id), [2]);
      if (family.name === 'honor') await f.db.query('UPDATE honors SET award_id=id WHERE id IN(1,2)');
      for (const sort of family.sorts) for (const direction of ['asc','desc']) {
        const r = await get(`q=100%25&sort=${sort}&direction=${direction}`); assert.equal(r.statusCode, 200, r.body);
        const expected = sort === 'createdAt' || sort === 'popularOrder' || direction === 'asc' ? [1,2] : [2,1];
        assert.deepEqual(r.json().items.map((r: any) => r.id), expected, family.name + sort + direction);
      }
      if (family.name !== 'history') {
        await f.db.query(`UPDATE ${family.table} SET "order"=0 WHERE id IN(1,2)`);
        assert.deepEqual((await get('q=100%25&sort=order&direction=desc')).json().items.map((r: any) => r.id), [1,2]);
      }
    }
  } finally { await f.cleanup(); }
});

test('awards preserve trim, nullable description, zero/default order and strict independent mutation envelopes', async () => {
  const f = await setup();
  try {
    for (const prefix of prefixes) {
      await f.db.query('DELETE FROM honors'); await f.db.query('DELETE FROM honor_awards');
      const mutate = (payload: unknown, id?: number) => f.app.inject({ method: id === undefined ? 'POST' : 'PUT', url: prefix + 'honor-awards' + (id === undefined ? '' : '/' + id), headers: f.headers, payload: payload as any });
      let id = 0;
      for (const [payload,order,description] of [[{name:'  First  ',description:' desc ',order:0},1,'desc'],[{name:'Second'},2,null],[{name:'Negative',description:null,order:-3},-3,null],[{name:'Blank',description:'  '},3,null]] as const) {
        f.reset(); const r = await mutate(payload); assert.equal(r.statusCode, 200, r.body); id = r.json().data.id;
        assert.deepEqual(r.json(), {success:true,data:{id,name:payload.name.trim(),order,description,createdAt:fixedNow.toISOString()}});
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
      }
      for (const [body,name,description] of [[{},'Blank',null],[{name:'  ',description:' preserved '},'Blank','preserved'],[{name:' Renamed '},'Renamed','preserved'],[{description:null},'Renamed',null],[{description:' '},'Renamed',null]] as const) {
        f.reset(); assert.deepEqual((await mutate(body,id)).json(), {success:true});
        assert.deepEqual((await f.db.query('SELECT name,description FROM honor_awards WHERE id=$1',[id])).rows[0], {name,description});
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
      }
      assert.equal((await mutate({},2147483647)).statusCode,404);
      for (const create of [true,false]) {
        const bad: unknown[] = [null,[],{name:null},{name:2},{name:true},{description:1},{name:'ok',actor:'admin'},{name:'ok',imageUrl:'arbitrary'},{name:'ok',order:'1'}];
        if(create) bad.push({}, {name:''},{name:'  '},{name:'ok',order:null},{name:'ok',order:1.2},{name:'ok',order:2147483648},{name:'ok',order:-2147483649});
        else bad.push({order:0},{order:1},{order:null});
        for (const body of bad) { f.reset(); const r=await mutate(body,create?undefined:id); assert.equal(r.statusCode,400,JSON.stringify(body)+r.body); assert.equal(f.calls.length,0); assert.equal(f.stats().transactions,0); }
      }
    }
  } finally { await f.cleanup(); }
});

test('award creation and SELECT preserve absolute UTC under a non-UTC host', async () => {
  const previous = process.env.TZ; process.env.TZ = 'Asia/Bangkok';
  let f: Awaited<ReturnType<typeof setup>> | undefined;
  try {
    assert.equal(fixedNow.getTimezoneOffset(), -420); f = await setup();
    for (const prefix of prefixes) {
      const r = await f.app.inject({method:'POST',url:prefix+'honor-awards',headers:f.headers,payload:{name:'UTC'}});
      assert.equal(r.statusCode,200,r.body); assert.equal(r.json().data.createdAt,'2026-10-15T12:00:00.789Z');
      assert.equal((await f.db.query("SELECT to_char(created_at,'YYYY-MM-DD HH24:MI:SS.MS') AS value FROM honor_awards WHERE id=$1",[r.json().data.id])).rows[0]!.value,'2026-10-15 12:00:00.789');
      for (const family of families.filter(f => f.name !== 'council')) {
        const detail = await f.app.inject({method:'GET',url:`/api/admin/content/${family.name}/1`,headers:f.headers});
        assert.equal(detail.json().createdAt,'2025-01-01T00:00:00.123Z');
      }
      const detail = await f.app.inject({method:'GET',url:'/api/admin/content/honor-awards/'+r.json().data.id,headers:f.headers});
      assert.equal(detail.json().createdAt,'2026-10-15T12:00:00.789Z');
    }
  } finally { try { await f?.cleanup(); } finally { if(previous === undefined) delete process.env.TZ; else process.env.TZ=previous; } }
});

test('all five reorder batches validate fully and preserve duplicate/empty/missing semantics in one rollback-safe transaction', async () => {
  const f = await setup();
  try {
    for (const family of reorders) for (const prefix of prefixes) {
      const put = (payload: unknown) => f.app.inject({method:'PUT',url:prefix+family.name+'/reorder',headers:f.headers,payload:payload as any});
      const original = (await f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t WHERE id=1`)).rows[0]!.value as Record<string,unknown>;
      for (const body of [[],[{id:2147483647,order:-2147483648}],[{id:1,order:-1},{id:1,order:2147483647}]]) {
        f.reset(); const r=await put(body); assert.equal(r.statusCode,200,r.body); assert.deepEqual(r.json(),{success:true}); assert.equal(f.stats().transactions,1); assert.ok(f.calls.every(c=>c.tx===1 && c.sql.startsWith(`UPDATE ${family.table} SET "order"=`)));
      }
      assert.deepEqual((await f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t WHERE id=1`)).rows[0]!.value,{...original,order:2147483647});
      const snapshots = () => Promise.all(families.map(family=>f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t ORDER BY id`)));
      const before = await snapshots(); f.reset(); f.failLate(); const failed=await put([{id:1,order:42},{id:1,order:43}]); assert.equal(failed.statusCode,503); assert.equal(failed.body.includes('private'),false); assert.deepEqual(f.calls.map(c=>c.tx),[1,1]); assert.deepEqual(await snapshots(),before);
      for (const entry of [{id:0,order:1},{id:-1,order:1},{id:'1',order:1},{id:1.1,order:1},{id:2147483648,order:1},{id:1,order:'1'},{id:1,order:null},{id:1,order:1.1},{id:1,order:2147483648},{id:1,order:-2147483649},{id:1},{id:1,order:1,media:'x'},null]) {
        f.reset(); const r=await put([{id:1,order:77},entry]); assert.equal(r.statusCode,400,JSON.stringify(entry)+r.body); assert.equal(f.calls.length,0); assert.equal(f.stats().transactions,0);
      }
      for (const body of [null,{}, {items:[]}, {items:[],actor:'admin'}]) { f.reset(); assert.equal((await put(body)).statusCode,400); assert.equal(f.calls.length,0); }
    }
  } finally { await f.cleanup(); }
});

test('working directory mutations respect configured bytes and malformed JSON before Content SQL', async () => {
  const f = await setup(128);
  try {
    for (const route of writes) {
      f.reset(); const malformed=await f.app.inject({...route,headers:{...f.headers,'content-type':'application/json'},payload:'{malformed'}); assert.equal(malformed.statusCode,400,route.url); assert.equal(f.calls.length,0);
      const large=await f.app.inject({...route,headers:{...f.headers,'content-type':'application/json'},payload:JSON.stringify({name:'x'.repeat(256)})}); assert.equal(large.statusCode,413,route.url); assert.equal(f.calls.length,0);
    }
  } finally { await f.cleanup(); }
});


test('award dependent operations roll back after a completed INSERT or UPDATE fails', async () => {
  const f = await setup();
  try {
    const snapshot = () => f.db.query('SELECT id,name,description,"order" FROM honor_awards ORDER BY id');
    for (const prefix of prefixes) {
      for (const create of [true, false]) {
        const before = await snapshot();
        f.reset();
        f.failAfter(create ? /^INSERT INTO honor_awards/ : /^UPDATE honor_awards/);
        const response = await f.app.inject({
          method: create ? 'POST' : 'PUT', url: prefix + 'honor-awards' + (create ? '' : '/1'),
          headers: f.headers, payload: { name: 'Rollback', description: 'must not persist' },
        });
        assert.equal(response.statusCode, 503, response.body);
        assert.equal(response.body.includes('private'), false);
        assert.equal(f.stats().transactions, 1);
        assert.deepEqual(f.calls.map(call => call.tx), [1, 1]);
        assert.match(f.calls[0]!.sql, create ? /MAX\("order"\)/ : /SELECT id/);
        assert.deepEqual(await snapshot(), before);
      }
    }
  } finally { await f.cleanup(); }
});
