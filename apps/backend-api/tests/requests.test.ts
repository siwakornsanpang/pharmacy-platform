import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import type { Database, QueryClient } from '../src/db/client';
import { buildApp } from '../src/app';
import { fixedNow, accessFixture, fakePassword, seedStaff } from './fixtures/access';
import * as centralSchema from '../src/db/schema';
import * as requestsSchema from '../src/modules/requests/schema';

const ownedTables = [
  'request_asset_refs', 'request_media_intents', 'request_operation_keys',
  'request_payment_logs', 'request_shipping_details', 'request_tax_invoices', 'requests',
];
const requestSql = new RegExp(`\\b(?:${ownedTables.join('|')})\\b`, 'i');
const id = 'เลขที่/คำขอ-๑';
const encoded = new URLSearchParams({ requestId: id }).toString();
const createBody = {
  id,
  pharmacistLicenseId: 'PHA-1',
  licenseType: 'renewal',
  shippingDetails: { shippingAddress: 'Bangkok', trackingNumber: 'TRACK-1' },
  taxInvoice: {
    taxpayerType: 'individual', taxInvoiceName: 'Fixture Tax', taxIdNumber: '1234567890123',
    branchCode: '00000', registeredTaxAddress: 'Bangkok', taxInvoiceNumber: 'TAX-1',
  },
};
const paymentBody = {
  paymentDate: '2026-10-15T19:00:00+07:00',
  amountPaid: 1250.5,
  paymentMethod: 'qr_payment',
  paymentReferenceId: 'PAY-1',
};

