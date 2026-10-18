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
  { name: 'laws', table: 'laws', dto: 'Law', capability: 'manage_law', display: 'title', sorts: ['title','year','announcedAt','order','createdAt','id'] },
  { name: 'policy-categories', table: 'policy_categories', dto: 'PolicyCategory', capability: 'manage_about', display: 'title', sorts: ['title','order','createdAt','id'] },
  { name: 'policy-projects', table: 'policy_projects', dto: 'PolicyProject', capability: 'manage_about', display: 'name', sorts: ['name','categoryId','status','order','createdAt','id'] },
  { name: 'other-service-categories', table: 'other_service_categories', dto: 'OtherServiceCategory', capability: 'manage_other_service', display: 'name', sorts: ['name','order','createdAt','id'] },
  { name: 'other-service-items', table: 'other_service_items', dto: 'OtherServiceItem', capability: 'manage_other_service', display: 'name', sorts: ['name','categoryId','status','order','createdAt','id'] },
] as const;
const prefixes = ['/api/admin/content/', '/api/'];
const reads = families.flatMap(f => ['', '/1'].map(suffix => ({ method: 'GET' as const, url: `/api/admin/content/${f.name}${suffix}` })));
const reorderBody = (family: string, items: unknown[]) => family.startsWith('policy-') ? items : { items };
const writes = families.flatMap(f => prefixes.map(prefix => ({ method: 'PUT' as const, url: `${prefix}${f.name}/reorder`, payload: reorderBody(f.name, [{ id: 1, order: 8 }]) })))
  .concat(['policy-categories','other-service-categories'].flatMap(name => prefixes.flatMap(prefix => [
    { method: 'POST' as any, url: prefix + name, payload: name === 'policy-categories' ? { title: 'New' } : { name: 'New' } },
    { method: 'PUT' as const, url: prefix + name + '/1', payload: name === 'policy-categories' ? { title: 'Renamed' } : { name: 'Renamed' } },
  ])) as any);
const holds = families.flatMap(f => prefixes.flatMap(prefix => f.name.endsWith('-categories')
  ? [{ method: 'DELETE' as const, url: `${prefix}${f.name}/1` }]
  : [{ method: 'POST' as const, url: prefix + f.name }, { method: 'PUT' as const, url: `${prefix}${f.name}/1` }, { method: 'DELETE' as const, url: `${prefix}${f.name}/1` }]));
const publicUrls = ['/api/laws/1','/api/policy-categories','/api/policy-categories/1','/api/policy-projects','/api/other-service-categories','/api/other-service-categories/with-count','/api/other-service-items','/api/other-service-items/1'];
const ajv = new Ajv({ strict: true });

