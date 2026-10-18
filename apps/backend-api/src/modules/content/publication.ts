export function isPublicArticle(article: { status: string; publishedAt: Date | null }, now: Date): boolean {
  return article.status === 'published' && (article.publishedAt === null || article.publishedAt.getTime() <= now.getTime());
}
/** Zone-free legacy storage is UTC, independent of the pg connection/Node timezone. */
export const publicArticlePredicate = "status='published' AND (published_at IS NULL OR published_at AT TIME ZONE 'UTC' <= $1::timestamptz)";
