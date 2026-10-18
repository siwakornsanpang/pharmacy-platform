import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const backendSrc = resolve(__dirname, '../src');
const contentRoot = join(backendSrc, 'modules/content');
const requestsRoot = join(backendSrc, 'modules/requests');
const appsRoot = resolve(__dirname, '../../');
const skipped = new Set(['node_modules', '.next', 'dist', 'coverage', 'tests']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    if (skipped.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.[cm]?[jt]sx?$/.test(name) ? [path] : [];
  });
}

function specifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)].map(match => match[1]!);
}

function resolvedModule(file: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  return relative(backendSrc, resolve(dirname(file), specifier)).split('\\').join('/');
}

function isBarrel(path: string, domain: string): boolean {
  return path === `modules/${domain}` || path === `modules/${domain}/index`;
}

test('Requests never reads Registry private tables or schema files', () => {
  const files = walk(requestsRoot);
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const rel = relative(backendSrc, file);
    assert.equal(/\bcitizen_id\b/.test(source), false, rel);
    assert.equal(/\bpharmacists\b/.test(source), false, rel);
    for (const specifier of specifiers(source)) {
      const target = resolvedModule(file, specifier);
      if (!target?.startsWith('modules/registry')) continue;
      assert.equal(isBarrel(target, 'registry'), true, `${rel} imports ${specifier} -> ${target}`);
    }
  }
});

test('Content consumes Media only through the public barrel', () => {
  const files = walk(contentRoot);
  assert.ok(files.length > 0);
  for (const file of files) {
    const rel = relative(backendSrc, file);
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      const target = resolvedModule(file, specifier);
      if (!target?.startsWith('modules/media')) continue;
      assert.equal(isBarrel(target, 'media'), true, `${rel} imports ${specifier} -> ${target}`);
    }
  }
});

test('frontend apps do not embed server secrets or database clients', () => {
  const secret = /DATABASE_URL|JWT_SECRET|JWT_ISSUER|SUPABASE_KEY|drizzle-orm|@supabase\/supabase-js|(?:from|import\()\s*['"]pg['"]/;
  const apps = ['backoffice/src', 'pharmacy-web'];
  const files = apps.flatMap(app => walk(join(appsRoot, app)));
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.equal(secret.test(source), false, relative(appsRoot, file));
  }
});
