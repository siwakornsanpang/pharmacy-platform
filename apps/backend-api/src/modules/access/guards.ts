import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { isPermissionKey, type PermissionKey } from '@pharmacy/contracts/access';
import type { StaffActor } from './service';

export class AccessError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 404 | 409 | 503, message: string) { super(message); }
}
export function bearerToken(request: FastifyRequest): string {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
  if (!match) throw new AccessError(401, 'Unauthorized');
  return match[1]!;
}
export function capabilityGuard(resolve: (token: string) => Promise<StaffActor>, key: PermissionKey): preHandlerHookHandler {
  return async request => {
    let actor: StaffActor;
    try { actor = await resolve(bearerToken(request)); }
    catch (error) {
      if (error instanceof AccessError) throw error;
      throw new AccessError(503, 'Staff access temporarily unavailable');
    }
    if (!isPermissionKey(key) || !actor.permissions.includes(key)) throw new AccessError(403, 'Forbidden');
    request.staffActor = actor;
  };
}
declare module 'fastify' { interface FastifyRequest { staffActor?: StaffActor } }
