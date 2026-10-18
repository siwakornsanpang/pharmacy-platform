export interface WebSettings {
    id?: number;
    siteNameTh: string;
    siteNameEn: string;
    slogan?: string | null;
    logoPath?: string | null;
    address?: string | null;
    phone?: string | null;
    fax?: string | null;
    email?: string | null;
    googleMapsUrl?: string | null;
    googleMapsEmbedUrl: import("@pharmacy/contracts/content").GoogleMapsEmbedUrl | null;
    facebookUrl?: string | null;
    lineId?: string | null;
    youtubeUrl?: string | null;
}

export type NewsCategory = 'news' | 'recruitment' | 'procurement';

export interface News {
    id: number;
    title: string;
    content?: string;
    createdAt: string | null;
    excerpt?: string | null;
    thumbnailUrl?: string | null;
    status: 'draft' | 'published';
    category: NewsCategory;
    publishedAt?: string | null;
    isHighlight: boolean;
}

export interface BannerItem {
    id: string;
    url: string;
    title: string;
    clickable: boolean;
    linkUrl: string;
    active: boolean;
    order: number;
}

export interface HomeContent {
    banners: BannerItem[];
    popups: any[];
}

export interface PharmacistHomeContent {
    banners: BannerItem[];
}

export interface Agency {
    id: number;
    order: number;
    name: string;
    title: string | null;
    description: string | null;
    thumbnailUrl: string | null;
    logoUrl: string | null;
    iconUrl: string | null;
    url: string;
    category: string;
}

export interface LawItem {
    id: number;
    category: string;
    title: string;
    year: number | null;
    announcedAt: string | null;
    order: number;
    pdfUrl: string | null;
    status: string;
}

export interface ServiceItem {
    id: number;
    name: string;
    shortName: string | null;
    iconUrl: string | null;
    order: number;
    description: string | null;
    linkUrl: string | null;
    isPopular: boolean;
    popularOrder: number;
}

export interface PolicyProject {
    id: number;
    categoryId: number;
    name: string;
    summaryPdfUrl: string | null;
    status: 'planned' | 'ongoing' | 'completed' | 'delayed' | 'terminated';
    order: number;
}

export interface PolicyCategory {
    id: number;
    title: string;
    description?: string | null;
    summaryPdfUrl?: string | null;
    order: number;
    projectCount: number;
    projects?: PolicyProject[];
}

export interface HistoryTerm {
    id: number;
    term: string;
    startYear: string;
    endYear: string;
    presidentName: string;
    presidentImage: string;
    secretaryName: string;
    secretaryImage: string;
}

export interface HonorAward {
    id: number;
    order: number;
    name: string;
    description: string;
    recipientCount: number;
}

export interface HonorRecipient {
    id: number;
    awardId: number;
    order: number;
    prefix: string;
    name: string;
    awardName: string;
    workName: string;
    awardDetail?: string | null;
    fullDetail?: string | null;
    imageUrl: string;
    videoUrl: string;
}

export interface PublicProject {
    id: number;
    title: string;
    content?: string;
    createdAt: string | null;
    excerpt?: string | null;
    thumbnailUrl?: string | null;
    status: 'draft' | 'published';
    category: string;
    publishedAt?: string | null;
}

export interface OtherServiceCategory {
    id: number;
    name: string;
    order: number;
}

export interface OtherServiceItem {
    id: number;
    categoryId: number;
    name: string;
    status: string;
    pdfUrl: string | null;
    order: number;
}


// Public endpoints enforce visibility before serialization; preserve existing display filters.
export function onlineItems<T>(items: T[]): (T & {status: 'online'})[] {
 return items.map(item => ({...item, status: 'online'}));
}

export function publishedArticle<T>(item: T): T & {status: "published"} { return {...item, status: "published"}; }
