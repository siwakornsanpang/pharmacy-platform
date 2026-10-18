import assert from 'node:assert/strict';
import test from 'node:test';
import Ajv from 'ajv';
import * as registry from '../src/registry.js';

const ajv = new Ajv({ strict: true });
const publicRow = {
  id: 1, name: 'Fixture', registrationId: 'license-1', province: null,
  status: null, expiryDate: null, imageUrl: null,
};

test('Registry publishes exact strict public/admin projections and bounded pages', () => {
  assert.equal(ajv.validate(registry.PublicPharmacistSchema, publicRow), true);
  assert.equal(ajv.validate(registry.PublicPharmacistSchema, { ...publicRow, address: 'private' }), false);
  assert.equal(ajv.validate(registry.PublicPharmacistSchema, { ...publicRow, citizenId: 'private' }), false);
  assert.equal(ajv.validate(registry.AdminPharmacistSchema, { ...publicRow, address: null }), true);
  assert.equal(ajv.validate(registry.PharmacistPageSchema, { items: [publicRow], total: 123, page: 1, pageSize: 10 }), true);
  assert.equal(ajv.validate(registry.PharmacistPageSchema, { items: [], total: 0, page: 0, pageSize: 10 }), false);
});

test('Registry query, identity, stats and filter contracts are finite', () => {
  assert.equal(ajv.validate(registry.RegistryListQuerySchema, { page: 1, pageSize: 100, q: ' x ', province: 'Bangkok', status: 'active', sort: 'license', direction: 'desc' }), true);
  for (const value of [{ page: '1' }, { pageSize: 101 }, { sort: 'id' }, { direction: 'down' }, { unknown: 'x' }])
    assert.equal(ajv.validate(registry.RegistryListQuerySchema, value), false);
  assert.equal(ajv.validate(registry.RegistryIdentitySchema, { id: 1, license: 'license-1', name: 'Fixture', status: null }), true);
  assert.equal(ajv.validate(registry.RegistryIdentitySchema, { ...publicRow, license: 'license-1' }), false);
  assert.equal(ajv.validate(registry.RegistryStatsSchema, { total: 123 }), true);
  assert.equal(ajv.validate(registry.RegistryFiltersSchema, { provinces: ['A'], statuses: ['active'] }), true);
});
