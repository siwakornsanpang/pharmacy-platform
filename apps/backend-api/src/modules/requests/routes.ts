import { CAPABILITY } from '@pharmacy/contracts/access';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Ajv from 'ajv';
import { AccessError } from '../access/guards';
import { parseIdempotencyKey, RequestOperationError } from './idempotency';
import {
  createRequestsService, paymentMethods, requestStatuses, RequestServiceError, taxpayerTypes,
  type CreateRequestInput, type PaymentInput, type RequestListQuery, type RequestsDependencies,
  type UpdateRequestInput,
} from './service';

const text = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength, pattern: '^[^\\u0000-\\u001f\\u007f]+$' } as const);
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] } as const);
const timestamp = nullable({ type: 'string', format: 'date-time' });
const ErrorSchema = {
  type: 'object', properties: { message: { type: 'string' } },
  required: ['message'], additionalProperties: false,
} as const;
const headerProperties = {
  id: text(50), pharmacistLicenseId: text(255), requestDate: timestamp,
  requestStatus: nullable({ type: 'string', enum: [...requestStatuses] }), licenseType: nullable(text(100)),
  createdAt: timestamp, updatedAt: timestamp,
} as const;
const HeaderSchema = {
  type: 'object', properties: headerProperties, required: Object.keys(headerProperties), additionalProperties: false,
} as const;
const ShippingSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 }, requestId: text(50),
    shippingAddress: nullable({ type: 'string', maxLength: 4000 }),
    trackingNumber: nullable({ type: 'string', maxLength: 100 }),
    createdAt: timestamp, updatedAt: timestamp,
  },
  required: ['id', 'requestId', 'shippingAddress', 'trackingNumber', 'createdAt', 'updatedAt'],
  additionalProperties: false,
} as const;
const PaymentSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 }, requestId: text(50), paymentDate: timestamp,
    amountPaid: nullable({ type: 'string', pattern: '^\\d{1,8}\\.\\d{2}$' }),
    paymentMethod: nullable({ type: 'string', enum: [...paymentMethods] }),
    paymentReferenceId: nullable({ type: 'string', maxLength: 100 }), createdAt: timestamp,
  },
  required: ['id', 'requestId', 'paymentDate', 'amountPaid', 'paymentMethod', 'paymentReferenceId', 'createdAt'],
  additionalProperties: false,
} as const;
const TaxSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 }, requestId: text(50),
    taxpayerType: nullable({ type: 'string', pattern: '^(?:individual|corporate)$' }),
    taxInvoiceName: nullable({ type: 'string', maxLength: 255 }),
    taxIdNumber: nullable({ type: 'string', maxLength: 13 }),
    branchCode: nullable({ type: 'string', maxLength: 50 }),
    registeredTaxAddress: nullable({ type: 'string', maxLength: 4000 }),
    taxInvoiceNumber: nullable({ type: 'string', maxLength: 100 }),
    createdAt: timestamp, updatedAt: timestamp,
  },
  required: ['id', 'requestId', 'taxpayerType', 'taxInvoiceName', 'taxIdNumber', 'branchCode',
    'registeredTaxAddress', 'taxInvoiceNumber', 'createdAt', 'updatedAt'],
  additionalProperties: false,
} as const;
const RegistryIdentitySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 }, license: { type: 'string' },
    name: { type: 'string' }, status: nullable({ type: 'string' }),
  },
  required: ['id', 'license', 'name', 'status'], additionalProperties: false,
} as const;
const DetailSchema = {
  type: 'object',
  properties: {
    ...headerProperties, shippingDetails: nullable(ShippingSchema),
    paymentLogs: { type: 'array', items: PaymentSchema },
    taxInvoice: nullable(TaxSchema), pharmacist: nullable(RegistryIdentitySchema),
  },
  required: [...Object.keys(headerProperties), 'shippingDetails', 'paymentLogs', 'taxInvoice', 'pharmacist'],
  additionalProperties: false,
} as const;
const SuccessSchema = {
  type: 'object', properties: { success: { const: true } },
  required: ['success'], additionalProperties: false,
} as const;
const CreateSuccessSchema = {
  type: 'object', properties: { success: { const: true }, data: HeaderSchema },
  required: ['success', 'data'], additionalProperties: false,
} as const;
const PaymentSuccessSchema = {
  type: 'object', properties: { success: { const: true }, data: PaymentSchema },
  required: ['success', 'data'], additionalProperties: false,
} as const;
const DeleteSuccessSchema = {
  type: 'object', properties: { success: { const: true }, message: { type: 'string' } },
  required: ['success', 'message'], additionalProperties: false,
} as const;
const ShippingInputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    shippingAddress: nullable({ type: 'string', maxLength: 4000 }),
    trackingNumber: nullable({ type: 'string', maxLength: 100 }),
  },
} as const;
const TaxInputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    taxpayerType: nullable({ type: 'string', enum: [...taxpayerTypes] }),
    taxInvoiceName: nullable({ type: 'string', maxLength: 255 }),
    taxIdNumber: nullable({ type: 'string', maxLength: 13 }),
    branchCode: nullable({ type: 'string', maxLength: 50 }),
    registeredTaxAddress: nullable({ type: 'string', maxLength: 4000 }),
    taxInvoiceNumber: nullable({ type: 'string', maxLength: 100 }),
  },
} as const;
const CreateInputSchema = {
  type: 'object', additionalProperties: false, required: ['id', 'pharmacistLicenseId'],
  properties: {
    id: text(50), pharmacistLicenseId: text(255), licenseType: nullable(text(100)),
    shippingDetails: ShippingInputSchema, taxInvoice: TaxInputSchema,
  },
} as const;
const UpdateInputSchema = {
  type: 'object', additionalProperties: false, minProperties: 1,
  properties: {
    requestStatus: nullable({ type: 'string', enum: [...requestStatuses] }),
    licenseType: nullable(text(100)), shippingDetails: ShippingInputSchema, taxInvoice: TaxInputSchema,
  },
} as const;
const PaymentInputSchema = {
  type: 'object', additionalProperties: false, required: ['paymentMethod', 'paymentReferenceId'],
  properties: {
    paymentDate: { type: 'string', minLength: 10, maxLength: 40 },
    amountPaid: { type: 'number', minimum: 0, maximum: 99_999_999.99, multipleOf: 0.01 },
    paymentMethod: { type: 'string', enum: [...paymentMethods] },
    paymentReferenceId: { type: 'string', maxLength: 100 },
  },
} as const;

