import { contentObject as object, contentNullable as nullable, contentId as id, contentInteger as integer, contentText as text, contentTimestamp as timestamp, contentDate as date, contentCount as count, type ContentTimestamp } from './common.js';
export interface LawAdminSummary { id: number; category: string; title: string; year: number | null; announcedAt: string | null; order: number | null; pdfUrl: string | null; status: string | null; createdAt: ContentTimestamp | null }
export interface LawAdminDetail extends LawAdminSummary {}
export interface LawPublic { id: number; category: string; title: string; year: number | null; announcedAt: string | null; order: number | null; pdfUrl: string | null }
export interface PolicyCategoryAdminSummary { id: number; title: string; order: number; createdAt: ContentTimestamp | null; projectCount: number }
export interface PolicyCategoryAdminDetail extends PolicyCategoryAdminSummary {}
export interface PolicyCategoryPublic { id: number; title: string; order: number; projectCount: number }
export interface PolicyProjectAdminSummary { id: number; categoryId: number; name: string; summaryPdfUrl: string | null; status: string; order: number; createdAt: ContentTimestamp | null }
export interface PolicyProjectAdminDetail extends PolicyProjectAdminSummary {}
export interface PolicyProjectPublic { id: number; categoryId: number; name: string; summaryPdfUrl: string | null; status: string; order: number }
export interface OtherServiceCategoryAdminSummary { id: number; name: string; order: number; createdAt: ContentTimestamp | null; itemCount: number }
export interface OtherServiceCategoryAdminDetail extends OtherServiceCategoryAdminSummary {}
export interface OtherServiceCategoryPublic { id: number; name: string; order: number; itemCount: number }
export interface OtherServiceItemAdminSummary { id: number; categoryId: number; name: string; status: string; pdfUrl: string | null; order: number; createdAt: ContentTimestamp | null }
export interface OtherServiceItemAdminDetail extends OtherServiceItemAdminSummary {}
export interface OtherServiceItemPublic { id: number; categoryId: number; name: string; pdfUrl: string | null; order: number }

const law = { id, category: text, title: text, year: nullable(integer), announcedAt: nullable(date), order: nullable(integer), pdfUrl: nullable(text) };
export const LawPublicSchema = object(law);
export const LawAdminSummarySchema = object({ ...law, status: nullable(text), createdAt: nullable(timestamp) });
export const LawAdminDetailSchema = object({ ...law, status: nullable(text), createdAt: nullable(timestamp) });
const policyCategory = { id, title: text, order: integer, projectCount: count };
export const PolicyCategoryPublicSchema = object(policyCategory);
export const PolicyCategoryAdminSummarySchema = object({ ...policyCategory, createdAt: nullable(timestamp) });
export const PolicyCategoryAdminDetailSchema = object({ ...policyCategory, createdAt: nullable(timestamp) });
const project = { id, categoryId: id, name: text, summaryPdfUrl: nullable(text), status: text, order: integer };
export const PolicyProjectPublicSchema = object(project);
export const PolicyProjectAdminSummarySchema = object({ ...project, createdAt: nullable(timestamp) });
export const PolicyProjectAdminDetailSchema = object({ ...project, createdAt: nullable(timestamp) });
const category = { id, name: text, order: integer, itemCount: count };
export const OtherServiceCategoryPublicSchema = object(category);
export const OtherServiceCategoryAdminSummarySchema = object({ ...category, createdAt: nullable(timestamp) });
export const OtherServiceCategoryAdminDetailSchema = object({ ...category, createdAt: nullable(timestamp) });
const item = { id, categoryId: id, name: text, pdfUrl: nullable(text), order: integer };
export const OtherServiceItemPublicSchema = object(item);
export const OtherServiceItemAdminSummarySchema = object({ ...item, status: text, createdAt: nullable(timestamp) });
export const OtherServiceItemAdminDetailSchema = object({ ...item, status: text, createdAt: nullable(timestamp) });
