import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import Ajv from 'ajv';
import * as contracts from '@pharmacy/contracts/content';
import * as content from '../src/modules/content';
import { createAccessService } from '../src/modules/access/service';
import { accessFixture, seedStaff, fixedNow } from './fixtures/access';

const families = [
  { name: 'news', table: 'news', prefix: 'News' },
  { name: 'medicine', table: 'medicine_articles', prefix: 'Medicine' },
  { name: 'public-project', table: 'public_project_articles', prefix: 'PublicProject' },
  { name: 'products', table: 'products', prefix: 'Product' },
] as const;
const heldRoutes = families.flatMap(f => [
  ...['/api/admin/content/', '/api/'].flatMap(prefix => [
    { method: 'POST' as const, url: `${prefix}${f.name}` },
    { method: 'PUT' as const, url: `${prefix}${f.name}/1` },
    { method: 'DELETE' as const, url: `${prefix}${f.name}/1` },
  ]), { method: 'POST' as const, url: `/api/${f.name}/upload-image` },
]);
const reads = families.flatMap(f => ['', '/1'].map(suffix => ({ method: 'GET' as const, url: `/api/admin/content/${f.name}${suffix}` })));
const authorized = (token: string) => ({ authorization: `Bearer ${token}` });

async function setup() {
  const fixture = await accessFixture();
  let app: FastifyInstance | undefined;
  try {
    const staff = await seedStaff(fixture.db);
    await fixture.db.query("INSERT INTO permissions(key,label) VALUES ('manage_product','Fixture products') ON CONFLICT DO NOTHING");
    await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('editor','manage_product',true)");
    let accessUnavailable = false, contentCalls = 0, transactions = 0, parsing = 0, files = 0, clockCalls = 0;
    const contentSql: string[] = [];
    let now = fixedNow;
    const clock = () => { clockCalls++; return now; };
    const accessDb = { ...fixture.db, query: async (sql: string, values?: unknown[]) => {
      if (accessUnavailable) throw new Error('fixture-private-SQL-failure');
      return fixture.db.query(sql, values);
    } };
    const db = { ...fixture.db, query: async (sql: string, values?: unknown[]) => {
      contentCalls++; contentSql.push(sql);
      return fixture.db.query(sql, values);
    }, withTransaction: async <T>(work: Parameters<typeof fixture.db.withTransaction<T>>[0]) => {
      transactions++; return fixture.db.withTransaction(work);
    } };
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: fixture.config.jwtSecret });
    await app.register(multipart);
    const access = createAccessService({ ...fixture, db: accessDb, clock }, app.jwt);
    app.addHook('preParsing', async (_request, _reply, payload) => { parsing++; return payload; });
    app.addHook('onRequest', async request => {
      const original = request.file;
      request.file = async function (...args: Parameters<typeof original>) { files++; return original.apply(this, args); };
    });
    await content.registerContentArticleRoutes(app, { db, clock, access });
    const login = await access.login(staff.username, 'only-fake-fixture-password');
    const headers = authorized(login.token);
    for (const f of families) {
      if (f.name === 'products') await fixture.db.query(`INSERT INTO products(id,name,category,price) VALUES(1,'Fixture','arbitrary','-2.10')`);
      else await fixture.db.query(`INSERT INTO ${f.table}(id,title,content,category,status,published_at) VALUES(1,'Fixture','<script>unsafe draft</script>',$1,'draft','2099-01-01')`, [f.name === 'news' ? 'news' : f.name]);
    }
    const reset = () => { contentCalls = 0; transactions = 0; parsing = 0; files = 0; contentSql.length = 0; };
    return { ...fixture, app, staff, access, headers, token: login.token, reset, db,
      stats: () => ({ contentCalls, transactions, parsing, files, clockCalls }), contentSql,
      setNow: (value: Date) => { now = value; },
      unavailable: (value: boolean) => { accessUnavailable = value; },
      cleanup: async () => { await app!.close(); await fixture.cleanup(); } };
  } catch (error) { await app?.close(); await fixture.cleanup(); throw error; }
}