function requestsError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AccessError || error instanceof RequestOperationError || error instanceof RequestServiceError)
    return reply.code(error.statusCode).send({ message: error.message });
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
  if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
  if ((error as { code?: string }).code === '23505') return reply.code(409).send({ message: 'Request ID already exists' });
  return reply.code(503).send({ message: 'Requests temporarily unavailable' });
}
function requestId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > 50 || /[\u0000-\u001f\u007f]/.test(value))
    throw new RequestServiceError(400, 'Invalid request ID');
  return value;
}
function noQuery(request: FastifyRequest) {
  if (Object.keys(request.query as object).length) throw new RequestServiceError(400, 'Unsupported query');
}
function listQuery(value: unknown): RequestListQuery {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestServiceError(400, 'Invalid query');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['status', 'q'].includes(key))) throw new RequestServiceError(400, 'Invalid query');
  const result: RequestListQuery = {};
  if ('status' in input) {
    if (typeof input.status !== 'string' || !requestStatuses.includes(input.status as typeof requestStatuses[number]))
      throw new RequestServiceError(400, 'Invalid request status');
    result.status = input.status as typeof requestStatuses[number];
  }
  if ('q' in input) {
    if (typeof input.q !== 'string' || !input.q.trim() || input.q.trim().length > 200)
      throw new RequestServiceError(400, 'Invalid request search');
    result.q = input.q.trim();
  }
  return result;
}
function queryId(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestServiceError(400, 'Invalid query');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || !('requestId' in input)) throw new RequestServiceError(400, 'Invalid query');
  return requestId(input.requestId);
}
function mutation(request: FastifyRequest, method: 'POST' | 'PUT' | 'DELETE') {
  if (!request.staffActor) throw new AccessError(401, 'Unauthorized');
  return {
    actorKey: `staff:${request.staffActor.id}`,
    method,
    key: parseIdempotencyKey(request.headers['idempotency-key']),
  };
}
function send(result: { status: number; body: Record<string, unknown> }, reply: FastifyReply) {
  return reply.code(result.status).send(result.body);
}

