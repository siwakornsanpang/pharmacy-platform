import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerConfig } from '../src/config/server';
import { backendEnv } from './fixtures/database';

test('missing_config_does_not_fallback_or_leak', () => {
  assert.throws(() => getServerConfig({}), /DATABASE_URL/);
  const marker = 'secret-marker-must-never-leak';
  assert.throws(() => getServerConfig({ ...backendEnv, DATABASE_URL: marker }), (error: Error) => {
    assert.equal(error.message.includes(marker), false);
    return true;
  });
});

test('media defaults and operator secrets stay outside runtime config', () => {
  const config = getServerConfig({ ...backendEnv, MIGRATION_DATABASE_URL: 'secret-marker' });
  assert.equal(config.uploadMaxBytes, 104857600);
  assert.equal(config.uploadSniffBytes, 65536);
  assert.equal(config.privateAssetTtlSeconds, 300);
  assert.equal(JSON.stringify(config).includes('secret-marker'), false);
});

test('invalid media limits and session TTL fail closed', () => {
  for (const field of ['UPLOAD_MAX_BYTES', 'UPLOAD_SNIFF_BYTES', 'PRIVATE_ASSET_TTL_SECONDS', 'STAFF_SESSION_TTL_SECONDS']) {
    for (const value of ['0', '-1', '1.5', 'NaN', '', '9007199254740992']) {
      assert.throws(() => getServerConfig({ ...backendEnv, [field]: value }), new RegExp(field));
    }
  }
  assert.throws(() => getServerConfig({ ...backendEnv, UPLOAD_MAX_BYTES: '100', UPLOAD_SNIFF_BYTES: '101' }), /UPLOAD_SNIFF_BYTES/);
  assert.throws(() => getServerConfig({ ...backendEnv, UPLOAD_SNIFF_BYTES: '65537' }), /UPLOAD_SNIFF_BYTES/);
});

test('upload URL is a fixed HTTPS origin', () => {
  for (const value of ['http://upload.example.test', 'https://upload.example.test/path', 'https://upload.example.test?key=secret', 'https://user:secret@upload.example.test', 'https://upload.example.test/#hash']) {
    assert.throws(() => getServerConfig({ ...backendEnv, PUBLIC_UPLOAD_BASE_URL: value }), /PUBLIC_UPLOAD_BASE_URL/);
  }
  assert.equal(getServerConfig({ ...backendEnv, PUBLIC_UPLOAD_BASE_URL: 'https://upload.example.test/' }).publicUploadBaseUrl, 'https://upload.example.test');
});

test('application origins reject wildcards, paths, credentials and deployed loopback', () => {
  for (const value of ['*', 'https://*.example.test', 'https://web.example.test/path', 'https://user:secret@web.example.test', 'http://localhost:3000', 'https://127.0.0.1', 'https://localhost.', 'https://127.0.0.2']) {
    assert.throws(() => getServerConfig({ ...backendEnv, CORS_ORIGINS: value }), /CORS_ORIGINS/);
  }
});

test('required security fields and invalid URLs have no fallback', () => {
  for (const name of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE', 'CORS_ORIGINS', 'ACADEMY_BRIDGE_KEY', 'PUBLIC_UPLOAD_BASE_URL']) {
    assert.throws(() => getServerConfig({ ...backendEnv, [name]: undefined }), new RegExp(name));
  }
  assert.throws(() => getServerConfig({ ...backendEnv, JWT_SECRET: 'weak' }), /JWT_SECRET/);
  assert.throws(() => getServerConfig({ ...backendEnv, PORT: '65536' }), /PORT/);
  assert.throws(() => getServerConfig({ ...backendEnv, SUPABASE_URL: 'https://user:secret@storage.example.test' }), /SUPABASE_URL/);
});

test('development HTTP permits actual loopback addresses, never remote 127 DNS names', () => {
  for (const field of ['SUPABASE_URL', 'CORS_ORIGINS']) {
    for (const hostname of ['127.remote.example', '127.0.0.1.evil.test']) {
      assert.throws(() => getServerConfig({ ...backendEnv, NODE_ENV: 'development', [field]: `http://${hostname}:3000` }), new RegExp(field));
    }
    for (const hostname of ['127.0.0.2', '127.1', '[::1]', 'localhost.']) {
      assert.doesNotThrow(() => getServerConfig({ ...backendEnv, NODE_ENV: 'development', [field]: `http://${hostname}:3000` }));
    }
  }
});

test('staff sessions default to eight hours without an override', () => {
  assert.equal(getServerConfig({ ...backendEnv, STAFF_SESSION_TTL_SECONDS: undefined }).staffSessionTtlSeconds, 28800);
});
