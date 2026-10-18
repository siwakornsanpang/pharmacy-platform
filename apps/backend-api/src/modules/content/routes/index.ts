import { registerPublicContentRoutes } from './public';
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import Ajv from 'ajv';
import { AccessError } from '../../access/guards';
import { MediaError } from '../../media';
import type { ContentDependencies } from '../public';
import { ContentQueryError } from '../route-manifest';
import { ContentSingletonError } from '../singleton-service';
import { registerNewsRoutes } from './news';
import { registerMedicineRoutes } from './medicine';
import { registerPublicProjectRoutes } from './publicProject';
import { registerProductRoutes } from './products';
import { registerLawRoutes } from './laws';
import { registerPolicyRoutes } from './policy';
import { registerOtherServiceRoutes } from './otherService';

import { registerCouncilRoutes } from './council';
import { registerHistoryRoutes } from './history';
import { registerAgencyRoutes } from './agencies';
import { registerHonorAwardRoutes } from './honorAwards';
import { registerHonorRoutes } from './honor';
import { registerServiceRoutes } from './services';
import { registerHomeRoutes } from './home';
import { registerPharmacistHomeRoutes } from './pharmacistHome';
import { registerSettingRoutes } from './setting';

/** Task2b only. Public activation and complete factory assembly remain with their owners. */
export async function registerContentArticleRoutes(app: FastifyInstance, deps: ContentDependencies) {
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    owned.setErrorHandler((error, _request, reply) => {
      if (error instanceof AccessError || error instanceof ContentQueryError || error instanceof MediaError)
        return reply.code(error.statusCode).send({ message: error.message });
      if ((error as { statusCode?: number }).statusCode === 429) return reply.code(429).send({ message: 'Too many requests' });
      return reply.code(503).send({ message: 'Content temporarily unavailable' });
    });
    registerNewsRoutes(owned, deps);
    registerMedicineRoutes(owned, deps);
    registerPublicProjectRoutes(owned, deps);
    registerProductRoutes(owned, deps);
  });
}

function handleContentRequestError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AccessError || error instanceof ContentQueryError || error instanceof MediaError || error instanceof ContentSingletonError)
    return reply.code(error.statusCode).send({ message: error.message });
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
  if (status === 413) return reply.code(413).send({ message: 'Request too large' });
  if (status === 415) return reply.code(415).send({ message: 'Unsupported media type' });
  if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
  return reply.code(503).send({ message: 'Content temporarily unavailable' });
}

/** Shared transport only; each family's SQL, DTOs and request adapters stay explicit. */
function configureContentTransport(owned: FastifyInstance) {
  owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
  const validator = new Ajv({ strict: true, coerceTypes: false, removeAdditional: false });
  owned.setValidatorCompiler(({ schema }) => validator.compile(schema));
  owned.setErrorHandler(handleContentRequestError);
}

/** Task2c remains isolated until Task2e assembles the complete staff module. */
export async function registerContentDocumentRoutes(app: FastifyInstance, deps: ContentDependencies) {
  await app.register(async owned => {
    configureContentTransport(owned);
    registerLawRoutes(owned, deps);
    registerPolicyRoutes(owned, deps);
    registerOtherServiceRoutes(owned, deps);
  });
}

/** Task2d stays isolated until Task2e assembles the complete staff module. */
export async function registerContentDirectoryRoutes(app: FastifyInstance, deps: ContentDependencies) {
  await app.register(async owned => {
    configureContentTransport(owned);
    registerCouncilRoutes(owned, deps);
    registerHistoryRoutes(owned, deps);
    registerAgencyRoutes(owned, deps);
    registerHonorAwardRoutes(owned, deps);
    registerHonorRoutes(owned, deps);
    registerServiceRoutes(owned, deps);
  });
}

/** Final staged assembly: one shared transport policy, explicit owned family handlers only. */
export async function registerContentRoutes(app: FastifyInstance, deps: ContentDependencies) {
  await app.register(async owned => {
    configureContentTransport(owned);
    registerNewsRoutes(owned, deps);
    registerMedicineRoutes(owned, deps);
    registerPublicProjectRoutes(owned, deps);
    registerProductRoutes(owned, deps);
    registerLawRoutes(owned, deps);
    registerPolicyRoutes(owned, deps);
    registerOtherServiceRoutes(owned, deps);
    registerCouncilRoutes(owned, deps);
    registerHistoryRoutes(owned, deps);
    registerAgencyRoutes(owned, deps);
    registerHonorAwardRoutes(owned, deps);
    registerHonorRoutes(owned, deps);
    registerServiceRoutes(owned, deps);
    registerHomeRoutes(owned, deps);
    registerPharmacistHomeRoutes(owned, deps);
    registerSettingRoutes(owned, deps);
    registerPublicContentRoutes(owned, deps);
  });
}
