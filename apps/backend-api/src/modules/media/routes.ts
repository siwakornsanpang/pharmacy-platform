import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AccessError } from '../access/guards';
import type { StaffActor } from '../access/service';
import { MediaError } from './types';
import { jsonMetadataMaxBytes, parseIntentId, parseTicket, type UploadIntentService } from './upload-intents';
import type { MediaService } from './service';
import type { ClaimedUploadIntent } from './types';
import type { BackendConfig } from '../../config/server';

const claimed = new WeakMap<FastifyRequest, ClaimedUploadIntent>();
const ErrorSchema = {
  type: 'object', properties: { message: { type: 'string' } },
  required: ['message'], additionalProperties: false,
} as const;

function mediaError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AccessError || error instanceof MediaError)
    return reply.code(error.statusCode).send({ message: error.message });
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 413) return reply.code(413).send({ message: 'Upload too large' });
  if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
  if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
  return reply.code(503).send({ message: 'Media temporarily unavailable' });
}

function exactOrigin(origin: unknown, allowed: string[]): string {
  if (typeof origin !== 'string' || origin === 'null' || !allowed.includes(origin))
    throw new MediaError(403, 'Invalid upload origin');
  return origin;
}

export async function registerMediaRoutes(app: FastifyInstance, deps: {
  config: BackendConfig;
  clock: () => Date;
  media: MediaService;
  uploads: UploadIntentService;
  readStaff: (request: FastifyRequest) => Promise<StaffActor | null>;
}) {
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    owned.setErrorHandler(mediaError);
    owned.get('/api/media/:assetId/download', async (request, reply) => {
      const asset = await deps.media.loadAsset((request.params as { assetId: string }).assetId);
      if (!asset) return reply.code(404).send({ message: 'Asset not found' });
      const actor = await deps.readStaff(request);
      const decision = await deps.media.authorizeDownload(asset, actor);
      const signed = await deps.media.issuePrivateDownload(asset.id, decision);
      return reply.code(302).header('Location', signed.url).header('Cache-Control', 'no-store').send();
    });
  });

  await app.register(async receiver => {
    receiver.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      const origin = request.headers.origin;
      if (typeof origin === 'string' && deps.config.corsOrigins.includes(origin) &&
        request.url.split('?')[0].startsWith('/api/media/uploads/')) {
        reply.header('Access-Control-Allow-Origin', origin);
        reply.header('Vary', 'Origin');
        reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, x-upload-ticket');
      }
    });
    receiver.addContentTypeParser('application/octet-stream', (request, payload, done) => { done(null, payload); });
    receiver.addHook('onRequest', async (request) => {
      if (request.method === 'OPTIONS') return;
      const path = request.url.split('?')[0];
      const match = path.match(/^\/api\/media\/uploads\/([^/]+)$/);
      if (!match) return;
      exactOrigin(request.headers.origin, deps.config.corsOrigins);
      const intentId = parseIntentId(match[1]);
      const ticket = parseTicket(request.headers['x-upload-ticket']);
      const length = request.headers['content-length'];
      if (length !== undefined) {
        const value = Number(length);
        if (!Number.isSafeInteger(value) || value < 0) throw new MediaError(400, 'Invalid Content-Length');
      }
      claimed.set(request, await deps.uploads.claimIntent(intentId, ticket, deps.clock()));
    });
    receiver.setErrorHandler(mediaError);
    receiver.post('/api/media/uploads/:intentId', {
      bodyLimit: deps.config.uploadMaxBytes,
      schema: { response: { 200: { type: 'object', additionalProperties: true }, 400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 409: ErrorSchema, 413: ErrorSchema, 415: ErrorSchema, 503: ErrorSchema } },
    }, async (request) => {
      const intent = claimed.get(request);
      if (!intent) throw new MediaError(401, 'Invalid upload ticket');
      if (request.headers['content-length'] !== undefined && Number(request.headers['content-length']) !== intent.size)
        throw new MediaError(400, 'Upload length mismatch');
      const body = request.body;
      const stream = body && typeof (body as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === 'function'
        ? body as AsyncIterable<Uint8Array>
        : Buffer.isBuffer(body) ? (async function* () { yield body; })() : undefined;
      if (!stream) throw new MediaError(400, 'Invalid upload');
      return deps.uploads.receiveUpload(intent, stream);
    });
  });
}

export { jsonMetadataMaxBytes };
