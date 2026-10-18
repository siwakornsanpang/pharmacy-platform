import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { getServerConfig } from '../../src/lib/config/server';

vi.mock('server-only', () => ({}));

  test(`backoffice: missing_config_does_not_fallback_or_leak`, () => {
    assert.throws(() => getServerConfig({}), /BACKEND_API_URL/);
    assert.throws(() => getServerConfig({ BACKEND_API_URL: 'https://backend.example.test' }), /BACKOFFICE_ORIGIN/);
    const marker = 'secret-marker';
    assert.throws(() => getServerConfig({ BACKEND_API_URL: `https://user:${marker}@backend.example.test`, BACKOFFICE_ORIGIN: 'https://app.example.test' }), (error: Error) => {
      assert.equal(error.message.includes(marker), false);
      return true;
    });
    const config = getServerConfig({ NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test/', BACKOFFICE_ORIGIN: 'https://app.example.test' });
    assert.equal(config.backendApiUrl, 'https://backend.example.test');
    assert.equal(config.jsonMetadataMaxBytes, 4000000);
  });

  test(`backoffice: deployment_rejects_local_bypass`, () => {
    for (const nodeEnv of ['production', 'test', 'preview']) {
      assert.throws(() => getServerConfig({ NODE_ENV: nodeEnv, BACKEND_API_URL: 'http://127.0.0.1:8080', BACKOFFICE_ORIGIN: 'http://localhost:3000', ALLOW_LOCAL_UI_BYPASS: 'true', ISOLATED_LOCAL_MODE: 'true' }));
    }
    for (const origin of ['*', 'https://*.example.test', 'https://app.example.test/path', 'https://app.example.test?x=1', 'http://app.example.test', 'https://localhost', 'https://localhost.', 'https://127.0.0.2']) {
      assert.throws(() => getServerConfig({ NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test', BACKOFFICE_ORIGIN: origin }));
    }
    assert.throws(() => getServerConfig({ NODE_ENV: 'production', BACKEND_API_URL: 'http://localhost:8080', BACKOFFICE_ORIGIN: 'https://app.example.test' }));
  });
test('backoffice bypass requires development, two loopback URLs and explicit isolation', () => {
  const local = { NODE_ENV: 'development', BACKEND_API_URL: 'http://127.0.0.1:8080', BACKOFFICE_ORIGIN: 'http://localhost:3000', ALLOW_LOCAL_UI_BYPASS: 'true', ISOLATED_LOCAL_MODE: 'true' };
  assert.equal(getServerConfig(local).allowLocalUiBypass, true);
  for (const override of [{ ISOLATED_LOCAL_MODE: 'false' }, { BACKEND_API_URL: 'https://backend.example.test' }, { BACKOFFICE_ORIGIN: 'https://app.example.test' }, { ALLOW_LOCAL_UI_BYPASS: 'yes' }]) {
    assert.throws(() => getServerConfig({ ...local, ...override }));
  }
});

test('remote 127 DNS origins cannot enable local bypass or development HTTP', () => {
  const local = { NODE_ENV: 'development', BACKEND_API_URL: 'http://127.0.0.1:8080', BACKOFFICE_ORIGIN: 'http://localhost:3000', ALLOW_LOCAL_UI_BYPASS: 'true', ISOLATED_LOCAL_MODE: 'true' };
  for (const field of ['BACKEND_API_URL', 'BACKOFFICE_ORIGIN']) {
    for (const hostname of ['127.remote.example', '127.0.0.1.evil.test']) {
      assert.throws(() => getServerConfig({ ...local, [field]: `https://${hostname}` }), /ALLOW_LOCAL_UI_BYPASS/);
      assert.equal(getServerConfig({ ...local, [field]: `https://${hostname}`, ALLOW_LOCAL_UI_BYPASS: 'false' }).allowLocalUiBypass, false);
      assert.throws(() => getServerConfig({ ...local, [field]: `http://${hostname}`, ALLOW_LOCAL_UI_BYPASS: 'false' }), new RegExp(field));
    }
    for (const hostname of ['127.0.0.2', '127.1', '[::1]', 'localhost.']) {
      assert.equal(getServerConfig({ ...local, [field]: `http://${hostname}:3000` }).allowLocalUiBypass, true);
    }
  }
});
