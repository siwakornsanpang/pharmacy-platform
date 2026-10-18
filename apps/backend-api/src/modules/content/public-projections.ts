import type * as C from '@pharmacy/contracts/content';
import { jsonTimestamp } from './routes/read-query';
import { parseGoogleMapsEmbed } from './rich-text';
type Row = Record<string, unknown>;

export function publicProduct(row: Row): C.ProductPublic {
  return {
    id: row.id as number,
    name: row.name as string,
    imageUrl: row.image_url as string | null,
    category: row.category as string,
    description: row.description as string | null,
    price: row.price as string,
  };
}
export function publicLaw(row: Row): C.LawPublic {
  return {
    id: row.id as number,
    category: row.category as string,
    title: row.title as string,
    year: row.year as number | null,
    announcedAt: row.announced_at as string | null,
    order: row.order as number | null,
    pdfUrl: row.pdf_url as string | null,
  };
}
export function publicPolicyCategory(row: Row): C.PolicyCategoryPublic {
  return {
    id: row.id as number,
    title: row.title as string,
    order: row.order as number,
    projectCount: Number(row.project_count),
  };
}
export function publicPolicyProject(row: Row): C.PolicyProjectPublic {
  return {
    id: row.id as number,
    categoryId: row.category_id as number,
    name: row.name as string,
    summaryPdfUrl: row.summary_pdf_url as string | null,
    status: row.status as string,
    order: row.order as number,
  };
}
export function publicOtherCategory(row: Row): C.OtherServiceCategoryPublic {
  return {
    id: row.id as number,
    name: row.name as string,
    order: row.order as number,
    itemCount: Number(row.item_count),
  };
}
export function publicOtherItem(row: Row): C.OtherServiceItemPublic {
  return {
    id: row.id as number,
    categoryId: row.category_id as number,
    name: row.name as string,
    pdfUrl: row.pdf_url as string | null,
    order: row.order as number,
  };
}
export function publicCouncil(row: Row): C.CouncilPublic {
  return {
    id: row.id as number,
    prefix: row.prefix as string | null,
    name: row.name as string,
    position: row.position as string,
    type: row.type as string,
    imageUrl: row.image_url as string | null,
    order: row.order as number,
    background: row.background as string | null,
  };
}
export function publicHistory(row: Row): C.HistoryPublic {
  return {
    id: row.id as number,
    term: row.term as string,
    startYear: row.start_year as string,
    endYear: row.end_year as string,
    presidentName: row.president_name as string,
    secretaryName: row.secretary_name as string,
    presidentImage: row.president_image as string | null,
    secretaryImage: row.secretary_image as string | null,
  };
}
export function publicAgency(row: Row): C.AgencyPublic {
  return {
    id: row.id as number,
    order: row.order as number,
    name: row.name as string,
    title: row.title as string | null,
    description: row.description as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    logoUrl: row.logo_url as string | null,
    iconUrl: row.icon_url as string | null,
    url: row.url as string,
    category: row.category as string,
  };
}
export function publicHonorAward(row: Row): C.HonorAwardPublic {
  return {
    id: row.id as number,
    order: row.order as number,
    name: row.name as string,
    description: row.description as string | null,
    recipientCount: Number(row.recipient_count),
  };
}
export function publicHonor(row: Row): C.HonorPublicSummary {
  return {
    awardDetail: row.award_detail as string | null,
    id: row.id as number,
    awardId: row.award_id as number,
    order: row.order as number,
    prefix: row.prefix as string | null,
    name: row.name as string,
    awardName: row.award_name as string | null,
    workName: row.work_name as string | null,
    imageUrl: row.image_url as string | null,
    videoUrl: row.video_url as string | null,
  };
}
export function publicHonorDetail(row: Row, sanitize: (html: string) => string): C.HonorPublicDetail {
  return { ...publicHonor(row), awardDetail: row.award_detail as string | null,
    fullDetail: row.full_detail === null ? null : sanitize(row.full_detail as string) };
}
export function publicService(row: Row): C.ServicePublic {
  return {
    id: row.id as number,
    name: row.name as string,
    shortName: row.short_name as string | null,
    iconUrl: row.icon_url as string | null,
    order: row.order as number,
    description: row.description as string | null,
    linkUrl: row.link_url as string | null,
    isPopular: row.is_popular as boolean | null,
    popularOrder: row.popular_order as number | null,
  };
}
export function publicSettings(row: Row): C.WebSettingsPublic {
  return {
    siteNameTh: row.site_name_th as string,
    siteNameEn: row.site_name_en as string,
    slogan: row.slogan as string | null,
    logoPath: row.logo_path as string | null,
    address: row.address as string | null,
    phone: row.phone as string | null,
    fax: row.fax as string | null,
    email: row.email as string | null,
    googleMapsUrl: row.google_maps_url as string | null,
    facebookUrl: row.facebook_url as string | null,
    lineId: row.line_id as string | null,
    youtubeUrl: row.youtube_url as string | null,
    googleMapsEmbedUrl: parseGoogleMapsEmbed(row.google_maps_embed),
  };
}
export function publicArticle(row: Row): C.MedicinePublicSummary {
  return { id: row.id as number, title: row.title as string, excerpt: row.excerpt as string | null,
    thumbnailUrl: row.thumbnail_url as string | null, category: row.category as string, publishedAt: jsonTimestamp(row.published_at) };
}
export function publicNews(row: Row): C.NewsPublicSummary {
  return { ...publicArticle(row), createdAt: jsonTimestamp(row.created_at), category: row.category as C.NewsCategory, isHighlight: row.is_highlight as boolean | null };
}
export function publicBanner(row: C.ContentBannerAdmin): C.ContentBannerPublic {
  return { id: row.id, url: row.url, title: row.title, clickable: row.clickable, linkUrl: row.linkUrl, active: row.active, order: row.order };
}
export function publicPopup(row: C.ContentPopup): C.ContentPopup {
  return { id: row.id, url: row.url, title: row.title, active: row.active, order: row.order };
}

export function publicProject(row: Row): C.PublicProjectPublicSummary {
  return { ...publicArticle(row), createdAt: jsonTimestamp(row.created_at) };
}
