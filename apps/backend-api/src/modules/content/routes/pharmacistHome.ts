import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { PharmacistHomeContentAdminDetailSchema } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readHomeContent, singletonSerializer } from '../singleton-service';
import { registerHomeWrites } from './home-writes';

export function registerPharmacistHomeRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_HOME);
  app.get('/api/admin/content/pharmacist-home-content', { onRequest: guard, serializerCompiler: singletonSerializer, schema: { response: { 200: PharmacistHomeContentAdminDetailSchema } } }, async request => {
    parseContentQuery('pharmacist-home-content', request.query);
    return readHomeContent(db, 'pharmacist-home-content');
  });
  registerHomeWrites(app, deps, 'pharmacist-home-content');
}