export async function registerRequestsRoutes(app: FastifyInstance, deps: RequestsDependencies) {
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    const validator = new Ajv({ strict: true, coerceTypes: false, removeAdditional: false, formats: {
      'date-time': true,
    } });
    owned.setValidatorCompiler(({ schema }) => validator.compile(schema));
    owned.setErrorHandler(requestsError);
    const service = createRequestsService(deps);
    const guard = deps.access.requireCapability(CAPABILITY.MANAGE_REGISTER);
    const errors = { 400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema, 503: ErrorSchema };

    const list = async (request: FastifyRequest) => service.list(listQuery(request.query));
    const create = async (request: FastifyRequest, reply: FastifyReply) =>
      send(await service.create(request.body as CreateRequestInput, mutation(request, 'POST')), reply);
    const detail = async (id: string, reply: FastifyReply) => {
      const value = await service.detail(id);
      return value ?? reply.code(404).send({ message: 'Request not found' });
    };
    const update = async (id: string, request: FastifyRequest, reply: FastifyReply) =>
      send(await service.update(id, request.body as UpdateRequestInput, mutation(request, 'PUT')), reply);
    const remove = async (id: string, request: FastifyRequest, reply: FastifyReply) =>
      send(await service.remove(id, mutation(request, 'DELETE')), reply);
    const readPayments = async (id: string, reply: FastifyReply) => {
      const value = await service.readPayments(id);
      return value ?? reply.code(404).send({ message: 'Request not found' });
    };
    const addPayment = async (id: string, request: FastifyRequest, reply: FastifyReply) =>
      send(await service.addPayment(id, request.body as PaymentInput, mutation(request, 'POST')), reply);

    owned.get('/api/admin/registry/requests', {
      preHandler: guard, schema: { response: { 200: { type: 'array', items: HeaderSchema }, ...errors } },
    }, list);
    owned.post('/api/admin/registry/requests', {
      preHandler: guard, schema: { body: CreateInputSchema, response: { 200: CreateSuccessSchema, ...errors } },
    }, create);
    owned.get('/api/admin/registry/requests/detail', {
      preHandler: guard, schema: { response: { 200: structuredClone(DetailSchema), ...errors } },
    }, async (request, reply) => detail(queryId(request.query), reply));
    owned.put('/api/admin/registry/requests/detail', {
      preHandler: guard, schema: { body: UpdateInputSchema, response: { 200: SuccessSchema, ...errors } },
    }, async (request, reply) => update(queryId(request.query), request, reply));
    owned.delete('/api/admin/registry/requests/detail', {
      preHandler: guard, schema: { response: { 200: DeleteSuccessSchema, ...errors } },
    }, async (request, reply) => remove(queryId(request.query), request, reply));
    owned.get('/api/admin/registry/requests/payments', {
      preHandler: guard, schema: { response: { 200: { type: 'array', items: PaymentSchema }, ...errors } },
    }, async (request, reply) => readPayments(queryId(request.query), reply));
    owned.post('/api/admin/registry/requests/payments', {
      preHandler: guard, schema: { body: PaymentInputSchema, response: { 200: PaymentSuccessSchema, ...errors } },
    }, async (request, reply) => addPayment(queryId(request.query), request, reply));

    owned.get('/api/requests', {
      preHandler: guard, schema: { response: { 200: { type: 'array', items: HeaderSchema }, ...errors } },
    }, list);
    owned.post('/api/requests', {
      preHandler: guard, schema: { body: CreateInputSchema, response: { 200: CreateSuccessSchema, ...errors } },
    }, create);
    owned.get('/api/requests/:id', {
      preHandler: guard, schema: { response: { 200: structuredClone(DetailSchema), ...errors } },
    }, async (request, reply) => { noQuery(request); return detail(requestId((request.params as { id: string }).id), reply); });
    owned.put('/api/requests/:id', {
      preHandler: guard, schema: { body: UpdateInputSchema, response: { 200: SuccessSchema, ...errors } },
    }, async (request, reply) => { noQuery(request); return update(requestId((request.params as { id: string }).id), request, reply); });
    owned.delete('/api/requests/:id', {
      preHandler: guard, schema: { response: { 200: DeleteSuccessSchema, ...errors } },
    }, async (request, reply) => { noQuery(request); return remove(requestId((request.params as { id: string }).id), request, reply); });
    owned.post('/api/requests/:id/payment', {
      preHandler: guard, schema: { body: PaymentInputSchema, response: { 200: PaymentSuccessSchema, ...errors } },
    }, async (request, reply) => { noQuery(request); return addPayment(requestId((request.params as { id: string }).id), request, reply); });
  });
}
