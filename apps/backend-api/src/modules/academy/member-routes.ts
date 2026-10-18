import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AcademyCertificateSchema, AcademyCommandResultSchema, AcademyLearningStateSchema,
  AcademyUploadIntentSchema,
} from '@pharmacy/contracts/academy';
import type { AcademyUploadIntentMetadata } from '@pharmacy/contracts/academy';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { listMemberEnrollments } from './queries';
import { createEnrollmentService } from './enrollment-service';
import { createOrderService } from './order-service';
import { createLearningService } from './learning-service';
import { authorizeAcademyAssetRead } from './media';
import { commandKeyFrom, memberActorFrom, parseAcademyId } from './http';

const ErrorSchema = {
  type: 'object', properties: { message: { type: 'string' } },
  required: ['message'], additionalProperties: false,
} as const;
const errors = {
  400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema,
  413: ErrorSchema, 415: ErrorSchema, 503: ErrorSchema,
} as const;
const ProgressSchema = {
  type: 'object', additionalProperties: false, required: ['success', 'progressPercent'],
  properties: { success: { type: 'boolean', const: true }, progressPercent: { type: 'number' } },
} as const;
const UploadBodySchema = {
  type: 'object', additionalProperties: false,
  required: ['filename', 'declaredMime', 'size', 'pharmacistLicense'],
  properties: {
    filename: { type: 'string', minLength: 1, maxLength: 255 },
    declaredMime: { type: 'string', minLength: 1, maxLength: 127 },
    size: { type: 'integer', minimum: 1, maximum: 104857600 },
    pharmacistLicense: { type: 'string', minLength: 1, maxLength: 64 },
    displayName: { type: 'string', minLength: 1, maxLength: 255 },
    subject: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

function requireBridge(deps: AcademyDependencies) {
  return async (request: FastifyRequest) => {
    const offered = request.headers['x-academy-bridge'];
    if (typeof offered !== 'string' || offered !== deps.config.academyBridgeKey)
      throw new AcademyError(401, 'ไม่มีสิทธิ์เรียกเส้นนี้');
  };
}

function body(request: FastifyRequest) {
  return (request.body ?? {}) as Record<string, unknown>;
}

export function registerAcademyMemberRoutes(app: FastifyInstance, deps: AcademyDependencies) {
  const bridge = requireBridge(deps);
  const enrollments = createEnrollmentService(deps);
  const orders = createOrderService(deps);
  const learning = createLearningService(deps);

  app.get('/academy/member/enrollments', { preHandler: bridge, schema: { response: { ...errors } } }, async request => {
    const actor = memberActorFrom({}, request.query as Record<string, unknown>);
    return listMemberEnrollments(deps.db, actor.pharmacistLicense);
  });
  app.get('/academy/member/courses/:id/learning', {
    preHandler: bridge, schema: { response: { 200: AcademyLearningStateSchema, ...errors } },
  }, async request => learning.getLearning(
    memberActorFrom({}, request.query as Record<string, unknown>),
    parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'),
  ));
  app.get('/academy/member/courses/:id/certificate', {
    preHandler: bridge, schema: { response: { 200: AcademyCertificateSchema, ...errors } },
  }, async request => learning.getCertificate(
    memberActorFrom({}, request.query as Record<string, unknown>),
    parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'),
  ));
  app.post('/academy/member/enroll', {
    preHandler: bridge, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => {
    const payload = body(request);
    return enrollments.enrollFree(memberActorFrom(payload), parseAcademyId(payload.courseId, 'ข้อมูลไม่ครบ'));
  });
  app.post('/academy/member/orders', {
    preHandler: bridge, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => {
    const payload = body(request);
    return orders.placeMockOrder(
      memberActorFrom(payload), parseAcademyId(payload.courseId, 'ข้อมูลไม่ครบ'), commandKeyFrom(request.headers),
    );
  });
  app.post('/academy/member/lessons/:id/complete', {
    preHandler: bridge, schema: { response: { 200: ProgressSchema, ...errors } },
  }, async request => {
    const payload = body(request);
    const answers = Array.isArray(payload.answers) ? payload.answers.map(item => String(item)) : [];
    return learning.completeLesson(
      memberActorFrom(payload), parseAcademyId((request.params as { id: string }).id, 'ไม่พบบทเรียน'), answers,
    );
  });
  app.post('/academy/member/courses/:id/cancel', {
    preHandler: bridge, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => enrollments.cancelEnrollment(
    memberActorFrom(body(request)), parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'),
  ));
  app.post('/academy/member/courses/:id/exam', {
    preHandler: bridge, schema: { response: { 200: ProgressSchema, ...errors } },
  }, async request => {
    const payload = body(request);
    const answers = Array.isArray(payload.answers) ? payload.answers.map(item => String(item)) : [];
    return learning.submitExam(
      memberActorFrom(payload), parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'), answers,
    );
  });
  app.post('/academy/member/courses/:id/refund', {
    preHandler: bridge, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => {
    const payload = body(request);
    return orders.refundMockOrder(
      memberActorFrom(payload),
      parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'),
      String(payload.reason ?? ''),
      commandKeyFrom(request.headers),
    );
  });
  app.post('/academy/member/upload', {
    preHandler: bridge,
    schema: { body: UploadBodySchema, response: { 200: AcademyUploadIntentSchema, ...errors } },
  }, async request => {
    if (!deps.uploads) throw new AcademyError(503, 'Academy media operations temporarily unavailable');
    const actor = memberActorFrom(body(request));
    const metadata = request.body as AcademyUploadIntentMetadata;
    return deps.uploads.createUploadIntent({
      verifiedActor: {
        kind: 'pharmacy-mock',
        actorKey: `pharmacy-mock:${actor.subject}`,
        subject: actor.subject,
        pharmacistLicense: actor.pharmacistLicense,
        displayName: actor.displayName,
      },
      owner: { domain: 'academy', type: 'order', id: `draft:${actor.subject}`, slot: 'slip' },
      kind: 'academy-slip',
      metadata: { filename: metadata.filename, declaredMime: metadata.declaredMime, size: metadata.size },
    });
  });

  app.get('/academy/member/assets/:assetId/download', { preHandler: bridge }, async (request, reply) => {
    if (!deps.downloads) throw new AcademyError(503, 'Academy media operations temporarily unavailable');
    const actor = memberActorFrom({}, request.query as Record<string, unknown>);
    const assetId = String((request.params as { assetId: string }).assetId);
    const decision = await authorizeAcademyAssetRead(deps.db, actor, assetId);
    const signed = await deps.downloads.issuePrivateDownload(assetId, decision);
    return reply.code(302).header('Location', signed.url).header('Cache-Control', 'no-store').send();
  });
}
