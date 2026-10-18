// src/db/schema.ts

export {
  homeContent, pharmacistHomeContent, laws, councilMembers, newsStatusEnum, newsCategoryEnum,
  news, medicineArticles, publicProjectArticles, councilHistory, agencies, webSettings,
  honorAwards, honors, services, policyCategories, policyProjects, products,
  otherServiceCategories, otherServiceItems, contentAssetRefs, contentMediaIntents,
} from '../modules/content/schema';

export { users, permissions, rolePermissions, roles, staffSessions, accessAudit } from '../modules/access/schema';
export { pharmacists } from '../modules/registry/schema';
export {
  requestStatusEnum, paymentMethodEnum, taxpayerTypeEnum, requests,
  requestShippingDetails, requestPaymentLogs, requestTaxInvoices, requestOperationKeys,
  requestAssetRefs, requestMediaIntents,
} from '../modules/requests/schema';
export {
  mediaAssets, mediaAssetPins, mediaAssetReferences, mediaCleanupJobs, mediaUploadIntents,
} from '../modules/media/schema';
export {
  academyCourseStatusEnum, academyAudienceEnum, academyCategories, academyInstructors, academyCourses,
  academyCourseOutcomes, academyReviews, academyLessons, academyLessonDocuments, academyEnrollments,
  academyOrders, academyRefundRequests, academyCertificates, academyLessonProgress,
  academyCommands, academyAssetRefs, academyMediaIntents,
} from '../modules/academy/schema';
