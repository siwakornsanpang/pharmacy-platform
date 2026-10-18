import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { HomeContentAdminDetailSchema } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readHomeContent, singletonSerializer } from '../singleton-service';
import { registerHomeWrites } from './home-writes';

export function registerHomeRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_HOME);
  app.get('/api/admin/content/home-content', { onRequest: guard, serializerCompiler: singletonSerializer, schema: { response: { 200: HomeContentAdminDetailSchema } } }, async request => {
    parseContentQuery('home-content', request.query);
    return readHomeContent(db, 'home-content');
  });
  registerHomeWrites(app, deps, 'home-content');
}
