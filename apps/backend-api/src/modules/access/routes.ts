import type { FastifyInstance } from 'fastify';
import { AccessError, bearerToken } from './guards';
import type { createAccessService, AccessDependencies } from './service';
import { createAdministration } from './administration';

export async function registerAccessRoutes(app: FastifyInstance, service: ReturnType<typeof createAccessService>, deps: AccessDependencies) {
  const admin = createAdministration(deps);
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    owned.setErrorHandler((error, _request, reply) => {
      if (error instanceof AccessError) return reply.code(error.statusCode).send({ message: error.message });
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
      if (status === 413) return reply.code(413).send({ message: 'Request too large' });
      if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
      return reply.code(503).send({ message: 'Staff access temporarily unavailable' });
    });
    owned.get('/api/auth/assignable-roles', { preHandler: service.requireCapability('manage_users') }, async request => admin.assignableRoles(request.staffActor!));
    owned.get('/api/auth/users', { preHandler: service.requireCapability('manage_users') }, async request => admin.listUsers(request.staffActor!));
    owned.post('/api/auth/users', { preHandler: service.requireCapability('manage_users') }, async request => admin.mutateUser(request.staffActor!, 'create', undefined, request.body));
    owned.put('/api/auth/users/:id', { preHandler: service.requireCapability('manage_users') }, async request => admin.mutateUser(request.staffActor!, 'update', (request.params as {id:string}).id, request.body));
    owned.delete('/api/auth/users/:id', { preHandler: service.requireCapability('manage_users') }, async request => admin.mutateUser(request.staffActor!, 'delete', (request.params as {id:string}).id, request.body));
    owned.get('/api/permissions', { preHandler: service.requireCapability('manage_roles') }, async request => admin.listPermissions(request.staffActor!));
    owned.get('/api/permissions/my', async request => (await service.resolveStaffActor(bearerToken(request))).permissions);
    owned.get('/api/permissions/roles', { preHandler: service.requireCapability('manage_roles') }, async request => admin.listRoles(request.staffActor!));
    owned.get('/api/permissions/roles/:role', { preHandler: service.requireCapability('manage_roles') }, async request => admin.getRole(request.staffActor!, (request.params as {role:string}).role));
    owned.post('/api/permissions/roles', { preHandler: service.requireCapability('manage_roles') }, async request => admin.mutateRole(request.staffActor!, 'create', undefined, request.body));
    owned.put('/api/permissions/roles/:role', { preHandler: service.requireCapability('manage_roles') }, async request => admin.mutateRole(request.staffActor!, 'update', (request.params as {role:string}).role, request.body));
    owned.delete('/api/permissions/roles/:role', { preHandler: service.requireCapability('manage_roles') }, async request => admin.mutateRole(request.staffActor!, 'delete', (request.params as {role:string}).role, request.body));
    owned.post('/api/auth/login', async request => {
      const body = request.body as { username?: unknown; password?: unknown } | null;
      return service.login(body?.username, body?.password);
    });
    owned.get('/api/auth/me', async request => {
      const { sessionId: _sessionId, ...user } = await service.resolveStaffActor(bearerToken(request));
      return user;
    });
    owned.post('/api/auth/logout', async request => service.logout(bearerToken(request)));
  });
}
