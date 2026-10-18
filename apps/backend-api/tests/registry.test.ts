import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { generateDrizzleJson } from 'drizzle-kit/api';
import * as contracts from '@pharmacy/contracts/registry';
import { buildApp } from '../src/app';
import { createRegistryService, parseRegistryQuery } from '../src/modules/registry';
import * as registrySchema from '../src/modules/registry/schema';
import * as centralSchema from '../src/db/schema';
import { accessFixture, fakePassword, seedStaff } from './fixtures/access';

const ajv = new Ajv({ strict: true });

test('Registry owns pharmacists metadata with only additive nullable preservation columns', async () => {
  const baseline = JSON.parse(readFileSync('drizzle/meta/0008_snapshot.json', 'utf8'));
  const generated = generateDrizzleJson(registrySchema) as any;
  assert.deepEqual(Object.keys(generated.tables), ['public.pharmacists']);
  const table = JSON.parse(JSON.stringify(generated.tables['public.pharmacists']));
  assert.deepEqual(table.columns.prefix, { name: 'prefix', type: 'text', primaryKey: false, notNull: false });
  assert.deepEqual(table.columns.citizen_id, { name: 'citizen_id', type: 'text', primaryKey: false, notNull: false });
  delete table.columns.prefix;
  delete table.columns.citizen_id;
  assert.deepEqual(table, baseline.tables['public.pharmacists']);
  assert.equal(centralSchema.pharmacists, registrySchema.pharmacists);
});

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query('ALTER TABLE pharmacists ADD COLUMN prefix text, ADD COLUMN citizen_id text');
    await fixture.db.query(`INSERT INTO pharmacists(name,registration_id,province,status,address,expiry_date,image_url,prefix,citizen_id)
      SELECT 'Same', 'license'||n,
        CASE WHEN n%3=0 THEN ' Chiang Mai ' WHEN n%2=0 THEN 'Bangkok' ELSE NULL END,
        CASE WHEN n%2=0 THEN 'active' ELSE 'inactive' END,
        'private-address-'||n, CASE WHEN n%4=0 THEN NULL ELSE '2570-01-01' END,
        CASE WHEN n=1 THEN '/media/pharmacist-1.jpg' ELSE NULL END, 'ภก.', 'citizen-secret-'||n
      FROM generate_series(1,123) n`);
    const staff = await seedStaff(fixture.db, 'registry_editor');
    await fixture.db.query("INSERT INTO permissions(key,label) VALUES ('manage_register','Registry fixture') ON CONFLICT DO NOTHING");
    await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('registry_editor','manage_register',true)");
    const calls: { sql: string; values?: unknown[] }[] = [];
    const db = {
      ...fixture.db,
      query: (sql: string, values?: unknown[]) => {
        calls.push({ sql, values });
        return fixture.db.query(sql, values);
      },
    };
    const app = await buildApp({ ...fixture, db });
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: staff.username, password: fakePassword } });
    assert.equal(login.statusCode, 200, login.body);
    return {
      ...fixture, app, calls, headers: { authorization: `Bearer ${login.json().token}` },
      reset: () => { calls.length = 0; },
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

test('123-row public Registry pages/counts/searches are stable and private-column blind', async () => {
  const f = await setup();
  try {
    const page7 = await f.app.inject({ method: 'GET', url: '/api/pharmacists?page=7&pageSize=10' });
    assert.equal(page7.statusCode, 200, page7.body);
    assert.equal(page7.headers['cache-control'], 'no-store');
    assert.equal(page7.json().total, 123);
    assert.equal(page7.json().items.some((row: { id: number }) => row.id === 61), true);
    assert.equal(ajv.validate(contracts.PharmacistPageSchema, page7.json()), true, JSON.stringify(ajv.errors));
    for (const row of page7.json().items) {
      assert.deepEqual(Object.keys(row), ['id', 'name', 'registrationId', 'province', 'status', 'expiryDate', 'imageUrl']);
    }
    const search = await f.app.inject({ method: 'GET', url: '/api/pharmacists?q=%20%20license61%20%20' });
    assert.equal(search.json().total, 1);
    assert.equal(search.json().items[0].id, 61);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/pharmacists?province=Chiang%20Mai' })).json().total, 41);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/pharmacists?status=active' })).json().total, 61);
    for (const q of ['private-address-61', 'citizen-secret-61'])
      assert.equal((await f.app.inject({ method: 'GET', url: `/api/pharmacists?q=${q}` })).json().total, 0);
    const publicSql = f.calls.filter(call => /FROM pharmacists/.test(call.sql));
    assert.ok(publicSql.length > 0);
    assert.ok(publicSql.every(call => !/citizen_id|address|SELECT \*/.test(call.sql)));
    const outside = await f.app.inject({ method: 'GET', url: '/api/pharmacists?page=99&pageSize=10' });
    assert.deepEqual(outside.json(), { items: [], total: 123, page: 99, pageSize: 10 });
    const stats = await f.app.inject({ method: 'GET', url: '/api/pharmacists/stats' });
    assert.deepEqual(stats.json(), { total: 123 });
    assert.ok(f.calls.some(call => call.sql === 'SELECT count(*) AS total FROM pharmacists'));
    assert.equal(stats.headers['cache-control'], 'no-store');
    for (const url of [
      '/api/pharmacists?page=0', '/api/pharmacists?page=-1', '/api/pharmacists?pageSize=101',
      '/api/pharmacists?page=1.5', '/api/pharmacists?sort=id', '/api/pharmacists?direction=desc',
      '/api/pharmacists?q=a&q=b', '/api/pharmacists?unknown=x',
    ]) assert.equal((await f.app.inject({ method: 'GET', url })).statusCode, 400, url);
    assert.deepEqual(parseRegistryQuery({ q: '  license61  ' }).q, 'license61');
  } finally { await f.cleanup(); }
});

