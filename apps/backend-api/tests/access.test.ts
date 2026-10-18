import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app';
import { accessFixture, fakePassword, fixedNow, seedStaff, guardTestDatabase } from './fixtures/access';

async function setup(role = 'editor') {
  const fixture = await accessFixture();
  const staff = await seedStaff(fixture.db, role);
  const app = await buildApp(fixture);
  const login = () => app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: staff.username, password: fakePassword } });
  return { ...fixture, staff, app, login, cleanup: async () => { await app.close(); await fixture.cleanup(); } };
}

const authorized = (token: string) => ({ authorization: `Bearer ${token}` });

test('test fixture rejects remote or non-disposable database URLs', () => {
  for (const value of ['postgresql://localhost/pharmacy', 'postgresql://remote.example/pharmacy_test_fake', 'postgresql://localhost/pharmacy_test_fake?host=remote']) assert.throws(() => guardTestDatabase(value));
});

test('login persists a fixed lifetime session without storing bearer credentials', async () => {
  const f = await setup();
  try {
    const response = await f.login();
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    const result = response.json();
    assert.equal(result.expiresAt, '2026-10-15T20:00:00.000Z');
    assert.deepEqual(result.user.permissions, ['manage_news']);
    assert.equal(JSON.stringify(result.user).includes('password'), false);
    const claims = f.app.jwt.decode<Record<string, unknown>>(result.token)!;
    assert.equal(claims.iat, Math.floor(fixedNow.getTime() / 1000));
    assert.equal(claims.exp, 1792094400);
    const session = (await f.db.query('SELECT * FROM staff_sessions')).rows[0]!;
    assert.equal(new Date(session.expires_at as string).toISOString(), result.expiresAt);
    assert.equal(JSON.stringify(session).includes(result.token), false);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(result.token) })).statusCode, 200);
    assert.equal((await f.db.query('SELECT action FROM access_audit')).rows[0]?.action, 'staff.login');
  } finally { await f.cleanup(); }
});

test('revoked_deleted_disabled_and_expired_are_401', async () => {
  const f = await setup();
  try {
    for (const action of ['revoked', 'session_deleted', 'disabled', 'expired', 'account_deleted']) {
      const response = await f.login(); assert.equal(response.statusCode, 200);
      const token = response.json().token;
      if (action === 'revoked') await f.db.query('UPDATE staff_sessions SET revoked_at=$1', [fixedNow]);
      if (action === 'session_deleted') await f.db.query('DELETE FROM staff_sessions');
      if (action === 'disabled') await f.db.query('UPDATE users SET active=false');
      if (action === 'expired') await f.db.query('UPDATE staff_sessions SET expires_at=$1', [fixedNow]);
      if (action === 'account_deleted') await f.db.query('DELETE FROM users');
      assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 401, action);
      if (action === 'disabled') await f.db.query('UPDATE users SET active=true');
    }
  } finally { await f.cleanup(); }
});

test('wrong_issuer_audience_algorithm_are_401', async () => {
  const f = await setup();
  try {
    const response = await f.login(); assert.equal(response.statusCode, 200);
    const claims = f.app.jwt.decode<Record<string, unknown>>(response.json().token)!;
    for (const options of [{ iss: 'wrong' }, { aud: 'wrong' }, { algorithm: 'HS384' as const }, { key: 'another-fake-secret-at-least-32-characters' }]) {
      const token = f.app.jwt.sign(claims, options);
      assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 401);
    }
    for (const changed of [{ iat: 1792065601 }, { exp: 1792065600 }, { userId: '1' }, { sessionId: '' }, { nbf: 1792065601 }]) {
      // Bypass default expiresIn so deliberately expired claims stay expired.
      const token = f.app.jwt.sign({ ...claims, ...changed }, {});
      assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 401);
    }
  } finally { await f.cleanup(); }
});

test('invalid login is generic, including disabled accounts', async () => {
  const f = await setup();
  try {
    const bodies = [];
    for (const payload of [{ username: 'unknown', password: fakePassword }, { username: f.staff.username, password: 'wrong' }]) {
      const response = await f.app.inject({ method: 'POST', url: '/api/auth/login', payload });
      assert.equal(response.statusCode, 401); bodies.push(response.json());
    }
    await f.db.query('UPDATE users SET active=false');
    const response = await f.login(); assert.equal(response.statusCode, 401); bodies.push(response.json());
    assert.deepEqual(bodies[0], bodies[1]); assert.deepEqual(bodies[1], bodies[2]);
    assert.equal((await f.db.query('SELECT * FROM staff_sessions')).rows.length, 0);
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 1 } })).statusCode, 400);
  } finally { await f.cleanup(); }
});