test('all eight canonical reads and 28 holds resolve current actor and grants before Content access', async () => {
  const f = await setup();
  try {
    const routes = [...reads, ...heldRoutes];
    const check = async (status: number, headers?: Record<string,string>) => {
      for (const route of routes) {
        f.reset();
        const result = await f.app.inject({ ...route, headers });
        assert.equal(result.statusCode, status, `${route.method} ${route.url}: ${result.body}`);
        assert.equal(result.headers['cache-control'], 'no-store');
        assert.equal(result.body.includes('fixture-private-SQL-failure'), false);
        assert.equal(f.stats().contentCalls, 0);
        assert.equal(f.stats().transactions, 0);
      }
    };
    await check(401);
    for (const route of routes) {
      const result = await f.app.inject({ ...route, headers: f.headers });
      assert.equal(result.statusCode, route.method === 'GET' ? 200 : 503, route.url);
    }
    // The same JWT loses the owning capability on the very next request.
    await f.db.query("UPDATE role_permissions SET is_active=false WHERE role='editor'");
    await check(403, f.headers);
    await f.db.query("UPDATE role_permissions SET is_active=true WHERE role='editor'");
    await f.db.query("INSERT INTO roles(name) VALUES('fixture_viewer')");
    await f.db.query("UPDATE users SET role='fixture_viewer' WHERE id=$1", [f.staff.id]);
    await check(403, f.headers);
    await f.db.query("UPDATE users SET role='editor' WHERE id=$1", [f.staff.id]);
    await f.db.query('UPDATE users SET active=false WHERE id=$1', [f.staff.id]);
    await check(401, f.headers);
    await f.db.query('UPDATE users SET active=true WHERE id=$1', [f.staff.id]);
    await f.db.query('UPDATE staff_sessions SET revoked_at=$1', [fixedNow]);
    await check(401, f.headers);
    await f.db.query('UPDATE staff_sessions SET revoked_at=NULL');
    f.unavailable(true);
    await check(503, f.headers);
    f.unavailable(false);
    // News grants do not authorize products; product grants do not authorize article families.
    for (const capability of ['manage_news','manage_product']) {
      await f.db.query('UPDATE role_permissions SET is_active=(permission_key=$1)', [capability]);
      for (const route of routes) {
        const owns = route.url.includes('/products') === (capability === 'manage_product');
        const result = await f.app.inject({ ...route, headers: f.headers });
        assert.equal(result.statusCode, owns ? route.method === 'GET' ? 200 : 503 : 403, route.url);
      }
    }
    await f.db.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT DO NOTHING");
    await f.db.query("UPDATE users SET role='admin' WHERE id=$1", [f.staff.id]);
    await f.db.query('UPDATE role_permissions SET is_active=false');
    for (const route of routes) {
      const result = await f.app.inject({ ...route, headers: f.headers });
      assert.equal(result.statusCode, route.method === 'GET' ? 200 : 503, `reserved admin ${route.url}`);
    }
    f.setNow(new Date('2026-10-15T20:00:00.000Z'));
    await check(401, f.headers);
    assert.ok(f.stats().clockCalls > 0);
  } finally { await f.cleanup(); }
});

