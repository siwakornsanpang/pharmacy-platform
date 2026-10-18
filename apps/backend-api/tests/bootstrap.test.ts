import assert from 'node:assert/strict';
import test from 'node:test';
import { accessFixture, fakePassword } from './fixtures/access';
import { barrierDatabase } from './fixtures/access-policy';
test('bootstrap_is_once_and_not_public even with concurrent SQL attempts', async () => {
  const f = await accessFixture();
  try {
    const module = await import('../src/modules/access/bootstrap');
    const db = barrierDatabase(f.db, 2);
    const settled = await Promise.allSettled([module.createInitialAdmin({ username: 'first_fake', password: fakePassword, displayName: 'First' }, { ...f, db }), module.createInitialAdmin({ username: 'second_fake', password: fakePassword, displayName: 'Second' }, { ...f, db })]);
    assert.equal(settled.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND active")).rows[0]?.n, 1);
    assert.equal((await f.db.query('SELECT * FROM role_permissions')).rows.length, 0);
    const audit = (await f.db.query('SELECT details FROM access_audit')).rows[0]?.details;
    assert.ok(audit);
    assert.equal(JSON.stringify(audit).includes(fakePassword), false);
  }
  finally {
    await f.cleanup();
  }
});
test('bootstrap rejects weak and bcrypt-truncated passwords and rolls back failed audit', async () => {
  const f = await accessFixture();
  try {
    const { createInitialAdmin } = await import('../src/modules/access/bootstrap');
    for (const password of ['', 'short', 'ก'.repeat(25)])
      await assert.rejects(createInitialAdmin({ username: 'fake', password, displayName: 'Fake' }, f), { statusCode: 400 });
    await f.db.query(`CREATE FUNCTION fail_fake_bootstrap() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fake'; END $$;CREATE TRIGGER fail_fake_bootstrap BEFORE INSERT ON access_audit FOR EACH ROW EXECUTE FUNCTION fail_fake_bootstrap()`);
    await assert.rejects(createInitialAdmin({ username: 'fake', password: fakePassword, displayName: 'Fake' }, f));
    assert.equal((await f.db.query('SELECT * FROM users')).rows.length, 0);
    assert.equal((await f.db.query("SELECT * FROM roles WHERE name='admin'")).rows.length, 0);
  }
  finally {
    await f.cleanup();
  }
});
test('staff CLI import is inert and refuses noninteractive input and password arguments without leaking config', async () => {
  const { spawnSync } = await import('node:child_process');
  const { resolve } = await import('node:path');
  const cli = resolve(__dirname, '../scripts/staff-create.ts');
  const imported = spawnSync(process.execPath, ['--import', 'tsx', '-e', `require(${JSON.stringify(cli)})`], { encoding: 'utf8', env: { ...process.env, MIGRATION_DATABASE_URL: 'invalid-sensitive-marker' } });
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout + imported.stderr, '');
  for (const args of [[], ['--username', 'fake', '--display-name', 'Fake'], ['--username', 'fake', '--display-name', 'Fake', '--password', 'secret-marker']]) {
    const r = spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { encoding: 'utf8', env: { ...process.env, MIGRATION_DATABASE_URL: 'invalid-sensitive-marker', PASSWORD: 'secret-marker' } });
    assert.equal(r.status, 1);
    assert.equal((r.stdout + r.stderr).includes('marker'), false);
  }
});
test('hidden TTY prompt never echoes password and restores terminal on acceptance and cancellation', async () => {
  const { spawnSync } = await import('node:child_process');
  const { resolve } = await import('node:path');
  const cli = resolve(__dirname, '../scripts/staff-create.ts');
  // Exercise only the prompt in an isolated pseudo-terminal; never invoke the bootstrap CLI.
  const python = `
import json, os, pty, select, subprocess, sys, termios, time
node, cli = sys.argv[1:]
for cancel in (False, True):
  master, slave = pty.openpty()
  flags_before = termios.tcgetattr(slave)[3]
  code = 'const {hiddenPassword}=require(' + json.dumps(cli) + '); hiddenPassword().then(p=>{if(p!=="fake-tty-password")process.exitCode=2; console.log("accepted:"+process.stdin.isRaw)}).catch(()=>console.log("cancelled:"+process.stdin.isRaw));'
  child = subprocess.Popen([node, '--import', 'tsx', '-e', code], stdin=slave, stdout=slave, stderr=slave)
  output = b''
  sent = False
  deadline = time.monotonic() + 5
  while child.poll() is None:
    ready, _, _ = select.select([master], [], [], 0.1)
    if not ready:
      if child.poll() is not None:
        break
      if time.monotonic() > deadline:
        child.kill()
        raise AssertionError('prompt timeout')
      continue
    output += os.read(master, 4096)
    if b'Initial admin password (hidden): ' in output and not sent:
      os.write(master, b'fake-tty-password' + (b'\\x03' if cancel else b'\\r'))
      sent = True
  while select.select([master], [], [], 0)[0]:
    output += os.read(master,4096)
  assert child.returncode == 0, output
  assert b'fake-tty-password' not in output, output
  assert (b'cancelled:false' if cancel else b'accepted:false') in output, output
  flags_after = termios.tcgetattr(slave)[3]
  assert flags_before & (termios.ECHO | termios.ICANON) == flags_after & (termios.ECHO | termios.ICANON)
  os.close(master)
  os.close(slave)
`;
  const result = spawnSync('/usr/bin/python3', ['-c', python, process.execPath, cli], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
});
