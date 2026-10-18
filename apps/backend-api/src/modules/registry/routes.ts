import {
  AdminPharmacistPageSchema, AdminPharmacistSchema, PharmacistPageSchema, PublicPharmacistSchema,
  RegistryFiltersSchema, RegistryStatsSchema,
} from '@pharmacy/contracts/registry';
import { CAPABILITY } from '@pharmacy/contracts/access';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Ajv from 'ajv';
import { AccessError } from '../access/guards';
import { createRegistryService, type RegistryDependencies } from './public';
import { parseRegistryId, parseRegistryQuery, RegistryQueryError } from './queries';

const ErrorSchema = {
  type: 'object', properties: { message: { type: 'string' } },
  required: ['message'], additionalProperties: false,
} as const;

function registryError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AccessError || error instanceof RegistryQueryError)
    return reply.code(error.statusCode).send({ message: error.message });
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
  if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
  return reply.code(503).send({ message: 'Registry temporarily unavailable' });
}
function noDetailQuery(request: FastifyRequest) {
  if (Object.keys(request.query as object).length) throw new RegistryQueryError('Detail queries are unsupported');
}

export async function registerRegistryRoutes(app: FastifyInstance, deps: RegistryDependencies) {
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    const validator = new Ajv({ strict: true, coerceTypes: false, removeAdditional: false });
    owned.setValidatorCompiler(({ schema }) => validator.compile(schema));
    owned.setErrorHandler(registryError);
    const registry = createRegistryService(deps.db);
    const guard = deps.access.requireCapability(CAPABILITY.MANAGE_REGISTER);

    owned.get('/api/pharmacists', { schema: { response: { 200: PharmacistPageSchema } } }, async request =>
      registry.listPublic(parseRegistryQuery(request.query)));
    owned.get('/api/pharmacists/stats', { schema: { response: { 200: RegistryStatsSchema } } }, async request => {
      noDetailQuery(request);
      return registry.stats();
    });
    owned.get('/api/pharmacists/:id', { schema: { response: { 200: PublicPharmacistSchema, 404: ErrorSchema } } }, async (request, reply) => {
      noDetailQuery(request);
      const row = await registry.publicDetail(parseRegistryId((request.params as { id: string }).id));
      return row ?? reply.code(404).send({ message: 'Pharmacist not found' });
    });

    owned.get('/api/admin/registry/pharmacists', {
      preHandler: guard, schema: { response: { 200: AdminPharmacistPageSchema } },
    }, async request => registry.listAdmin(parseRegistryQuery(request.query)));
    owned.get('/api/admin/registry/pharmacists/filters', {
      preHandler: guard, schema: { response: { 200: RegistryFiltersSchema } },
    }, async request => {
      noDetailQuery(request);
      return registry.filters();
    });
    owned.get('/api/admin/registry/pharmacists/:id', {
      preHandler: guard, schema: { response: { 200: AdminPharmacistSchema, 404: ErrorSchema } },
    }, async (request, reply) => {
      noDetailQuery(request);
      const row = await registry.adminDetail(parseRegistryId((request.params as { id: string }).id));
      return row ?? reply.code(404).send({ message: 'Pharmacist not found' });
    });
  });
}