test('all held mutations and exact legacy uploads guard and return 503 before JSON/multipart parsing or Content SQL', async () => {
  const f = await setup();
  try {
    for (const route of heldRoutes) {
      for (const [type, payload] of [
        ['application/json', '{"actor":{"role":"admin"},"imageUrl":"https://existing.invalid/a",'],
        ['multipart/form-data; boundary=broken', '--broken\r\nContent-Disposition: form-data; name="anything"; filename="asset.png"\r\n\r\nUNFINISHED'],
      ]) {
        for (const state of ['anonymous','denied','allowed'] as const) {
          await f.db.query('UPDATE role_permissions SET is_active=$1', [state !== 'denied']);
          f.reset();
          const result = await f.app.inject({ ...route, headers: { ...(state === 'anonymous' ? {} : f.headers), 'content-type': type }, payload });
          assert.equal(result.statusCode, state === 'anonymous' ? 401 : state === 'denied' ? 403 : 503, `${route.method} ${route.url} ${state} ${type}: ${result.body}`);
          assert.deepEqual({ ...f.stats(), clockCalls: 0 }, { contentCalls: 0, transactions: 0, parsing: 0, files: 0, clockCalls: 0 });
        }
      }
      // Invalid held mutation IDs and client actor claims do not trigger validation or business reads.
      const result = await f.app.inject({ ...route, url: route.url.replace(/\/1$/, '/1x'), headers: f.headers, payload: { actor: { role: 'admin' }, userId: 1, permissions: ['manage_news'], imageUrl: 'https://existing.invalid/asset' } });
      assert.equal(result.statusCode, 503, route.url);
      assert.equal(f.stats().contentCalls, 0);
      assert.equal(f.stats().parsing, 0);
    }
    for (const family of families) {
      for (const url of [`/api/${family.name}`, `/api/${family.name}/1`]) {
        assert.equal((await f.app.inject({ method: 'GET', url, headers: f.headers })).statusCode, 404);
        assert.equal((await f.app.inject({ method: 'GET', url })).statusCode, 404);
      }
      assert.equal((await f.app.inject({ method: 'POST', url: `/api/admin/content/${family.name}/upload-image`, headers: f.headers })).statusCode, 404);
    }
  } finally { await f.cleanup(); }
});

test('canonical read IDs and queries are strict, guarded, and detail absence is 404', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      const base = `/api/admin/content/${family.name}`;
      for (const suffix of ['/0','/-1','/+1','/1.0','/1x','/2147483648']) {
        f.reset();
        assert.equal((await f.app.inject({ method: 'GET', url: base + suffix, headers: f.headers })).statusCode, 400, base + suffix);
        assert.equal(f.stats().contentCalls, 0);
      }
      for (const query of ['page=0','page=-1','page=1.2','page=01','page=1&page=2','pageSize=101','pageSize=0','pageSize=1.2','pageSize=01','q=a&q=b','category=a&category=b','page=9007199254740991&pageSize=100','direction=desc','sort=id&direction=DESC','sort=id%3BDROP%20TABLE%20news','search=x','userId=1','actor=admin','q=' + 'x'.repeat(201),'category=','category=' + 'x'.repeat(101)]) {
        f.reset();
        assert.equal((await f.app.inject({ method: 'GET', url: `${base}?${query}`, headers: f.headers })).statusCode, 400, `${base}?${query}`);
        assert.equal(f.stats().contentCalls, 0);
      }
      assert.equal((await f.app.inject({ method: 'GET', url: `${base}/1?q=x`, headers: f.headers })).statusCode, 400);
      assert.equal((await f.app.inject({ method: 'GET', url: `${base}/2147483647`, headers: f.headers })).statusCode, 404);
      assert.equal((await f.app.inject({ method: 'GET', url: `${base}?pageSize=100`, headers: f.headers })).statusCode, 200);
    }
    for (const [family, query] of [['news','category=arbitrary'],['news','status=unknown'],['medicine','status=unknown'],['public-project','status=unknown'],['products','status=draft'],['medicine','sort=isHighlight'],['products','sort=title']]) {
      assert.equal((await f.app.inject({ method: 'GET', url: `/api/admin/content/${family}?${query}`, headers: f.headers })).statusCode, 400);
    }
  } finally { await f.cleanup(); }
});

const ajv = new Ajv({ strict: true });
const ids = (response: { json: () => any }) => response.json().items.map((row: {id:number}) => row.id);

