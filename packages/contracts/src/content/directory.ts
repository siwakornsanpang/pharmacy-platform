import { contentObject as object, contentNullable as nullable, contentId as id, contentInteger as integer, contentText as text, contentTimestamp as timestamp, contentBoolean as bool, contentCount as count, type ContentTimestamp } from './common.js';
export interface CouncilAdminSummary { id: number; prefix: string | null; name: string; position: string; type: string; imageUrl: string | null; order: number; background: string | null }
export interface CouncilAdminDetail extends CouncilAdminSummary { originalImageUrl: string | null }
export interface CouncilPublic extends CouncilAdminSummary {}
export interface HistoryAdminSummary { id: number; term: string; startYear: string; endYear: string; presidentName: string; secretaryName: string; presidentImage: string | null; secretaryImage: string | null; createdAt: ContentTimestamp | null }
export interface HistoryAdminDetail extends HistoryAdminSummary { originalPresidentImage: string | null; originalSecretaryImage: string | null }
export interface HistoryPublic { id: number; term: string; startYear: string; endYear: string; presidentName: string; secretaryName: string; presidentImage: string | null; secretaryImage: string | null }
export interface AgencyAdminSummary { id: number; order: number; name: string; title: string | null; description: string | null; thumbnailUrl: string | null; logoUrl: string | null; iconUrl: string | null; url: string; category: string; createdAt: ContentTimestamp | null }
export interface AgencyAdminDetail extends AgencyAdminSummary { originalThumbnailUrl: string | null }
export interface AgencyPublic { id: number; order: number; name: string; title: string | null; description: string | null; thumbnailUrl: string | null; logoUrl: string | null; iconUrl: string | null; url: string; category: string }
export interface HonorAwardAdminSummary { id: number; order: number; name: string; description: string | null; createdAt: ContentTimestamp | null; recipientCount: number }
export interface HonorAwardAdminDetail extends HonorAwardAdminSummary {}
export interface HonorAwardPublic { id: number; order: number; name: string; description: string | null; recipientCount: number }
export interface HonorAdminSummary { id: number; awardId: number; order: number; prefix: string | null; name: string; awardName: string | null; workName: string | null; awardDetail: string | null; imageUrl: string | null; videoUrl: string | null; createdAt: ContentTimestamp | null }
export interface HonorAdminDetail extends HonorAdminSummary { fullDetail: string | null; originalImageUrl: string | null }
export interface HonorPublic { id: number; awardId: number; order: number; prefix: string | null; name: string; awardName: string | null; workName: string | null; awardDetail: string | null; fullDetail: string | null; imageUrl: string | null; videoUrl: string | null }
export interface ServiceAdminSummary { id: number; name: string; shortName: string | null; iconUrl: string | null; order: number; description: string | null; linkUrl: string | null; isPopular: boolean | null; popularOrder: number | null; createdAt: ContentTimestamp | null }
export interface ServiceAdminDetail extends ServiceAdminSummary {}
export interface ServicePublic { id: number; name: string; shortName: string | null; iconUrl: string | null; order: number; description: string | null; linkUrl: string | null; isPopular: boolean | null; popularOrder: number | null }

const council = { id, prefix: nullable(text), name: text, position: text, type: text, imageUrl: nullable(text), order: integer, background: nullable(text) };
export const CouncilAdminSummarySchema = object(council);
export const CouncilAdminDetailSchema = object({ ...council, originalImageUrl: nullable(text) });
export const CouncilPublicSchema = object(council);
const history = { id, term: text, startYear: text, endYear: text, presidentName: text, secretaryName: text, presidentImage: nullable(text), secretaryImage: nullable(text) };
export const HistoryPublicSchema = object(history);
export const HistoryAdminSummarySchema = object({ ...history, createdAt: nullable(timestamp) });
export const HistoryAdminDetailSchema = object({ ...history, createdAt: nullable(timestamp), originalPresidentImage: nullable(text), originalSecretaryImage: nullable(text) });
const agency = { id, order: integer, name: text, title: nullable(text), description: nullable(text), thumbnailUrl: nullable(text), logoUrl: nullable(text), iconUrl: nullable(text), url: text, category: text };
export const AgencyPublicSchema = object(agency);
export const AgencyAdminSummarySchema = object({ ...agency, createdAt: nullable(timestamp) });
export const AgencyAdminDetailSchema = object({ ...agency, createdAt: nullable(timestamp), originalThumbnailUrl: nullable(text) });
const award = { id, order: integer, name: text, description: nullable(text), recipientCount: count };
export const HonorAwardPublicSchema = object(award);
export const HonorAwardAdminSummarySchema = object({ ...award, createdAt: nullable(timestamp) });
export const HonorAwardAdminDetailSchema = object({ ...award, createdAt: nullable(timestamp) });
const honor = { id, awardId: integer, order: integer, prefix: nullable(text), name: text, awardName: nullable(text), workName: nullable(text), awardDetail: nullable(text), imageUrl: nullable(text), videoUrl: nullable(text) };
export const HonorPublicSchema = object({ ...honor, fullDetail: nullable(text) });
export const HonorAdminSummarySchema = object({ ...honor, createdAt: nullable(timestamp) });
export const HonorAdminDetailSchema = object({ ...honor, createdAt: nullable(timestamp), fullDetail: nullable(text), originalImageUrl: nullable(text) });
const service = { id, name: text, shortName: nullable(text), iconUrl: nullable(text), order: integer, description: nullable(text), linkUrl: nullable(text), isPopular: nullable(bool), popularOrder: nullable(integer) };
export const ServicePublicSchema = object(service);
export const ServiceAdminSummarySchema = object({ ...service, createdAt: nullable(timestamp) });
export const ServiceAdminDetailSchema = object({ ...service, createdAt: nullable(timestamp) });

export interface HonorPublicSummary extends Omit<HonorPublic, 'fullDetail'> {}
export interface HonorPublicDetail extends HonorPublic {}
export const HonorPublicSummarySchema = object(honor);
export const HonorPublicDetailSchema = HonorPublicSchema;
