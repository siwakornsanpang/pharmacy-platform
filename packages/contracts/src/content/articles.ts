import { contentObject as object, contentNullable as nullable, contentId as id, contentText as text, contentTimestamp as timestamp, contentBoolean as bool, contentPrice as price, type ContentTimestamp, type ContentPrice } from './common.js';
export type ContentArticleStatus = 'draft' | 'published';
export type NewsCategory = 'news' | 'recruitment' | 'procurement';

export interface NewsAdminSummary { id: number; title: string; excerpt: string | null; thumbnailUrl: string | null; status: ContentArticleStatus; category: NewsCategory; createdAt: ContentTimestamp | null; updatedAt: ContentTimestamp | null; publishedAt: ContentTimestamp | null; isHighlight: boolean | null }
export interface NewsAdminDetail extends NewsAdminSummary { content: string }
export interface NewsPublic { id: number; title: string; content: string; excerpt: string | null; thumbnailUrl: string | null; category: NewsCategory; createdAt: ContentTimestamp | null; publishedAt: ContentTimestamp | null; isHighlight: boolean | null }
export interface MedicineAdminSummary { id: number; title: string; excerpt: string | null; thumbnailUrl: string | null; category: string; status: ContentArticleStatus; createdAt: ContentTimestamp | null; updatedAt: ContentTimestamp | null; publishedAt: ContentTimestamp | null }
export interface MedicineAdminDetail extends MedicineAdminSummary { content: string }
export interface MedicinePublic { id: number; title: string; content: string; excerpt: string | null; thumbnailUrl: string | null; category: string; publishedAt: ContentTimestamp | null }
export interface PublicProjectAdminSummary { id: number; title: string; excerpt: string | null; thumbnailUrl: string | null; category: string; status: ContentArticleStatus; createdAt: ContentTimestamp | null; updatedAt: ContentTimestamp | null; publishedAt: ContentTimestamp | null }
export interface PublicProjectAdminDetail extends PublicProjectAdminSummary { content: string }
export interface PublicProjectPublic { id: number; title: string; content: string; excerpt: string | null; thumbnailUrl: string | null; category: string; createdAt: ContentTimestamp | null; publishedAt: ContentTimestamp | null }
export interface ProductAdminSummary { id: number; name: string; imageUrl: string | null; category: string; price: ContentPrice; createdAt: ContentTimestamp | null; updatedAt: ContentTimestamp | null }
export interface ProductAdminDetail extends ProductAdminSummary { description: string | null }
export interface ProductPublic { id: number; name: string; imageUrl: string | null; category: string; description: string | null; price: ContentPrice }

const status = { type: 'string', enum: ['draft','published'] };
const newsCategory = { type: 'string', enum: ['news','recruitment','procurement'] };
const articleSummary = { id, title: text, excerpt: nullable(text), thumbnailUrl: nullable(text), category: text, status, createdAt: nullable(timestamp), updatedAt: nullable(timestamp), publishedAt: nullable(timestamp) };
const articlePublic = { id, title: text, content: text, excerpt: nullable(text), thumbnailUrl: nullable(text), category: text, publishedAt: nullable(timestamp) };
export const NewsAdminSummarySchema = object({ ...articleSummary, category: newsCategory, isHighlight: nullable(bool) });
export const NewsAdminDetailSchema = object({ ...articleSummary, category: newsCategory, isHighlight: nullable(bool), content: text });
export const NewsPublicSchema = object({ createdAt: nullable(timestamp), ...articlePublic, category: newsCategory, isHighlight: nullable(bool) });
export const MedicineAdminSummarySchema = object({ ...articleSummary });
export const MedicineAdminDetailSchema = object({ ...articleSummary, content: text });
export const MedicinePublicSchema = object({ ...articlePublic });
export const PublicProjectAdminSummarySchema = object({ ...articleSummary });
export const PublicProjectAdminDetailSchema = object({ ...articleSummary, content: text });
export const PublicProjectPublicSchema = object({ createdAt: nullable(timestamp), ...articlePublic });
const productSummary = { id, name: text, imageUrl: nullable(text), category: text, price, createdAt: nullable(timestamp), updatedAt: nullable(timestamp) };
export const ProductAdminSummarySchema = object(productSummary);
export const ProductAdminDetailSchema = object({ ...productSummary, description: nullable(text) });
export const ProductPublicSchema = object({ id, name: text, imageUrl: nullable(text), category: text, description: nullable(text), price });

// Public lists omit HTML; Task3 sanitizes the explicit detail bodies before activation.
export interface NewsPublicSummary extends Omit<NewsPublic, 'content'> {}
export interface NewsPublicDetail extends NewsPublic {}
export interface MedicinePublicSummary extends Omit<MedicinePublic, 'content'> {}
export interface MedicinePublicDetail extends MedicinePublic {}
export interface PublicProjectPublicSummary extends Omit<PublicProjectPublic, 'content'> {}
export interface PublicProjectPublicDetail extends PublicProjectPublic {}
const publicArticleSummary = { id, title: text, excerpt: nullable(text), thumbnailUrl: nullable(text), category: text, publishedAt: nullable(timestamp) };
export const NewsPublicSummarySchema = object({ createdAt: nullable(timestamp), ...publicArticleSummary, category: newsCategory, isHighlight: nullable(bool) });
export const NewsPublicDetailSchema = NewsPublicSchema;
export const MedicinePublicSummarySchema = object({ ...publicArticleSummary });
export const MedicinePublicDetailSchema = MedicinePublicSchema;
export const PublicProjectPublicSummarySchema = object({ createdAt: nullable(timestamp), ...publicArticleSummary });
export const PublicProjectPublicDetailSchema = PublicProjectPublicSchema;