test('real PostgreSQL collections apply matching filters/counts, literal q, stable/null sorting and strict projected DTOs', async () => {
  const f = await setup();
  try {
    for (const family of families) {
      await f.db.query(`ALTER TABLE ${family.table} ADD COLUMN fixture_secret text DEFAULT 'private-original';`);
      await f.db.query(`DELETE FROM ${family.table}`);
      if (family.name === 'products') {
        await f.db.query(`INSERT INTO products(id,name,category,price,image_url,description,created_at,updated_at) VALUES
          (1,'1 A 100%_\\ literal','open category','10.00',NULL,NULL,'2025-01-01',NULL),
          (2,'2 a 100%_\\ literal','open category','2.00','display','detail','2025-01-01','2025-02-01'),
          (3,'3 A 100abX literal','other','-0.10',NULL,NULL,NULL,NULL),
          (4,'4 Z last','open category','-2.10',NULL,NULL,'2024-01-01',NULL)`);
      } else {
        const category = family.name === 'news' ? 'news' : 'open category';
        await f.db.query(`INSERT INTO ${family.table}(id,title,content,excerpt,thumbnail_url,category,status,created_at,updated_at,published_at${family.name === 'news' ? ',is_highlight' : ''}) VALUES
          (1,'1 A 100%_\\ literal','<script>future draft</script>',NULL,NULL,$1,'draft','2025-01-01',NULL,'2099-01-01'${family.name === 'news' ? ',true' : ''}),
          (2,'2 a 100%_\\ literal','body','excerpt','display',$1,'published','2025-01-01','2025-02-01','2099-01-01'${family.name === 'news' ? ',true' : ''}),
          (3,'3 A 100abX literal','body',NULL,NULL,$2,'published',NULL,NULL,NULL${family.name === 'news' ? ',NULL' : ''}),
          (4,'4 Z last','body',NULL,NULL,$1,'published','2024-01-01',NULL,'2024-01-01'${family.name === 'news' ? ',false' : ''})`, [category, family.name === 'news' ? 'procurement' : 'other']);
      }
      const base = `/api/admin/content/${family.name}`;
      const get = (query = '') => f.app.inject({ method: 'GET', url: base + query, headers: f.headers });
      const all = await get();
      assert.equal(all.statusCode, 200, all.body);
      assert.deepEqual(ids(all), [1,2,4,3], `${family.name} default nulls/ties`);
      assert.deepEqual([all.json().total, all.json().page, all.json().pageSize], [4,1,10]);
      const summarySchema = (contracts as any)[`${family.prefix}AdminSummarySchema`];
      const detailSchema = (contracts as any)[`${family.prefix}AdminDetailSchema`];
      for (const row of all.json().items) {
        assert.equal(ajv.validate(summarySchema, row), true, JSON.stringify(ajv.errors));
        assert.equal('content' in row, false); assert.equal('description' in row, false); assert.equal('fixture_secret' in row, false);
      }
      const detail = await f.app.inject({ method: 'GET', url: `${base}/1`, headers: f.headers });
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(ajv.validate(detailSchema, detail.json()), true, JSON.stringify(ajv.errors));
      assert.equal(detail.json().createdAt, '2025-01-01T00:00:00.000Z');
      assert.equal(detail.json().updatedAt, null);
      assert.equal('fixture_secret' in detail.json(), false);
      if (family.name === 'products') { assert.equal(detail.json().price, '10.00'); assert.equal(detail.json().description, null); assert.equal(detail.json().imageUrl, null); }
      else { assert.equal(detail.json().content, ''); assert.equal(detail.json().excerpt, null); assert.equal(detail.json().thumbnailUrl, null); assert.equal(detail.json().publishedAt, '2099-01-01T00:00:00.000Z'); }
      for (const q of ['%','_','\\','100%_\\','a 100%_\\']) {
        const filtered = await get(`?q=${encodeURIComponent(q)}`);
        assert.deepEqual(ids(filtered), [1,2], `${family.name} literal ${q}: ${filtered.body}`);
        assert.equal(filtered.json().total, 2);
      }
      const category = family.name === 'news' ? 'news' : 'open category';
      const filtered = await get(`?category=${encodeURIComponent(category)}&q=${encodeURIComponent('100%_\\')}&pageSize=1&page=2${family.name === 'products' ? '' : '&status=published'}`);
      assert.equal(filtered.json().total, family.name === 'products' ? 2 : 1);
      assert.deepEqual(ids(filtered), family.name === 'products' ? [2] : []);
      const empty = await get('?page=100'); assert.deepEqual(empty.json(), { items: [], total: 4, page: 100, pageSize: 10 });
      assert.deepEqual(ids(await get('?sort=id&direction=desc')), [4,3,2,1]);
      assert.deepEqual(ids(await get('?sort=createdAt&direction=asc')), [4,1,2,3]);
      assert.deepEqual(ids(await get('?sort=updatedAt&direction=desc')), [2,1,3,4]);
      const sorts = family.name === 'products' ? ['name','category','price'] : ['title','publishedAt', ...(family.name === 'news' ? ['isHighlight'] : [])];
      for (const sort of sorts) assert.equal((await get(`?sort=${sort}`)).statusCode, 200, `${family.name} ${sort}`);
      const display = family.name === 'products' ? 'name' : 'title';
      assert.deepEqual(ids(await get(`?sort=${display}&direction=asc`)), [1,2,3,4]);
      assert.deepEqual(ids(await get(`?sort=${display}&direction=desc`)), [4,3,2,1]);
      const exactCategory = await get(`?category=${encodeURIComponent(category.toUpperCase())}`);
      if (family.name === 'news') assert.equal(exactCategory.statusCode, 400);
      else assert.equal(exactCategory.json().total, 0);
      assert.equal((await get(`?q=${encodeURIComponent("' OR TRUE --")}`)).json().total, 0);
      if (family.name === 'products') {
        assert.deepEqual(ids(await get('?sort=category&direction=asc')), [1,2,4,3]);
        assert.deepEqual(ids(await get('?sort=price&direction=asc')), [4,3,2,1]);
        assert.deepEqual(ids(await get('?sort=price&direction=desc')), [1,2,3,4]);
      } else {
        assert.deepEqual(ids(await get('?sort=publishedAt&direction=desc')), [1,2,4,3]);
        if (family.name === 'news') assert.deepEqual(ids(await get('?sort=isHighlight&direction=asc')), [4,1,2,3]);
      }
    }
    assert.ok(f.contentSql.every(sql => !/SELECT\s+\*/i.test(sql)));
    assert.equal(f.stats().transactions, 0);
    await f.db.query('ALTER TABLE news RENAME TO fixture_unavailable_news');
    const unavailable = await f.app.inject({ method: 'GET', url: '/api/admin/content/news', headers: f.headers });
    assert.equal(unavailable.statusCode, 503);
    assert.deepEqual(unavailable.json(), { message: 'Content temporarily unavailable' });
  } finally { await f.cleanup(); }
});