async function setup(bodyLimit = 1048576) {
  const fixture = await accessFixture();
  const app = Fastify({ logger: false, bodyLimit });
  try {
    await app.register(jwt, { secret: fixture.config.jwtSecret }); await app.register(multipart);
    const staff = await seedStaff(fixture.db);
    for (const key of ['manage_law','manage_about','manage_other_service']) {
      await fixture.db.query('INSERT INTO permissions(key,label) VALUES($1,$2) ON CONFLICT DO NOTHING', [key, key]);
      await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('editor',$1,true)", [key]);
    }
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
      return client.query(sql, values);
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
    const register = (content as unknown as { registerContentDocumentRoutes?: (app: typeof app, deps: ContentDependencies) => Promise<void> }).registerContentDocumentRoutes;
    if (register) await register(app, { db, access, clock: () => fixedNow });
    const token = (await access.login(staff.username, 'only-fake-fixture-password')).token;
    const headers = { authorization: `Bearer ${token}` };
    await fixture.db.query(`INSERT INTO laws(id,category,title,year,announced_at,"order",pdf_url,status,created_at) VALUES(1,'1','Law',2568,'2025-01-01',0,'law.pdf','legacy status','2025-01-01 00:00:00.123')`);
    await fixture.db.query(`INSERT INTO policy_categories(id,title,"order",created_at) VALUES(1,'Policy',0,'2025-01-01 00:00:00.123'),(2,'Other policy',1,NULL)`);
    await fixture.db.query(`INSERT INTO policy_projects(id,category_id,name,summary_pdf_url,status,"order",created_at) VALUES(1,1,'Project','policy.pdf','legacy status',0,'2025-01-01 00:00:00.123'),(2,1,'Second',NULL,'offline',1,NULL),(3,2,'Third',NULL,'planned',0,NULL)`);
    await fixture.db.query(`INSERT INTO other_service_categories(id,name,"order",created_at) VALUES(1,'Service',0,'2025-01-01 00:00:00.123'),(2,'Other service',1,NULL)`);
    await fixture.db.query(`INSERT INTO other_service_items(id,category_id,name,pdf_url,status,"order",created_at) VALUES(1,1,'Item','item.pdf','legacy status',0,'2025-01-01 00:00:00.123'),(2,1,'Second',NULL,'offline',1,NULL),(3,2,'Third',NULL,'online',0,NULL)`);
    for (const table of ['policy_categories','other_service_categories']) await fixture.db.query(`SELECT setval(pg_get_serial_sequence('${table}','id'),2)`);
    return { ...fixture, app, staff, headers, calls, stats: () => ({ parsing, files, transactions }),
      reset: () => { calls.length = 0; parsing = 0; files = 0; transactions = 0; },
      unavailable: (value: boolean) => { accessUnavailable = value; }, failLate: () => { nextFailure = true; },
      cleanup: async () => { await app.close(); await fixture.cleanup(); } };
  } catch (error) { await app.close(); await fixture.cleanup(); throw error; }
}