test('logout revokes once and is idempotent', async () => {
  const f = await setup();
  try {
    const response = await f.login(); assert.equal(response.statusCode, 200);
    const token = response.json().token;
    for (let i = 0; i < 2; i++) assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/logout', headers: authorized(token) })).statusCode, 200);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 401);
    assert.equal((await f.db.query("SELECT * FROM access_audit WHERE action='staff.logout'")).rows.length, 1);
    await f.db.query('DELETE FROM users');
    assert.equal((await f.db.query('SELECT actor_username FROM access_audit ORDER BY id')).rows[0]?.actor_username, f.staff.username);
  } finally { await f.cleanup(); }
});

test('role_demotion_applies_to_existing_jwt and stored sessions; unknown keys fail closed even for admin', async () => {
  const f = await setup('admin');
  try {
    const { createAccessService } = await import('../src/modules/access/service');
    const service = createAccessService(f, f.app.jwt);
    f.app.get('/test/news', { preHandler: service.requireCapability('manage_news') }, async request => request.staffActor);
    f.app.get('/test/unknown', { preHandler: service.requireCapability('unknown_legacy' as never) }, async () => ({ success: true }));
    const response = await f.login(); assert.equal(response.statusCode, 200);
    const token = response.json().token;
    const claims = f.app.jwt.decode<{ sessionId: string }>(token)!;
    assert.equal((await f.app.inject({ method: 'GET', url: '/test/news', headers: authorized(token) })).statusCode, 200);
    assert.equal((await f.app.inject({ method: 'GET', url: '/test/unknown', headers: authorized(token) })).statusCode, 403);
    await f.db.query("INSERT INTO roles(name) VALUES ('viewer') ON CONFLICT DO NOTHING");
    await f.db.query("UPDATE users SET role='viewer'");
    assert.equal((await f.app.inject({ method: 'GET', url: '/test/news', headers: authorized(token) })).statusCode, 403);
    assert.deepEqual((await service.resolveStaffActor(token)).permissions, []);
    assert.deepEqual((await service.resolveStoredStaffSession(f.staff.id, claims.sessionId)).permissions, []);
    await assert.rejects(service.resolveStoredStaffSession(f.staff.id + 1, claims.sessionId), { statusCode: 401 });
    await f.db.query("INSERT INTO permissions(key,label) VALUES ('view_dashboard','Fake dashboard')");
    await f.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('viewer','view_dashboard',true),('viewer','view_dashboard',true),('viewer','unknown_legacy',false)");
    assert.deepEqual((await service.resolveStaffActor(token)).permissions, ['view_dashboard']);
    assert.deepEqual((await service.resolveStoredStaffSession(f.staff.id, claims.sessionId)).permissions, ['view_dashboard']);
    await f.db.query("DELETE FROM role_permissions WHERE role='viewer'");
    assert.deepEqual((await service.resolveStaffActor(token)).permissions, []);
  } finally { await f.cleanup(); }
});

test('database failures produce sanitized 503, distinct from invalid credentials', async () => {
  const f = await setup();
  try {
    const response = await f.login(); assert.equal(response.statusCode, 200);
    await f.db.query('ALTER TABLE users RENAME TO unavailable_fake_users');
    for (const request of [
      { method: 'GET' as const, url: '/api/auth/me', headers: authorized(response.json().token) },
      { method: 'POST' as const, url: '/api/auth/login', payload: { username: f.staff.username, password: fakePassword } },
      { method: 'POST' as const, url: '/api/auth/logout', headers: authorized(response.json().token) },
    ]) {
      const unavailable = await f.app.inject(request);
      assert.equal(unavailable.statusCode, 503);
      assert.deepEqual(unavailable.json(), { message: 'Staff access temporarily unavailable' });
      assert.equal(unavailable.headers['cache-control'], 'no-store');
    }
  } finally { await f.cleanup(); }
});