test('stored zone-free timestamps preserve legacy UTC instants in every family summary and detail', async t => {
  const f = await setup();
  try {
    for (const family of families) await t.test(family.name, async () => {
      const article = family.name !== 'products';
      await f.db.query(`UPDATE ${family.table} SET created_at='2025-01-01 00:00:00.123', updated_at='2025-02-01 23:45:06.789'${article ? ", published_at='2099-01-01 00:00:00.345'" : ''} WHERE id=1`);
      if (article) await f.db.query(`INSERT INTO ${family.table}(id,title,content,category,created_at,updated_at,published_at) VALUES(2,'Null timestamps','body',$1,NULL,NULL,NULL)`, [family.name === 'news' ? 'news' : 'free category']);
      else await f.db.query("INSERT INTO products(id,name,category,price,created_at,updated_at) VALUES(2,'Null timestamps','free category','0.00',NULL,NULL)");
      const timestamps = (row: Record<string, unknown>) => ({
        id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt,
        ...(article ? { publishedAt: row.publishedAt } : {}),
      });
      const expected = [
        { id: 1, createdAt: '2025-01-01T00:00:00.123Z', updatedAt: '2025-02-01T23:45:06.789Z', ...(article ? { publishedAt: '2099-01-01T00:00:00.345Z' } : {}) },
        { id: 2, createdAt: null, updatedAt: null, ...(article ? { publishedAt: null } : {}) },
      ];
      const list = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}?sort=id`, headers: f.headers });
      assert.equal(list.statusCode, 200, list.body);
      assert.deepEqual(list.json().items.map(timestamps), expected);
      for (const row of expected) {
        const detail = await f.app.inject({ method: 'GET', url: `/api/admin/content/${family.name}/${row.id}`, headers: f.headers });
        assert.equal(detail.statusCode, 200, detail.body);
        assert.deepEqual(timestamps(detail.json()), row);
      }
    });
  } finally { await f.cleanup(); }
});