test('all ten reads, 18 independent mutations and 22 holds use current Access before Content work', async () => {
  const f = await setup();
  try {
    assert.deepEqual([reads.length,writes.length,holds.length], [10,18,22]);
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
    for (const capability of ['manage_law','manage_about','manage_other_service']) {
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
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/admin/content/other-service-categories/with-count', headers: f.headers })).statusCode, 400);
    for (const family of families) assert.equal((await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}/reorder`, headers: f.headers })).statusCode, 400);
  } finally { await f.cleanup(); }
});

test('canonical details and finite queries reject invalid values before SQL, including legacy relation spelling', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      const base = `/api/admin/content/${family.name}`;
      for (const suffix of ['/0','/-1','/+1','/1.0','/1x','/2147483648']) {
        f.reset(); assert.equal((await f.app.inject({ method: 'GET', url: base + suffix, headers: f.headers })).statusCode, 400, base + suffix); assert.equal(f.calls.length, 0);
      }
      for (const query of ['page=0','page=01','page=-1','page=1.2','page=1&page=2','pageSize=0','pageSize=101','pageSize=1.2','pageSize=01','page=9007199254740991&pageSize=100','q=a&q=b','q=' + 'x'.repeat(201),'direction=desc','sort=id&direction=DESC','sort=id%3BDROP%20TABLE%20laws','search=x','awardId=1','categoryId=1','actor=admin','sort=unknown']) {
        f.reset(); const r = await f.app.inject({ method: 'GET', url: `${base}?${query}`, headers: f.headers });
        assert.equal(r.statusCode, 400, `${family.name} ${query}: ${r.body}`); assert.equal(f.calls.length, 0);
      }
      assert.equal((await f.app.inject({ method: 'GET', url: base + '/1?q=x', headers: f.headers })).statusCode, 400);
      assert.equal((await f.app.inject({ method: 'GET', url: base + '/2147483647', headers: f.headers })).statusCode, 404);
      assert.equal((await f.app.inject({ method: 'GET', url: base + '?pageSize=100', headers: f.headers })).statusCode, 200);
      const invalidFilters = family.name.endsWith('-categories') ? ['category=x','status=x'] : family.name === 'laws' ? ['category=','category=' + 'a'.repeat(101),'status=','status=' + 'a'.repeat(101)] : ['category=0','category=1x','category=2147483648','category=-1','category=1.2','status=','status=' + 'a'.repeat(101)];
      for (const query of invalidFilters) assert.equal((await f.app.inject({ method: 'GET', url: base + '?' + query, headers: f.headers })).statusCode, 400, `${base}?${query}`);
    }
    assert.equal(content.legacyContentRoutes.find(r => r.path === '/api/policy-projects')!.queryKeys.includes('categoryId'), true);
  } finally { await f.cleanup(); }
});

test('SQL reads select explicit DTOs, literal q, stable null sorting, full child counts and date/UTC values', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      await f.db.query(`ALTER TABLE ${family.table} ADD COLUMN fixture_secret text DEFAULT 'private'`);
      await f.db.query(`UPDATE ${family.table} SET ${family.display}='A 100%_\\ literal',"order"=0 WHERE id=1`);
      if (family.name === 'laws') await f.db.query(`INSERT INTO laws(id,title,category,year,announced_at,"order",pdf_url,status,created_at) VALUES(2,'a 100%_\\ literal','other',NULL,NULL,0,NULL,NULL,NULL),(3,'A 100abX literal','1',2567,'2024-12-31',NULL,NULL,'offline',NULL)`);
      else await f.db.query(`UPDATE ${family.table} SET ${family.display}='a 100%_\\ literal',"order"=0 WHERE id=2`);
      const base = `/api/admin/content/${family.name}`;
      const get = (suffix = '') => f.app.inject({ method: 'GET', url: base + suffix, headers: f.headers });
      const all = await get(); assert.equal(all.statusCode, 200, all.body);
      assert.deepEqual(all.json().items.map((r: any) => r.id), family.name.endsWith('-categories') ? [1,2] : [1,2,3]);
      for (const row of all.json().items) {
        const schema = (contracts as any)[family.dto + 'AdminSummarySchema'];
        assert.equal(ajv.validate(schema, row), true, JSON.stringify(ajv.errors));
        assert.equal(ajv.validate(schema, { ...row, fixture_secret: 'private' }), false);
        assert.equal('fixture_secret' in row, false); assert.equal('projects' in row, false); assert.equal('description' in row, false);
      }
      for (const q of ['%','_','\\','a 100%_\\']) {
        const r = await get('?q=' + encodeURIComponent(q)); assert.deepEqual(r.json().items.map((r: any) => r.id), [1,2], family.name + q); assert.equal(r.json().total, 2);
      }
      assert.equal((await get('?q=' + encodeURIComponent("' OR TRUE --"))).json().total, 0);
      assert.deepEqual((await get('?q=' + encodeURIComponent('100%_\\') + '&page=2&pageSize=1')).json().items.map((r: any) => r.id), [2]);
      assert.deepEqual((await get('?page=100')).json(), { items: [], total: family.name.endsWith('-categories') ? 2 : 3, page: 100, pageSize: 10 });
      for (const sort of family.sorts) for (const direction of ['asc','desc']) assert.equal((await get(`?sort=${sort}&direction=${direction}`)).statusCode, 200, family.name + sort);
      assert.deepEqual((await get('?sort=id&direction=desc')).json().items.map((r: any) => r.id), family.name.endsWith('-categories') ? [2,1] : [3,2,1]);
      assert.equal((await get('?sort=createdAt&direction=desc')).json().items[0].id, 1);
      const detail = await get('/1'); assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(ajv.validate((contracts as any)[family.dto + 'AdminDetailSchema'], detail.json()), true, JSON.stringify(ajv.errors));
      assert.equal(detail.json().createdAt, '2025-01-01T00:00:00.123Z');
      assert.equal((await get('/2')).json().createdAt, null);
      if (family.name === 'laws') {
        assert.equal(detail.json().announcedAt, '2025-01-01'); assert.equal(detail.json().year, 2568); assert.equal(detail.json().pdfUrl, 'law.pdf');
        const nullable = (await get('/2')).json(); for (const key of ['announcedAt','year','pdfUrl','status','createdAt']) assert.equal(nullable[key], null);
        assert.equal((await get('/3')).json().order, null);
        assert.equal((await get('?category=1&status=legacy%20status')).json().total, 1);
        assert.equal((await get('?category=Other')).json().total, 0);
      } else if (family.name.endsWith('-categories')) {
        const count = family.name === 'policy-categories' ? 'projectCount' : 'itemCount';
        assert.equal(detail.json()[count], 2); assert.equal(all.json().items[0][count], 2); assert.equal(all.json().total, 2);
        const paged = (await get('?pageSize=1')).json(); assert.equal(paged.total, 2); assert.equal(paged.items[0][count], 2);
        assert.equal('summaryPdfUrl' in detail.json(), false);
      } else {
        assert.equal(detail.json().status, 'legacy status'); assert.equal(detail.json().categoryId, 1);
        const filtered = (await get('?category=1&status=legacy%20status&pageSize=1&page=2')).json(); assert.equal(filtered.total, 1); assert.deepEqual(filtered.items, []);
        assert.equal((await get('?category=1')).json().total, 2); assert.equal((await get('?status=LEGACY%20STATUS')).json().total, 0);
      }
    }
    assert.ok(f.calls.every(c => !/SELECT\s+\*/i.test(c.sql)));
    assert.equal(f.stats().transactions, 0);
  } finally { await f.cleanup(); }
});

test('category bodies preserve exact envelopes, policy zero/default/omission and other trim/missing behavior', async () => {
  const f = await setup();
  try {
    for (const prefix of prefixes) {
      await f.db.query('DELETE FROM policy_projects'); await f.db.query('DELETE FROM policy_categories');
      await f.db.query('DELETE FROM other_service_items'); await f.db.query('DELETE FROM other_service_categories');
      const mutate = (family: string, payload: unknown, id?: number) => f.app.inject({ method: id === undefined ? 'POST' : 'PUT', url: prefix + family + (id === undefined ? '' : '/' + id), headers: f.headers, payload: payload as any });
      for (const [payload,order] of [[{ title: 'Policy', order: 0 },1],[{ title: 'Second' },2],[{ title: 'Negative', order: -3 },-3],[{ title: '  ' },3]] as const) {
        f.reset(); const r = await mutate('policy-categories', payload); assert.equal(r.statusCode, 200, r.body);
        assert.deepEqual(r.json(), { success: true, data: { id: r.json().data.id, title: payload.title, order, createdAt: fixedNow.toISOString() } });
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
      }
      const id = (await f.db.query('SELECT min(id) AS id FROM policy_categories')).rows[0]!.id as number;
      assert.deepEqual((await mutate('policy-categories', { title: '', order: 0 }, id)).json(), { success: true });
      assert.deepEqual((await f.db.query('SELECT title,"order" FROM policy_categories WHERE id=$1', [id])).rows[0], { title: 'Policy', order: 0 });
      await mutate('policy-categories', {}, id); assert.equal((await f.db.query('SELECT "order" FROM policy_categories WHERE id=$1', [id])).rows[0]!.order, 0);
      assert.deepEqual((await mutate('policy-categories', { title: 'missing' }, 2147483647)).json(), { success: true });
      for (const [name,order] of [['  Service  ',0],['Second',1]] as const) {
        f.reset(); const r = await mutate('other-service-categories', { name }); assert.equal(r.statusCode, 200, r.body);
        assert.deepEqual(r.json(), { success: true, category: { id: r.json().category.id, name: name.trim(), order, createdAt: fixedNow.toISOString() } });
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
      }
      const otherId = (await f.db.query('SELECT min(id) AS id FROM other_service_categories')).rows[0]!.id as number;
      for (const body of [{}, { name: '  ' }, { name: ' Renamed ' }]) {
        f.reset(); const r = await mutate('other-service-categories', body, otherId); assert.deepEqual(r.json(), { success: true });
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
      }
      assert.equal((await f.db.query('SELECT name FROM other_service_categories WHERE id=$1', [otherId])).rows[0]!.name, 'Renamed');
      assert.equal((await mutate('other-service-categories', {}, 2147483647)).statusCode, 404);
      for (const family of ['policy-categories','other-service-categories']) for (const create of [true,false]) {
        const field = family === 'policy-categories' ? 'title' : 'name';
        const bad = [null,[],{ [field]: null },{ [field]: 12 },{ [field]: true },{ [field]: 'valid', actor: 'admin' },{ [field]: 'valid', pdfUrl: 'arbitrary' },{ [field]: 'valid', summaryPdfUrl: 'arbitrary' },{ [field]: 'valid', description: 'unknown' },{ [field]: 'valid', order: '1' }];
        if (create) bad.push({}, { [field]: '' }, ...(field === 'name' ? [{ name: '  ' }] : []));
        if (field === 'title') bad.push({ order: null }, { order: 1.2 }, { order: 2147483648 }, { order: -2147483649 });
        for (const body of bad) {
          f.reset(); const r = await mutate(family, body, create ? undefined : family === 'policy-categories' ? id : otherId);
          assert.equal(r.statusCode, 400, `${prefix}${family} ${JSON.stringify(body)}: ${r.body}`); assert.equal(f.calls.length, 0); assert.equal(f.stats().transactions, 0);
        }
      }
    }
  } finally { await f.cleanup(); }
});

test('category inserts preserve the injected UTC instant in SQL storage and DTOs on a non-UTC host', async () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Bangkok';
  let f: Awaited<ReturnType<typeof setup>> | undefined;
  try {
    assert.equal(fixedNow.getTimezoneOffset(), -420);
    f = await setup();
    for (const prefix of prefixes) for (const [family, table, payload, envelope] of [
      ['policy-categories', 'policy_categories', { title: 'UTC clock' }, 'data'],
      ['other-service-categories', 'other_service_categories', { name: 'UTC clock' }, 'category'],
    ] as const) {
      const response = await f.app.inject({ method: 'POST', url: prefix + family, headers: f.headers, payload });
      assert.equal(response.statusCode, 200, response.body);
      const row = response.json()[envelope];
      assert.equal(row.createdAt, '2026-10-15T12:00:00.789Z');
      const stored = await f.db.query(`SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI:SS.MS') AS value FROM ${table} WHERE id=$1`, [row.id]);
      assert.equal(stored.rows[0]!.value, '2026-10-15 12:00:00.789');
      const detail = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family}/${row.id}`, headers: f.headers });
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(detail.json().createdAt, '2026-10-15T12:00:00.789Z');
    }
  } finally {
    try { await f?.cleanup(); }
    finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  }
});

test('every finite sort orders actual SQL rows with stable id ties and nullable values last', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      await f.db.query(`UPDATE ${family.table} SET ${family.display}=CASE id WHEN 1 THEN 'Sort A' ELSE 'Sort B' END, "order"=id-1 WHERE id IN (1,2)`);
      if (family.name === 'laws') {
        await f.db.query("INSERT INTO laws(id,category,title,year,announced_at,\"order\",created_at) VALUES(2,'other','Sort B',2024,'2024-01-01',1,NULL)");
        await f.db.query("UPDATE laws SET year=2025,announced_at='2025-01-01' WHERE id=1");
      } else if (!family.name.endsWith('-categories')) {
        await f.db.query(`UPDATE ${family.table} SET category_id=id, status=CASE id WHEN 1 THEN 'alpha' ELSE 'beta' END WHERE id IN (1,2)`);
      }
      for (const sort of family.sorts) for (const direction of ['asc','desc']) {
        const response = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}?q=Sort%20&sort=${sort}&direction=${direction}`, headers: f.headers });
        assert.equal(response.statusCode, 200, response.body);
        const ascending = sort === 'year' || sort === 'announcedAt' ? [2,1] : [1,2];
        const expected = sort === 'createdAt' || direction === 'asc' ? ascending : [...ascending].reverse();
        assert.deepEqual(response.json().items.map((row: any) => row.id), expected, `${family.name} ${sort} ${direction}`);
      }
      const ties = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}?q=Sort%20&sort=order&direction=desc`, headers: f.headers });
      assert.deepEqual(ties.json().items.map((row: any) => row.id), [2,1]);
      await f.db.query(`UPDATE ${family.table} SET "order"=0 WHERE id IN (1,2)`);
      const stable = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}?q=Sort%20&sort=order&direction=desc`, headers: f.headers });
      assert.deepEqual(stable.json().items.map((row: any) => row.id), [1,2]);
    }
  } finally { await f.cleanup(); }
});