test('Requests owns preserved declarations and stages only its operation-key DDL', async () => {
  const baseline = JSON.parse(readFileSync('drizzle/meta/0008_snapshot.json', 'utf8'));
  const generated = generateDrizzleJson(requestsSchema) as any;
  for (const name of ['requests', 'request_shipping_details', 'request_payment_logs', 'request_tax_invoices'])
    assert.deepEqual(JSON.parse(JSON.stringify(generated.tables[`public.${name}`])), baseline.tables[`public.${name}`], name);
  for (const name of ['request_status', 'payment_method', 'taxpayer_type'])
    assert.deepEqual(JSON.parse(JSON.stringify(generated.enums[`public.${name}`])), baseline.enums[`public.${name}`], name);
  for (const name of [
    'requests', 'requestShippingDetails', 'requestPaymentLogs', 'requestTaxInvoices',
    'requestOperationKeys', 'requestAssetRefs', 'requestMediaIntents',
  ])
    assert.equal((centralSchema as any)[name], (requestsSchema as any)[name], name);
  assert.deepEqual(Object.keys(generated.tables).sort(), ownedTables.map(name => `public.${name}`).sort());
  assert.deepEqual(Object.keys(generated.tables['public.request_operation_keys'].uniqueConstraints),
    ['request_operation_keys_authority_key']);
  const staged = structuredClone(baseline);
  for (const name of ['request_operation_keys', 'request_asset_refs', 'request_media_intents'])
    staged.tables[`public.${name}`] = generated.tables[`public.${name}`];
  const ddl = await generateMigration(baseline, staged);
  assert.equal(ddl.length, 3);
  assert.match(ddl.join('\n'), /CREATE TABLE "request_operation_keys"/);
  assert.match(ddl.join('\n'), /CREATE TABLE "request_asset_refs"/);
  assert.match(ddl.join('\n'), /CREATE TABLE "request_media_intents"/);
  assert.match(ddl[0] + ddl[1] + ddl[2], /UNIQUE\("actor_key","method","route","key"\)/);
});

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query(`CREATE TABLE IF NOT EXISTS request_operation_keys (
      id serial PRIMARY KEY,
      actor_key varchar(100) NOT NULL,
      method varchar(10) NOT NULL,
      route varchar(255) NOT NULL,
      key varchar(128) NOT NULL,
      request_hash varchar(64) NOT NULL,
      result jsonb,
      status integer,
      created_at timestamp DEFAULT now(),
      CONSTRAINT request_operation_keys_authority_key UNIQUE(actor_key,method,route,key)
    )`);
    await fixture.db.query("INSERT INTO pharmacists(name,registration_id,status) VALUES('Exact Pharmacist','PHA-1','active')");
    await fixture.db.query("INSERT INTO permissions(key,label) VALUES('manage_register','Requests fixture') ON CONFLICT DO NOTHING");
    const allowed = await seedStaff(fixture.db, 'requests_editor');
    const other = await seedStaff(fixture.db, 'requests_other');
    const denied = await seedStaff(fixture.db, 'requests_denied');
    const revoked = await seedStaff(fixture.db, 'requests_revoked');
    for (const role of ['requests_editor', 'requests_other', 'requests_revoked'])
      await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES($1,'manage_register',true)", [role]);
    const calls: { sql: string; values?: unknown[] }[] = [];
    const logged = (client: QueryClient): QueryClient => ({
      query: (sql, values) => { calls.push({ sql, values }); return client.query(sql, values); },
    });
    const db: Database = {
      ...logged(fixture.db),
      withTransaction: work => fixture.db.withTransaction(tx => work(logged(tx))),
      close: () => fixture.db.close(),
    };
    const app = await buildApp({ ...fixture, db });
    const errors: Error[] = [];
    app.addHook('onError', async (_request, _reply, error) => { errors.push(error); });
    const login = async (staff: { username: string }) => {
      const response = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { username: staff.username, password: fakePassword },
      });
      assert.equal(response.statusCode, 200, response.body);
      return { authorization: `Bearer ${response.json().token}` };
    };
    const headers = await login(allowed);
    const otherHeaders = await login(other);
    const deniedHeaders = await login(denied);
    const revokedHeaders = await login(revoked);
    await fixture.db.query(`UPDATE staff_sessions SET revoked_at=$1
      WHERE user_id=$2 AND revoked_at IS NULL`, [fixedNow.toISOString(), revoked.id]);
    return {
      ...fixture, app, db, calls, errors, headers, otherHeaders, deniedHeaders, revokedHeaders,
      reset: () => { calls.length = 0; },
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

function mutationHeaders(headers: Record<string, string>, key: string) {
  return { ...headers, 'idempotency-key': key };
}
async function createRequest(f: Awaited<ReturnType<typeof setup>>, requestId = id, key = 'create-key') {
  return f.app.inject({
    method: 'POST', url: '/api/admin/registry/requests',
    headers: mutationHeaders(f.headers, key), payload: { ...createBody, id: requestId },
  });
}

test('canonical create is atomic, UTC-faithful, strict, and replays through the legacy alias', async () => {
  const f = await setup();
  try {
    await f.db.query("ALTER TABLE request_tax_invoices ADD CONSTRAINT request_tax_fixture_failure CHECK(tax_invoice_name <> 'force-tax-failure')");
    const failed = await f.app.inject({
      method: 'POST', url: '/api/admin/registry/requests',
      headers: mutationHeaders(f.headers, 'rollback-key'),
      payload: { ...createBody, id: 'rollback/๑', taxInvoice: { ...createBody.taxInvoice, taxInvoiceName: 'force-tax-failure' } },
    });
    assert.equal(failed.statusCode, 503, failed.body);
    for (const table of ['requests', 'request_shipping_details', 'request_tax_invoices', 'request_operation_keys'])
      assert.equal(Number((await f.db.query(`SELECT count(*) AS count FROM ${table}`)).rows[0]!.count), 0, table);

    const canonical = await createRequest(f);
    assert.equal(canonical.statusCode, 200, canonical.body);
    assert.equal(canonical.headers['cache-control'], 'no-store');
    assert.equal(canonical.json().data.requestDate, fixedNow.toISOString());
    assert.equal(canonical.json().data.createdAt, fixedNow.toISOString());
    const list = await f.app.inject({ method: 'GET', url: '/api/admin/registry/requests?status=draft&q=%E0%B8%84%E0%B8%B3%E0%B8%82%E0%B8%AD', headers: f.headers });
    assert.equal(list.statusCode, 200, list.body);
    assert.deepEqual(list.json().map((row: { id: string }) => row.id), [id]);
    const legacy = await f.app.inject({
      method: 'POST', url: '/api/requests',
      headers: mutationHeaders(f.headers, 'create-key'), payload: createBody,
    });
    assert.equal(legacy.statusCode, 200, legacy.body);
    assert.deepEqual(legacy.json(), canonical.json());
    assert.equal(Number((await f.db.query('SELECT count(*) AS count FROM requests')).rows[0]!.count), 1);
    assert.equal(Number((await f.db.query('SELECT count(*) AS count FROM request_operation_keys')).rows[0]!.count), 1);
    const cors = await f.app.inject({
      method: 'OPTIONS', url: '/api/admin/registry/requests',
      headers: {
        origin: 'https://office.example.test',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,idempotency-key',
      },
    });
    assert.equal(cors.statusCode, 204, cors.body);
    assert.match(cors.headers['access-control-allow-headers'] ?? '', /Idempotency-Key/i);

    for (const payload of [
      { ...createBody, id: 'invalid-extra', actorKey: 'staff:999' },
      { ...createBody, id: 'invalid-enum', taxInvoice: { taxpayerType: 'government' } },
    ]) assert.equal((await f.app.inject({
      method: 'POST', url: '/api/admin/registry/requests',
      headers: mutationHeaders(f.headers, 'strict-' + payload.id), payload,
    })).statusCode, 400);
    assert.equal((await f.app.inject({
      method: 'POST', url: '/api/admin/registry/requests',
      headers: mutationHeaders(f.headers, 'unknown-license'),
      payload: { ...createBody, id: 'unknown', pharmacistLicenseId: 'UNKNOWN' },
    })).statusCode, 404);
  } finally { await f.cleanup(); }
});

test('concurrent/retry payments have one effect and enforce conflict plus authority separation', async () => {
  const f = await setup();
  try {
    assert.equal((await createRequest(f, 'payment-หลัก', 'create-payment')).statusCode, 200);
    assert.equal((await createRequest(f, 'payment-อื่น', 'create-other')).statusCode, 200);
    const target = new URLSearchParams({ requestId: 'payment-หลัก' }).toString();
    const canonical = () => f.app.inject({
      method: 'POST', url: `/api/admin/registry/requests/payments?${target}`,
      headers: mutationHeaders(f.headers, 'shared-payment-key'), payload: paymentBody,
    });
    const legacy = () => f.app.inject({
      method: 'POST', url: '/api/requests/payment-%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%81/payment',
      headers: mutationHeaders(f.headers, 'shared-payment-key'), payload: paymentBody,
    });
    const [first, second] = await Promise.all([canonical(), legacy()]);
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(second.statusCode, 200, second.body);
    assert.deepEqual(first.json(), second.json());
    assert.equal(first.json().data.paymentDate, '2026-10-15T12:00:00.000Z');
    assert.equal((await canonical()).json().data.id, first.json().data.id);
    assert.equal(Number((await f.db.query("SELECT count(*) AS count FROM request_payment_logs WHERE request_id='payment-หลัก'")).rows[0]!.count), 1);
    const conflict = await f.app.inject({
      method: 'POST', url: `/api/admin/registry/requests/payments?${target}`,
      headers: mutationHeaders(f.headers, 'shared-payment-key'),
      payload: { ...paymentBody, paymentReferenceId: 'DIFFERENT' },
    });
    assert.equal(conflict.statusCode, 409, conflict.body);
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/admin/registry/requests/payments?${target}`,
      headers: f.headers, payload: paymentBody,
    })).statusCode, 400);

    const actorSeparated = await f.app.inject({
      method: 'POST', url: `/api/admin/registry/requests/payments?${target}`,
      headers: mutationHeaders(f.otherHeaders, 'shared-payment-key'), payload: paymentBody,
    });
    assert.equal(actorSeparated.statusCode, 200, actorSeparated.body);
    const otherTarget = new URLSearchParams({ requestId: 'payment-อื่น' }).toString();
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/admin/registry/requests/payments?${otherTarget}`,
      headers: mutationHeaders(f.headers, 'shared-payment-key'), payload: paymentBody,
    })).statusCode, 200);
    assert.equal((await f.app.inject({
      method: 'PUT', url: `/api/admin/registry/requests/detail?${target}`,
      headers: mutationHeaders(f.headers, 'shared-payment-key'), payload: { requestStatus: 'pending' },
    })).statusCode, 200);
    assert.equal(Number((await f.db.query('SELECT count(*) AS count FROM request_payment_logs')).rows[0]!.count), 3);
    const paymentList = await f.app.inject({
      method: 'GET', url: `/api/admin/registry/requests/payments?${target}`, headers: f.headers,
    });
    assert.equal(paymentList.statusCode, 200, paymentList.body);
    assert.equal(paymentList.json().length, 2);

    assert.equal((await createRequest(f, 'delete-target', 'create-delete')).statusCode, 200);
    const deleted = await f.app.inject({
      method: 'DELETE', url: '/api/admin/registry/requests/detail?requestId=delete-target',
      headers: mutationHeaders(f.headers, 'delete-key'),
    });
    const deletedReplay = await f.app.inject({
      method: 'DELETE', url: '/api/requests/delete-target',
      headers: mutationHeaders(f.headers, 'delete-key'),
    });
    assert.equal(deleted.statusCode, 200, deleted.body);
    assert.deepEqual(deletedReplay.json(), deleted.json());
    assert.equal((await f.db.query("SELECT id FROM requests WHERE id='delete-target'")).rows.length, 0);
  } finally { await f.cleanup(); }
});

