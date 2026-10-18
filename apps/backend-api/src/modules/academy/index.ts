import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AccessError } from '../access/guards';
import { MediaError } from '../media';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { registerAcademyPublicRoutes } from './public-routes';
import { registerAcademyAdminRoutes } from './admin-routes';
import { registerAcademyMemberRoutes } from './member-routes';

export {
  academyCourseStatusEnum, academyAudienceEnum, academyCategories, academyInstructors, academyCourses,
  academyCourseOutcomes, academyReviews, academyLessons, academyLessonDocuments, academyEnrollments,
  academyOrders, academyRefundRequests, academyCertificates, academyLessonProgress,
  academyCommands, academyAssetRefs, academyMediaIntents,
} from './schema';
export type { AcademyDependencies, AcademyMemberActor } from './public';
export { AcademyError } from './public';
export { countPaidOrders, countActiveEnrollments, readPublishedCourse } from './queries';
export { createCourseService } from './course-service';
export { createEnrollmentService } from './enrollment-service';
export { createOrderService } from './order-service';
export { createLearningService } from './learning-service';
export {
  createAcademyAuthorizer, createAcademyMediaPort, isAcademyAssetReferenced,
  authorizeAcademyAssetRead, authorizeAcademyUpload,
} from './media';

function academyError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AccessError || error instanceof AcademyError || error instanceof MediaError)
    return reply.code(error.statusCode).send({ message: error.message });
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 400) return reply.code(400).send({ message: 'Invalid request' });
  if (status === 409) return reply.code(409).send({ message: 'Conflict' });
  if (status === 429) return reply.code(429).send({ message: 'Too many requests' });
  return reply.code(503).send({ message: 'Academy temporarily unavailable' });
}

export async function registerAcademy(app: FastifyInstance, deps: AcademyDependencies) {
  await app.register(async owned => {
    owned.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
    owned.setErrorHandler(academyError);
    registerAcademyPublicRoutes(owned, deps);
    registerAcademyAdminRoutes(owned, deps);
    registerAcademyMemberRoutes(owned, deps);
  });
}
