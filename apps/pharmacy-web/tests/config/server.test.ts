import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { getServerConfig } from '../../lib/config/server';

vi.mock('server-only', () => ({}));

  test(`pharmacy: missing_config_does_not_fallback_or_leak`, () => {
    assert.throws(() => getServerConfig({}), /BACKEND_API_URL/);
    assert.throws(() => getServerConfig({ BACKEND_API_URL: 'https://backend.example.test' }), /PHARMACY_WEB_ORIGIN/);
    const marker = 'secret-marker';
    assert.throws(() => getServerConfig({ BACKEND_API_URL: `https://user:${marker}@backend.example.test`, PHARMACY_WEB_ORIGIN: 'https://app.example.test' }), (error: Error) => {
      assert.equal(error.message.includes(marker), false);
      return true;
    });
    const config = getServerConfig({
      NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test/', PHARMACY_WEB_ORIGIN: 'https://app.example.test',
      PHARMACY_SESSION_SECRET: 'fake-pharmacy-session-secret-at-least-32-ch', ACADEMY_BRIDGE_KEY: 'fake-academy-secret',
      CONFERENCE_API_URL: 'https://conference.example.test',
    });
    assert.equal(config.backendApiUrl, 'https://backend.example.test');
    assert.equal(config.conferenceApiUrl, 'https://conference.example.test');
    assert.equal(config.jsonMetadataMaxBytes, 4000000);
    assert.equal(config.pharmacySessionSecret, 'fake-pharmacy-session-secret-at-least-32-ch');
    assert.throws(() => getServerConfig({
      NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test', PHARMACY_WEB_ORIGIN: 'https://app.example.test',
      PHARMACY_SESSION_SECRET: 'fake-pharmacy-session-secret-at-least-32-ch', ACADEMY_BRIDGE_KEY: 'fake-academy-secret',
    }), /CONFERENCE_API_URL/);
    assert.throws(() => getServerConfig({
      NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test', PHARMACY_WEB_ORIGIN: 'https://app.example.test',
      PHARMACY_SESSION_SECRET: 'short', ACADEMY_BRIDGE_KEY: 'fake-academy-secret', CONFERENCE_API_URL: 'https://conference.example.test',
    }), /PHARMACY_SESSION_SECRET/);
  });

  test(`pharmacy: deployment_rejects_local_bypass`, () => {
    for (const nodeEnv of ['production', 'test', 'preview']) {
      assert.throws(() => getServerConfig({ NODE_ENV: nodeEnv, BACKEND_API_URL: 'http://127.0.0.1:8080', PHARMACY_WEB_ORIGIN: 'http://localhost:3000', ALLOW_LOCAL_UI_BYPASS: 'true', ISOLATED_LOCAL_MODE: 'true' }));
    }
    for (const origin of ['*', 'https://*.example.test', 'https://app.example.test/path', 'https://app.example.test?x=1', 'http://app.example.test', 'https://localhost', 'https://localhost.', 'https://127.0.0.2']) {
      assert.throws(() => getServerConfig({ NODE_ENV: 'production', BACKEND_API_URL: 'https://backend.example.test', PHARMACY_WEB_ORIGIN: origin }));
    }
    assert.throws(() => getServerConfig({ NODE_ENV: 'production', BACKEND_API_URL: 'http://localhost:8080', PHARMACY_WEB_ORIGIN: 'https://app.example.test' }));
  });
test('pharmacy never treats staff local UI bypass as pharmacy authorization', () => {
  assert.throws(() => getServerConfig({ NODE_ENV: 'development', BACKEND_API_URL: 'http://127.0.0.1:8080', PHARMACY_WEB_ORIGIN: 'http://localhost:3001', ALLOW_LOCAL_UI_BYPASS: 'true', ISOLATED_LOCAL_MODE: 'true' }), /ALLOW_LOCAL_UI_BYPASS/);
});

test('development HTTP permits actual loopback addresses, never remote 127 DNS names', () => {
  const local = {
    NODE_ENV: 'development', BACKEND_API_URL: 'http://127.0.0.1:8080', PHARMACY_WEB_ORIGIN: 'http://localhost:3001',
    PHARMACY_SESSION_SECRET: 'fake-pharmacy-session-secret-at-least-32-ch', ACADEMY_BRIDGE_KEY: 'fake-academy-secret',
    CONFERENCE_API_URL: 'http://127.0.0.1:8080',
  };
  for (const field of ['BACKEND_API_URL', 'PHARMACY_WEB_ORIGIN']) {
    for (const hostname of ['127.remote.example', '127.0.0.1.evil.test']) {
      assert.throws(() => getServerConfig({ ...local, [field]: `http://${hostname}:3000` }), new RegExp(field));
    }
    for (const hostname of ['127.0.0.2', '127.1', '[::1]', 'localhost.']) {
      assert.doesNotThrow(() => getServerConfig({ ...local, [field]: `http://${hostname}:3000` }));
    }
  }
});