test('opaque query IDs and duplicate children preserve rows while lowest ids are canonical', async () => {
  const f = await setup();
  try {
    assert.equal((await createRequest(f)).statusCode, 200);
    await f.db.query(`INSERT INTO request_shipping_details(request_id,shipping_address,tracking_number)
      VALUES($1,'duplicate shipping','SECOND')`, [id]);
    await f.db.query("INSERT INTO request_tax_invoices(request_id,tax_invoice_name) VALUES($1,'duplicate tax')", [id]);
    await f.db.query(`INSERT INTO request_payment_logs(request_id,payment_date,amount_paid,payment_method,payment_reference_id)
      VALUES($1,'2026-10-15 12:00:00',1,'bank_transfer','B'),($1,'2026-10-15 12:00:00',1,'bank_transfer','C')`, [id]);
    const detail = await f.app.inject({
      method: 'GET', url: `/api/admin/registry/requests/detail?${encoded}`, headers: f.headers,
    });
    assert.equal(detail.statusCode, 200, `${detail.body}\n${f.errors.map(error =>
      `${error.stack}\n${JSON.stringify(Object.fromEntries(Object.entries(error)))}`).join('\n')}`);
    assert.equal(detail.json().id, id);
    assert.equal(detail.json().shippingDetails.shippingAddress, 'Bangkok');
    assert.equal(detail.json().taxInvoice.taxInvoiceName, 'Fixture Tax');
    assert.deepEqual(detail.json().pharmacist, { id: 1, license: 'PHA-1', name: 'Exact Pharmacist', status: 'active' });
    assert.deepEqual(detail.json().paymentLogs.map((row: { paymentReferenceId: string }) => row.paymentReferenceId), ['B', 'C']);

    const updated = await f.app.inject({
      method: 'PUT', url: `/api/admin/registry/requests/detail?${encoded}`,
      headers: mutationHeaders(f.headers, 'update-opaque'),
      payload: {
        shippingDetails: { shippingAddress: 'updated canonical' },
        taxInvoice: { taxInvoiceName: 'updated canonical' },
      },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.deepEqual((await f.db.query('SELECT shipping_address FROM request_shipping_details WHERE request_id=$1 ORDER BY id', [id])).rows,
      [{ shipping_address: 'updated canonical' }, { shipping_address: 'duplicate shipping' }]);
    assert.deepEqual((await f.db.query('SELECT tax_invoice_name FROM request_tax_invoices WHERE request_id=$1 ORDER BY id', [id])).rows,
      [{ tax_invoice_name: 'updated canonical' }, { tax_invoice_name: 'duplicate tax' }]);
    assert.deepEqual((await f.db.query('SELECT tracking_number,taxpayer_type FROM request_shipping_details s JOIN request_tax_invoices t ON s.request_id=t.request_id WHERE s.request_id=$1 ORDER BY s.id,t.id LIMIT 1', [id])).rows,
      [{ tracking_number: 'TRACK-1', taxpayer_type: 'individual' }]);
  } finally { await f.cleanup(); }
});

test('all canonical and legacy routes guard before Requests SQL for anonymous, denied, and revoked actors', async () => {
  const f = await setup();
  try {
    const routes = [
      ['GET', '/api/admin/registry/requests'], ['POST', '/api/admin/registry/requests', createBody],
      ['GET', '/api/admin/registry/requests/detail?requestId=missing'],
      ['PUT', '/api/admin/registry/requests/detail?requestId=missing', { requestStatus: 'pending' }],
      ['DELETE', '/api/admin/registry/requests/detail?requestId=missing'],
      ['GET', '/api/admin/registry/requests/payments?requestId=missing'],
      ['POST', '/api/admin/registry/requests/payments?requestId=missing', paymentBody],
      ['GET', '/api/requests'], ['POST', '/api/requests', createBody],
      ['GET', '/api/requests/missing'], ['PUT', '/api/requests/missing', { requestStatus: 'pending' }],
      ['DELETE', '/api/requests/missing'], ['POST', '/api/requests/missing/payment', paymentBody],
    ] as const;
    for (const [headers, expected] of [[{}, 401], [f.deniedHeaders, 403], [f.revokedHeaders, 401]] as const) {
      for (const [method, url, payload] of routes) {
        f.reset();
        const response = await f.app.inject({
          method, url, headers: mutationHeaders(headers, 'guard-key'),
          ...(payload === undefined ? {} : { payload }),
        });
        assert.equal(response.statusCode, expected, `${method} ${url}: ${response.body}`);
        assert.equal(f.calls.some(call => requestSql.test(call.sql)), false, `${method} ${url}`);
      }
    }
  } finally { await f.cleanup(); }
});

test('missing parents and malformed payment inputs are rejected without effects', async () => {
  const f = await setup();
  try {
    assert.equal((await f.app.inject({
      method: 'GET', url: '/api/admin/registry/requests/detail?requestId=missing', headers: f.headers,
    })).statusCode, 404);
    for (const [method, url, payload] of [
      ['PUT', '/api/admin/registry/requests/detail?requestId=missing', { requestStatus: 'pending' }],
      ['DELETE', '/api/admin/registry/requests/detail?requestId=missing', undefined],
      ['POST', '/api/admin/registry/requests/payments?requestId=missing', paymentBody],
    ] as const) assert.equal((await f.app.inject({
      method, url, headers: mutationHeaders(f.headers, `missing-${method}`),
      ...(payload === undefined ? {} : { payload }),
    })).statusCode, 404);
    assert.equal((await createRequest(f, 'validation', 'create-validation')).statusCode, 200);
    const invalidPayments = [
      { ...paymentBody, amountPaid: -1 },
      { ...paymentBody, amountPaid: '1.00' },
      { ...paymentBody, amountPaid: 1.001 },
      { ...paymentBody, paymentDate: '2026-02-30' },
      { ...paymentBody, paymentMethod: 'cash' },
      { ...paymentBody, privateResult: true },
    ];
    for (const [index, payload] of invalidPayments.entries()) assert.equal((await f.app.inject({
      method: 'POST', url: '/api/admin/registry/requests/payments?requestId=validation',
      headers: mutationHeaders(f.headers, `invalid-${index}`), payload,
    })).statusCode, 400);
    assert.equal(Number((await f.db.query('SELECT count(*) AS count FROM request_payment_logs')).rows[0]!.count), 0);
  } finally { await f.cleanup(); }
});

test('Requests consumes only the public Registry port', () => {
  const files = ['service.ts', 'routes.ts', 'idempotency.ts', 'index.ts'];
  for (const file of files) {
    const source = readFileSync(new URL(`../src/modules/requests/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /registry\/(?:schema|queries|routes|public)|db\/schema/);
  }
  assert.match(readFileSync(new URL('../src/modules/requests/service.ts', import.meta.url), 'utf8'),
    /import type \{ RegistryPort \} from '\.\.\/registry'/);
});
