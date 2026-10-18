import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { getServerConfig, type BackendConfig } from './config/server';
import { createDatabase, type Database } from './db/client';
import { checkDatabaseReadiness } from './db/readiness';
import { createAccessService } from './modules/access/service';
import { registerAccessRoutes } from './modules/access/routes';
import { registerContentRoutes } from './modules/content';
import { createRegistryService, registerRegistryRoutes } from './modules/registry';
import { registerRequestsRoutes } from './modules/requests';
import {
  createMediaAuthorizers, createMediaLifecycle, createMediaService, createUploadIntentService,
  jsonMetadataMaxBytes, registerMediaRoutes, supabaseStorage, type MediaStorage,
} from './modules/media';
import { createContentMediaPort } from './modules/content';
import { createRequestMediaPort } from './modules/requests';
import { createAcademyAuthorizer, createAcademyMediaPort, registerAcademy } from './modules/academy';
import { AccessError, bearerToken } from './modules/access/guards';

export type { BackendConfig } from './config/server';
export type { Database } from './db/client';

export async function buildApp(options: {
  config?: BackendConfig; db?: Database; clock?: () => Date; storage?: MediaStorage;
} = {}): Promise<FastifyInstance> {
  const config = options.config ?? getServerConfig();
  const db = options.db ?? createDatabase(config.databaseUrl);
  const app = Fastify({
    logger: process.env.NODE_TEST_CONTEXT ? false : {
      level: 'info',
      redact: {
        paths: [
          'req.headers.authorization', 'req.headers.cookie', 'req.headers["x-csrf-token"]',
          'req.headers["x-upload-ticket"]', 'req.headers["idempotency-key"]',
        ],
        censor: '[redacted]',
      },
      serializers: {
        req(request) {
          return { method: request.method, url: request.url.split('?')[0], host: request.host };
        },
      },
    },
    bodyLimit: jsonMetadataMaxBytes,
    requestTimeout: 300000,
  });
  if (!options.db) app.addHook('onClose', async () => { await db.close(); });
  try {
    await app.register(jwt, { secret: config.jwtSecret, sign: { iss: config.jwtIssuer, aud: config.jwtAudience, expiresIn: config.staffSessionTtlSeconds }, verify: { algorithms: ['HS256'], allowedIss: config.jwtIssuer, allowedAud: config.jwtAudience } });
    await app.register(cors, { origin: (origin, callback) => callback(null, Boolean(origin && config.corsOrigins.includes(origin))), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-upload-ticket'] });
    await app.register(multipart, { limits: { fileSize: config.uploadMaxBytes } });
    const accessDependencies = { db, config, clock: options.clock ?? (() => new Date()) };
    const access = createAccessService(accessDependencies, app.jwt);
    const registry = createRegistryService(db);
    const storage = options.storage ?? supabaseStorage(config);
    const authorizers = createMediaAuthorizers(registry);
    authorizers.academy = createAcademyAuthorizer(db);
    const media = createMediaService({ db, config, clock: accessDependencies.clock, storage, authorizers });
    const uploads = createUploadIntentService({
      db, config, clock: accessDependencies.clock, media, authorizers, access,
    });
    const lifecycle = createMediaLifecycle({
      db, clock: accessDependencies.clock, storage,
      ownerPorts: {
        content: createContentMediaPort(db),
        requests: createRequestMediaPort(db),
        academy: createAcademyMediaPort(db),
      },
    });
    await registerAccessRoutes(app, access, accessDependencies);
    await registerContentRoutes(app, { ...accessDependencies, access, media: lifecycle, uploads });
    await registerRegistryRoutes(app, { db, access });
    await registerRequestsRoutes(app, { db, access, clock: accessDependencies.clock, registry });
    await registerMediaRoutes(app, {
      config, clock: accessDependencies.clock, media, uploads,
      readStaff: async request => {
        try { bearerToken(request); }
        catch (error) { if (error instanceof AccessError && error.statusCode === 401) return null; throw error; }
        return access.resolveStaffActor(bearerToken(request));
      },
    });
    await registerAcademy(app, { ...accessDependencies, access, media: lifecycle, uploads, downloads: media });
    app.get('/health', async () => ({ status: 'ok' }));
    app.get('/ready', async (_request, reply) => {
      const ready = await checkDatabaseReadiness(db);
      return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'unavailable' });
    });
    return app;
  } catch (error) { await app.close(); throw error; }
}