test('all five reorder adapters validate full strict batches then update order only in one rollback-safe transaction', async () => {
  const f = await setup();
  try {
    for (const family of families) for (const prefix of prefixes) {
      const url = prefix + family.name + '/reorder';
      const put = (payload: unknown) => f.app.inject({ method: 'PUT', url, headers: f.headers, payload: payload as any });
      const original = (await f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t WHERE id=1`)).rows[0]!.value as Record<string,unknown>;
      for (const items of [[], [{ id: 2147483647, order: -2147483648 }], [{ id: 1, order: -1 },{ id: 1, order: 2147483647 }]]) {
        f.reset(); const r = await put(reorderBody(family.name, items)); assert.equal(r.statusCode, 200, r.body); assert.deepEqual(r.json(), { success: true });
        assert.equal(f.stats().transactions, 1); assert.ok(f.calls.every(c => c.tx === 1));
        assert.ok(f.calls.every(c => c.sql.startsWith(`UPDATE ${family.table} SET "order"=`)));
      }
      const after = (await f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t WHERE id=1`)).rows[0]!.value as Record<string,unknown>;
      assert.deepEqual(after, { ...original, order: 2147483647 });
      const beforeTables = await Promise.all(families.map(family => f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t ORDER BY id`)));
      f.reset(); f.failLate(); const failed = await put(reorderBody(family.name, [{ id: 1, order: 42 },{ id: 1, order: 43 }]));
      assert.equal(failed.statusCode, 503); assert.equal(failed.body.includes('private'), false); assert.equal(f.stats().transactions, 1); assert.deepEqual(f.calls.map(c => c.tx), [1,1]);
      const afterTables = await Promise.all(families.map(family => f.db.query(`SELECT row_to_json(t) AS value FROM ${family.table} t ORDER BY id`)));
      assert.deepEqual(afterTables, beforeTables, family.name + ' rollback and foreign rows');
      const invalidEntries = [{ id: 0, order: 1 },{ id: -1, order: 1 },{ id: '1', order: 1 },{ id: 1.1, order: 1 },{ id: 2147483648, order: 1 },{ id: 1, order: '1' },{ id: 1, order: null },{ id: 1, order: 1.1 },{ id: 1, order: 2147483648 },{ id: 1, order: -2147483649 },{ id: 1 },{ id: 1, order: 1, pdfUrl: 'arbitrary' },null];
      for (const entry of invalidEntries) {
        f.reset(); const r = await put(reorderBody(family.name, [{ id: 1, order: 77 },entry])); assert.equal(r.statusCode, 400, `${url} ${JSON.stringify(entry)}: ${r.body}`); assert.equal(f.calls.length, 0); assert.equal(f.stats().transactions, 0);
      }
      for (const body of [null,{}, { items: [] , actor: 'admin' }, reorderBody(family.name, []) instanceof Array ? { items: [] } : []]) {
        f.reset(); assert.equal((await put(body)).statusCode, 400, `${url} ${JSON.stringify(body)}`); assert.equal(f.calls.length, 0);
      }
    }
  } finally { await f.cleanup(); }
});

test('working mutations retain configured byte bounds and fail malformed JSON without Content SQL', async () => {
  const f = await setup(128);
  try {
    for (const route of writes) {
      f.reset(); const malformed = await f.app.inject({ ...route, headers: { ...f.headers, 'content-type': 'application/json' }, payload: '{malformed' });
      assert.equal(malformed.statusCode, 400, route.url); assert.equal(f.calls.length, 0);
      const large = await f.app.inject({ ...route, headers: { ...f.headers, 'content-type': 'application/json' }, payload: JSON.stringify({ title: 'x'.repeat(256) }) });
      assert.equal(large.statusCode, 413, route.url); assert.equal(f.calls.length, 0);
    }
  } finally { await f.cleanup(); }
});