test('stored session resolver independently rejects each invalid current state', async () => {
  for (const sql of ['UPDATE users SET active=false', 'UPDATE staff_sessions SET revoked_at=now()', "UPDATE staff_sessions SET expires_at='2000-01-01'", 'DELETE FROM staff_sessions', 'DELETE FROM users', 'DELETE FROM roles']) {
    const f = await setup();
    try {
      const { createAccessService } = await import('../src/modules/access/service');
      const service = createAccessService(f, f.app.jwt);
      const response = await f.login(); assert.equal(response.statusCode, 200);
      const sessionId = f.app.jwt.decode<{ sessionId: string }>(response.json().token)!.sessionId;
      assert.equal((await service.resolveStoredStaffSession(f.staff.id, sessionId)).id, f.staff.id);
      await f.db.query(sql);
      await assert.rejects(service.resolveStoredStaffSession(f.staff.id, sessionId), { statusCode: 401 });
    } finally { await f.cleanup(); }
  }
});

test('login and logout roll back session changes when their audit write fails', async () => {
  const f = await setup();
  try {
    await f.db.query(`CREATE FUNCTION fail_fake_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fake-sensitive-SQL-marker'; END $$;
      CREATE TRIGGER fail_fake_audit BEFORE INSERT ON access_audit FOR EACH ROW EXECUTE FUNCTION fail_fake_audit()`);
    const failed = await f.login(); assert.equal(failed.statusCode, 503);
    assert.equal(failed.body.includes('fake-sensitive-SQL-marker'), false);
    assert.equal((await f.db.query('SELECT * FROM staff_sessions')).rows.length, 0);
    await f.db.query('ALTER TABLE access_audit DISABLE TRIGGER fail_fake_audit');
    const login = await f.login(); assert.equal(login.statusCode, 200);
    await f.db.query('ALTER TABLE access_audit ENABLE TRIGGER fail_fake_audit');
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/logout', headers: authorized(login.json().token) })).statusCode, 503);
    assert.equal((await f.db.query('SELECT revoked_at FROM staff_sessions')).rows[0]?.revoked_at, null);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(login.json().token) })).statusCode, 200);
  } finally { await f.cleanup(); }
});

test('capability guard sanitizes SQL failure for later domain routes', async () => {
  const f = await setup();
  try {
    const { createAccessService } = await import('../src/modules/access/service');
    const service = createAccessService(f, f.app.jwt);
    f.app.get('/test/guard-unavailable', { preHandler: service.requireCapability('manage_news') }, async () => ({ success: true }));
    const login = await f.login(); assert.equal(login.statusCode, 200);
    await f.db.query('ALTER TABLE users RENAME TO unavailable_fake_users');
    const response = await f.app.inject({ method: 'GET', url: '/test/guard-unavailable', headers: authorized(login.json().token) });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().message, 'Staff access temporarily unavailable');
    assert.equal(response.body.includes('relation'), false);
  } finally { await f.cleanup(); }
});

test('the injected clock expires JWT and persisted sessions at the same instant', async () => {
  const f = await accessFixture();
  const staff = await seedStaff(f.db);
  let now = fixedNow;
  const app = await buildApp({ ...f, clock: () => now });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: staff.username, password: fakePassword } });
    assert.equal(response.statusCode, 200);
    const token = response.json().token;
    now = new Date('2026-10-15T19:59:59.999Z');
    assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 200);
    now = new Date('2026-10-15T20:00:00.000Z');
    assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) })).statusCode, 401);
    const { createAccessService } = await import('../src/modules/access/service');
    const service = createAccessService({ ...f, clock: () => now }, app.jwt);
    const sessionId = app.jwt.decode<{ sessionId: string }>(token)!.sessionId;
    await assert.rejects(service.resolveStoredStaffSession(staff.id, sessionId), { statusCode: 401 });
  } finally { await app.close(); await f.cleanup(); }
});

test('recognized dormant grants remain denied after permission metadata updates', async () => {
  const f = await setup();
  try {
    const login = await f.login(); assert.equal(login.statusCode, 200);
    const token = login.json().token;
    await f.db.query("UPDATE role_permissions SET is_active=false WHERE permission_key='manage_news'");
    const before = await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) });
    assert.deepEqual(before.json().permissions, []);
    await f.db.query("UPDATE permissions SET label='Reviewed new metadata',\"group\"='Future catalog' WHERE key='manage_news'");
    const after = await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: authorized(token) });
    assert.deepEqual(after.json().permissions, []);
    assert.equal((await f.db.query("SELECT is_active FROM role_permissions WHERE permission_key='manage_news'")).rows[0]?.is_active, false);
  } finally { await f.cleanup(); }
});
