import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app';
import { barrierDatabase } from './fixtures/access-policy';
import { accessFixture, seedStaff, fakePassword } from './fixtures/access';
import { syncCapabilityCatalog } from '../src/modules/access/catalog';
import { capabilityCatalog } from '@pharmacy/contracts/access';
async function setup() {
  const f = await accessFixture();
  await syncCapabilityCatalog(f.db, capabilityCatalog);
  const admin = await seedStaff(f.db, 'admin');
  const delegate = await seedStaff(f.db, 'delegate');
  await f.db.query("INSERT INTO roles(name) VALUES ('strong'),('weak'); INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('delegate','manage_users',true),('delegate','manage_roles',true),('strong','manage_home',true),('weak','manage_news',true)");
  const app = await buildApp(f);
  async function headers(staff = admin) { const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: staff.username, password: fakePassword } }); assert.equal(r.statusCode, 200); return { authorization: `Bearer ${r.json().token}` }; }
  return { ...f, admin, delegate, app, headers, cleanup: async () => { await app.close(); await f.cleanup(); } };
}
test('delegate_cannot_assign_admin_or_stronger_role and lifecycle bounds include current role and password resets', async () => {
  const f = await setup();
  try {
    const headers = await f.headers(f.delegate);
    const strong = await seedStaff(f.db, 'strong');
    for (const role of ['admin', 'strong'])
      assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/users', headers, payload: { username: `fake_${role}`, password: fakePassword, role } })).statusCode, 403);
    for (const payload of [{ role: 'weak' }, { password: fakePassword }, { displayName: 'Changed' }, { isActive: false }])
      assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${strong.id}`, headers, payload })).statusCode, 403);
    assert.equal((await f.app.inject({ method: 'DELETE', url: `/api/auth/users/${strong.id}`, headers })).statusCode, 403);
    await f.db.query("UPDATE role_permissions SET is_active=false WHERE role='delegate' AND permission_key='manage_roles'");
    const choices = await f.app.inject({ method: 'GET', url: '/api/auth/assignable-roles', headers });
    assert.equal(choices.statusCode, 200);
    assert.deepEqual(choices.json().map((r: any) => r.role), ['delegate', 'viewer', 'weak']);
  }
  finally {
    await f.cleanup();
  }
});
test('self_escalation_and_reserved_bulk_edits_are_403 and malformed requests are rejected', async () => {
  const f = await setup();
  try {
    const headers = await f.headers(f.delegate);
    for (const [role, permissions] of [['delegate', ['manage_home']], ['admin', []], ['strong', []]] as const)
      assert.equal((await f.app.inject({ method: 'PUT', url: `/api/permissions/roles/${role}`, headers, payload: { permissions } })).statusCode, 403);
    const adminHeaders = await f.headers();
    for (const method of ['PUT', 'DELETE'] as const)
      assert.equal((await f.app.inject({ method, url: '/api/permissions/roles/admin', headers: adminHeaders, ...(method === 'PUT' ? { payload: { permissions: [] } } : {}) })).statusCode, 403);
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers: adminHeaders, payload: { role: 'admin' } })).statusCode, 403);
    for (const payload of [{ role: 'bad', permissions: ['invented'] }, { role: 'bad', extra: true }])
      assert.equal((await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers: adminHeaders, payload })).statusCode, 400);
    assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${f.delegate.id}`, headers: adminHeaders, payload: { username: 'forbidden' } })).statusCode, 400);
    for (const [method, url] of [['POST', '/api/auth/seed'], ['POST', '/api/permissions/seed'], ['POST', '/api/permissions'], ['DELETE', '/api/permissions/manage_news']] as const)
      assert.equal((await f.app.inject({ method, url, headers: adminHeaders })).statusCode, 404);
  }
  finally {
    await f.cleanup();
  }
});
test('grant selections preserve IDs and inert data; deletion does not resurrect orphan role metadata', async () => {
  const f = await setup();
  try {
    const headers = await f.headers();
    await f.db.query("DELETE FROM permissions WHERE key='manage_home'");
    await f.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('weak','manage_news',false),('weak','legacy',false),('weak','absent',false),('weak','manage_home',true),('weak','manage_home',false)");
    const before = (await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows;
    assert.equal((await f.app.inject({ method: 'PUT', url: '/api/permissions/roles/weak', headers, payload: { permissions: ['manage_news'] } })).statusCode, 200);
    const selected = (await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows;
    assert.deepEqual(selected.map(r => r.id), before.map(r => r.id));
    assert.ok(selected.filter(r => r.permission_key === 'manage_news').every(r => r.is_active === true));
    assert.deepEqual(selected.filter(r => r.permission_key !== 'manage_news'), before.filter(r => r.permission_key !== 'manage_news'));
    assert.equal((await f.app.inject({ method: 'PUT', url: '/api/permissions/roles/weak', headers, payload: { permissions: [] } })).statusCode, 200);
    const saved = (await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows;
    assert.deepEqual(saved.filter(r => r.permission_key !== 'manage_news'), before.filter(r => r.permission_key !== 'manage_news'));
    assert.ok(saved.filter(r => r.permission_key === 'manage_news').every(r => r.is_active === false));
    assert.equal((await f.app.inject({ method: 'DELETE', url: '/api/permissions/roles/weak', headers })).statusCode, 200);
    assert.deepEqual((await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows, saved);
    assert.deepEqual((await f.db.query("SELECT id FROM role_permissions WHERE role='weak' ORDER BY id")).rows.map(r => r.id), before.map(r => r.id));
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/permissions/roles', headers })).json().some((r: any) => r.role === 'weak'), false);
    const created = await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers, payload: { role: 'empty' } });
    assert.equal(created.statusCode, 200);
    assert.deepEqual((await f.app.inject({ method: 'GET', url: '/api/permissions/roles/empty', headers })).json(), []);
  }
  finally {
    await f.cleanup();
  }
});
test('password_change_revokes_all_sessions and disabling cannot revive old tokens; audit contains safe changes', async () => {
  const f = await setup();
  try {
    const target = await seedStaff(f.db, 'weak');
    const old1 = await f.headers(target);
    const old2 = await f.headers(target);
    const headers = await f.headers();
    assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${target.id}`, headers, payload: { password: 'new-fake-password-long' } })).statusCode, 200);
    for (const old of [old1, old2])
      assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: old })).statusCode, 401);
    const disabledToken = await f.headers(f.delegate);
    for (const isActive of [false, true])
      assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${f.delegate.id}`, headers, payload: { isActive } })).statusCode, 200);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: disabledToken })).statusCode, 401);
    const audit = (await f.db.query("SELECT details FROM access_audit WHERE action='staff.user.update' ORDER BY id")).rows;
    assert.deepEqual(audit[0]?.details, { targetUserId: target.id, changedKeys: ['password'] });
    assert.equal(JSON.stringify(audit).includes('new-fake'), false);
  }
  finally {
    await f.cleanup();
  }
});
test('two_admin_removals_preserve_one_active_admin under independent SQL transactions', async () => {
  const f = await setup();
  const second = await seedStaff(f.db, 'admin');
  const h1 = await f.headers();
  const h2 = await f.headers(second);
  const app = await buildApp({ ...f, db: barrierDatabase(f.db, 2) });
  try {
    const results = await Promise.all([app.inject({ method: 'PUT', url: `/api/auth/users/${f.admin.id}`, headers: h1, payload: { isActive: false } }), app.inject({ method: 'PUT', url: `/api/auth/users/${second.id}`, headers: h2, payload: { role: 'viewer' } })]);
    assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 403]);
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND active")).rows[0]?.n, 1);
  }
  finally {
    await app.close();
    await f.cleanup();
  }
});
test('actor grants and session are rechecked after lock, and audit failure rolls back every mutation', async () => {
  const f = await setup();
  try {
    const headers = await f.headers(f.delegate);
    const app = await buildApp({ ...f, db: barrierDatabase(f.db, 1, async () => { await f.db.query("UPDATE role_permissions SET is_active=false WHERE role='delegate' AND permission_key='manage_roles'"); }) });
    try {
      assert.equal((await app.inject({ method: 'POST', url: '/api/permissions/roles', headers, payload: { role: 'late_denied' } })).statusCode, 403);
    }
    finally {
      await app.close();
    }
    const adminHeaders = await f.headers();
    await f.db.query(`CREATE FUNCTION fail_fake_mutation_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action <> 'staff.login' THEN RAISE EXCEPTION 'fake-sensitive-marker'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_fake_mutation_audit BEFORE INSERT ON access_audit FOR EACH ROW EXECUTE FUNCTION fail_fake_mutation_audit()`);
    const r = await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers: adminHeaders, payload: { role: 'rolled_back', permissions: ['manage_news'] } });
    assert.equal(r.statusCode, 503);
    assert.equal(r.body.includes('fake-sensitive-marker'), false);
    assert.equal((await f.db.query("SELECT name FROM roles WHERE name IN ('rolled_back','late_denied')")).rows.length, 0);
    assert.equal((await f.db.query("SELECT * FROM role_permissions WHERE role='rolled_back'")).rows.length, 0);
    const token = await f.headers(f.delegate);
    assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${f.delegate.id}`, headers: adminHeaders, payload: { password: 'changed-fake-long-password', isActive: false } })).statusCode, 503);
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: token })).statusCode, 200);
  }
  finally {
    await f.cleanup();
  }
});
test('last active admin cannot be removed through delete, disable or demotion', async () => {
  const f = await setup();
  try {
    const headers = await f.headers();
    for (const payload of [{ isActive: false }, { role: 'viewer' }]) {
      const response = await f.app.inject({ method: 'PUT', url: `/api/auth/users/${f.admin.id}`, headers, payload });
      assert.equal(response.statusCode, 403);
    }
    assert.equal((await f.app.inject({ method: 'DELETE', url: `/api/auth/users/${f.admin.id}`, headers })).statusCode, 403);
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND active")).rows[0]?.n, 1);
  }
  finally {
    await f.cleanup();
  }
});
test('concurrent cross-admin deletions preserve one admin and reject the deleted actor', async () => {
  const f = await setup();
  const second = await seedStaff(f.db, 'admin');
  const h1 = await f.headers();
  const h2 = await f.headers(second);
  const app = await buildApp({ ...f, db: barrierDatabase(f.db, 2) });
  try {
    const results = await Promise.all([
      app.inject({ method: 'DELETE', url: `/api/auth/users/${second.id}`, headers: h1 }),
      app.inject({ method: 'DELETE', url: `/api/auth/users/${f.admin.id}`, headers: h2 }),
    ]);
    assert.deepEqual(results.map(result => result.statusCode).sort(), [200, 401]);
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND active")).rows[0]?.n, 1);
  }
  finally {
    await app.close();
    await f.cleanup();
  }
});
test('stale actor session, account and role state cannot authorize after serialization', async () => {
  for (const [sql, status] of [
    ["UPDATE staff_sessions SET revoked_at=now() WHERE user_id=$1", 401],
    ["UPDATE users SET active=false WHERE id=$1", 401],
    ["UPDATE users SET role='viewer' WHERE id=$1", 403],
    ["DELETE FROM roles WHERE name='admin'", 401],
  ] as const) {
    const f = await setup();
    try {
      const headers = await f.headers();
      const app = await buildApp({ ...f, db: barrierDatabase(f.db, 1, async () => {
          await f.db.query(sql, sql.includes('$1') ? [f.admin.id] : undefined);
        }) });
      try {
        const response = await app.inject({ method: 'POST', url: '/api/auth/users', headers,
          payload: { username: 'late_fake', password: fakePassword, role: 'weak' } });
        assert.equal(response.statusCode, status, sql);
        assert.equal((await f.db.query("SELECT * FROM users WHERE username='late_fake'")).rows.length, 0);
      }
      finally {
        await app.close();
      }
    }
    finally {
      await f.cleanup();
    }
  }
});
test('missing definitions and audit failures leave no partial user, role, grant or credential changes', async () => {
  const f = await setup();
  try {
    const headers = await f.headers();
    await f.db.query("DELETE FROM permissions WHERE key='manage_home'");
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers,
      payload: { role: 'missing_definition', permissions: ['manage_home'] } })).statusCode, 400);
    assert.equal((await f.db.query("SELECT * FROM roles WHERE name='missing_definition'")).rows.length, 0);
    const before = (await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows;
    await f.db.query(`CREATE FUNCTION fail_more_fake_audit() RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN IF NEW.action <> 'staff.login' THEN RAISE EXCEPTION 'fake-private-detail'; END IF; RETURN NEW; END $$;
   CREATE TRIGGER fail_more_fake_audit BEFORE INSERT ON access_audit FOR EACH ROW EXECUTE FUNCTION fail_more_fake_audit()`);
    for (const [method, url, payload] of [
      ['POST', '/api/auth/users', { username: 'rolled_back_user', password: fakePassword, role: 'weak' }],
      ['DELETE', `/api/auth/users/${f.delegate.id}`, undefined],
      ['PUT', `/api/auth/users/${f.delegate.id}`, { password: 'another-fake-long-password' }],
      ['PUT', '/api/permissions/roles/weak', { permissions: [] }],
      ['DELETE', '/api/permissions/roles/weak', undefined],
    ] as const) {
      const response = await f.app.inject({ method, url, headers, ...(payload ? { payload } : {}) });
      assert.equal(response.statusCode, 503);
      assert.equal(response.body.includes('fake-private-detail'), false);
    }
    assert.equal((await f.db.query("SELECT * FROM users WHERE username='rolled_back_user'")).rows.length, 0);
    assert.equal((await f.db.query('SELECT * FROM users WHERE id=$1', [f.delegate.id])).rows.length, 1);
    assert.equal((await f.db.query("SELECT * FROM roles WHERE name='weak'")).rows.length, 1);
    assert.deepEqual((await f.db.query("SELECT * FROM role_permissions WHERE role='weak' ORDER BY id")).rows, before);
    await f.headers(f.delegate); // Original password still works after rollback.
  }
  finally {
    await f.cleanup();
  }
});
test('only exact current admin authority manages admin users; assignments use recognized grants and defined roles', async () => {
  const f = await setup();
  try {
    await f.db.query("INSERT INTO roles(name) VALUES ('Admin'),('labelled'); INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('labelled','unknown_authority',true)");
    const fakeAdmin = await seedStaff(f.db, 'Admin');
    const headers = await f.headers(fakeAdmin);
    const spoofed = f.app.jwt.sign({ ...f.app.jwt.decode<any>(headers.authorization.slice(7)), role: 'admin', permissions: ['manage_users'] });
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/users', headers: { authorization: `Bearer ${spoofed}` },
      payload: { username: 'not_an_admin', password: fakePassword, role: 'admin' } })).statusCode, 403);
    const delegateHeaders = await f.headers(f.delegate);
    const selected = await f.app.inject({ method: 'GET', url: '/api/auth/assignable-roles', headers: delegateHeaders });
    assert.ok(selected.json().some((row: {
      role: string;
    }) => row.role === 'labelled'));
    assert.equal((await f.app.inject({ method: 'POST', url: '/api/auth/users', headers: delegateHeaders,
      payload: { username: 'undefined_role_fake', password: fakePassword, role: 'no_such_role' } })).statusCode, 400);
    for (const method of ['PUT', 'DELETE'] as const) {
      assert.equal((await f.app.inject({ method, url: `/api/auth/users/${f.admin.id}`, headers: delegateHeaders,
        ...(method === 'PUT' ? { payload: { password: fakePassword } } : {}) })).statusCode, 403);
    }
    const adminHeaders = await f.headers();
    const response = await f.app.inject({ method: 'POST', url: '/api/auth/users', headers: adminHeaders,
      payload: { username: 'next_admin_fake', displayName: 'Next', password: fakePassword, role: 'admin' } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.role, 'admin');
    assert.equal(JSON.stringify(response.json()).includes('hash'), false);
  }
  finally {
    await f.cleanup();
  }
});
test('delete mutations reject unknown body fields without changing target state', async () => {
  const f = await setup();
  try {
    const headers = await f.headers();
    for (const url of [`/api/auth/users/${f.delegate.id}`, '/api/permissions/roles/weak']) {
      const response = await f.app.inject({ method: 'DELETE', url, headers, payload: { unexpected: true } });
      assert.equal(response.statusCode, 400);
    }
    assert.equal((await f.db.query('SELECT id FROM users WHERE id=$1', [f.delegate.id])).rows.length, 1);
    assert.equal((await f.db.query("SELECT name FROM roles WHERE name='weak'")).rows.length, 1);
  }
  finally {
    await f.cleanup();
  }
});
test('a login holding its user row commits before disable revokes its new session', async () => {
  const f = await setup();
  const target = await seedStaff(f.db, 'weak');
  const adminHeaders = await f.headers();
  let loginRead!: () => void;
  const atLoginRead = new Promise<void>(resolve => loginRead = resolve);
  let mutationRead!: () => void;
  const atMutationRead = new Promise<void>(resolve => mutationRead = resolve);
  let releaseLogin!: () => void;
  const loginGate = new Promise<void>(resolve => releaseLogin = resolve);
  const pids = new Set<unknown>();
  const db = {
    ...f.db,
    withTransaction: <T>(work: (tx: import('../src/db/client').QueryClient) => Promise<T>) => f.db.withTransaction(tx => work({
      query: async (sql, values) => {
        if (sql.includes('FOR UPDATE OF u')) {
          const result = await tx.query(sql, values);
          pids.add((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0]?.pid);
          loginRead();
          await loginGate;
          return result;
        }
        if (sql.includes('FROM users WHERE id=$1 FOR UPDATE')) {
          pids.add((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0]?.pid);
          mutationRead();
        }
        return tx.query(sql, values);
      },
    })),
  };
  const app = await buildApp({ ...f, db });
  try {
    const login = app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: target.username, password: fakePassword } });
    const loginResult = Promise.resolve(login); // Dispatch before awaiting its row-lock barrier.
    await atLoginRead;
    const disable = app.inject({ method: 'PUT', url: `/api/auth/users/${target.id}`, headers: adminHeaders, payload: { isActive: false } });
    const disableResult = Promise.resolve(disable);
    await atMutationRead;
    assert.equal(pids.size, 2);
    releaseLogin();
    assert.equal((await loginResult).statusCode, 200);
    assert.equal((await disableResult).statusCode, 200);
    const sessions = (await f.db.query('SELECT revoked_at FROM staff_sessions WHERE user_id=$1', [target.id])).rows;
    assert.equal(sessions.length, 1);
    assert.ok(sessions[0]?.revoked_at);
    assert.equal((await f.app.inject({ method: 'PUT', url: `/api/auth/users/${target.id}`, headers: adminHeaders, payload: { isActive: true } })).statusCode, 200);
    const token = (await loginResult).json().token;
    assert.equal((await f.app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } })).statusCode, 401);
  }
  finally {
    releaseLogin();
    await app.close();
    await f.cleanup();
  }
});

test('optional role selections accept omission but reject explicit null', async () => {
  const f = await setup();
  try {
  const headers = await f.headers();
  assert.equal((await f.app.inject({ method: 'POST', url: '/api/permissions/roles', headers,
   payload: { role: 'null_selection', permissions: null } })).statusCode, 400);
  assert.equal((await f.db.query("SELECT name FROM roles WHERE name='null_selection'")).rows.length, 0);
  } finally { await f.cleanup(); }
});