test('public detail is safe while current manage_register guards admin detail/list/full-roster filters', async () => {
  const f = await setup();
  try {
    const detail = await f.app.inject({ method: 'GET', url: '/api/pharmacists/1' });
    assert.equal(detail.statusCode, 200);
    assert.equal('address' in detail.json(), false);
    assert.equal('citizenId' in detail.json(), false);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/pharmacists/1?x=1' })).statusCode, 400);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/pharmacists/0' })).statusCode, 400);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/pharmacists/999' })).statusCode, 404);

    const admin = await f.app.inject({ method: 'GET', url: '/api/admin/registry/pharmacists/1', headers: f.headers });
    assert.equal(admin.statusCode, 200, admin.body);
    assert.equal(admin.json().address, 'private-address-1');
    assert.equal('citizenId' in admin.json(), false);
    const filters = await f.app.inject({ method: 'GET', url: '/api/admin/registry/pharmacists/filters', headers: f.headers });
    assert.deepEqual(filters.json(), { provinces: ['Bangkok', 'Chiang Mai'], statuses: ['active', 'inactive'] });
    assert.equal(f.calls.filter(call => /FROM pharmacists/.test(call.sql) && /ARRAY\(SELECT DISTINCT/.test(call.sql)).length, 1);

    f.reset();
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/admin/registry/pharmacists' })).statusCode, 401);
    assert.equal(f.calls.some(call => /pharmacists/.test(call.sql)), false);
    await f.db.query("UPDATE role_permissions SET is_active=false WHERE role='registry_editor' AND permission_key='manage_register'");
    f.reset();
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/admin/registry/pharmacists', headers: f.headers })).statusCode, 403);
    assert.equal(f.calls.some(call => /pharmacists/.test(call.sql)), false);
    await f.db.query("UPDATE role_permissions SET is_active=true WHERE role='registry_editor' AND permission_key='manage_register'");
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/admin/registry/pharmacists?pageSize=100', headers: f.headers })).statusCode, 200);
  } finally { await f.cleanup(); }
});

test('Requests identity and read-only photo authorization ports are exact and private', async () => {
  const f = await setup();
  try {
    const port = createRegistryService(f.db);
    assert.deepEqual(await port.getPharmacistByLicense('license1'), { id: 1, license: 'license1', name: 'Same', status: 'inactive' });
    assert.equal(await port.getPharmacistByLicense('LICENSE1'), null);
    assert.deepEqual(await port.getPhotoOwnerReference(1, 'website-image'), {
      ownerId: 1, ownerExists: true, storedReference: '/media/pharmacist-1.jpg', authorized: true,
    });
    assert.deepEqual(await port.getPhotoOwnerReference(999, 'website-image'), {
      ownerId: 999, ownerExists: false, storedReference: null, authorized: false,
    });
    await assert.rejects(() => port.getPhotoOwnerReference(0, 'website-image'));
    assert.ok(f.calls.every(call => !/citizen_id|address/.test(call.sql) || /ALTER|INSERT/.test(call.sql)));
  } finally { await f.cleanup(); }
});
