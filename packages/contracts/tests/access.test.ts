import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPABILITY, capabilityCatalog, isPermissionKey } from '../src/access.js';

test('catalog_has_stable_legacy_keys', () => {
  assert.equal(CAPABILITY.MANAGE_ACADEMY, 'manage_academy');
  assert.equal(isPermissionKey('made_up'), false);
  const keys = capabilityCatalog.map(({ key }) => key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of ['manage_home', 'manage_news', 'manage_council', 'manage_history', 'manage_agency', 'manage_law', 'manage_web_settings', 'manage_register', 'view_dashboard', 'manage_users', 'manage_roles', 'manage_about', 'manage_product', 'manage_service', 'manage_other_service', 'manage_academy', 'manage_web_pharmacist', 'manage_royalcollege', 'manage_eservice', 'manage_tran']) {
    assert.equal(isPermissionKey(key), true, key);
  }
});

test('permission validation rejects malformed and prototype values', () => {
  for (const value of [undefined, null, 0, {}, [], 'constructor', 'toString', '', 'MANAGE_ACADEMY', ' manage_academy']) {
    assert.equal(isPermissionKey(value), false);
  }
  assert.equal(isPermissionKey('manage_academy'), true);
});
