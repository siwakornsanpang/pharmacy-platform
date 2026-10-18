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
    googleMapsEmbed?: string | null;
    facebookUrl?: string | null;
    lineId?: string | null;
    youtubeUrl?: string | null;
}

export type NewsCategory = 'news' | 'recruitment' | 'procurement';

export interface News {
    id: number;
    title: string;
    content: string;
    excerpt?: string | null;
    thumbnailUrl?: string | null;
    status: 'draft' | 'published';
    category: NewsCategory;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    isHighlight: boolean;
}

const isBrowser = typeof window !== 'undefined';
// Browser: same-origin proxy avoids CORS. Server: hit production API (or NEXT_PUBLIC_API_URL).
export const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_URL ||
    (isBrowser ? '/api/proxy' : 'https://pharmacy-api-6w5d.onrender.com')
).replace(/\/$/, '');

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

export async function getWebSettings(): Promise<WebSettings> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return {
            siteNameTh: 'สภาเภสัชกรรม',
            siteNameEn: 'The Pharmacy Council of Thailand',
        };
    }

    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return {
            siteNameTh: 'สภาเภสัชกรรม',
            siteNameEn: 'The Pharmacy Council of Thailand',
        };
    }

    const res = await fetchWithTimeout(`${API_BASE_URL}/web-settings`, {
        next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch settings: ${res.statusText}`);
    }

    return res.json();
}

export async function getNews(): Promise<News[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/news`, {
            next: { revalidate: 60 }, // Cache for 1 minute
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch news: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

export async function getProducts(): Promise<any[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        // Fetch products, cached or with revalidate
        const res = await fetchWithTimeout(`${API_BASE_URL}/products`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export async function getNewsById(id: string): Promise<News | null> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return null;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/news/${id}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`Failed to fetch news item: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error(`Error fetching news item ${id}:`, error);
        return null;
    }
}

export interface BannerItem {
    id: string;
    url: string;
    originalUrl: string;
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

export async function getHomeContent(): Promise<HomeContent> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return { banners: [], popups: [] };
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/home-content`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch home content: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching home content:', error);
        return { banners: [], popups: [] };
    }
}

export async function getPharmacistHomeContent(): Promise<PharmacistHomeContent> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return { banners: [] };
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/pharmacist-home-content`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch pharmacist home content: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching pharmacist home content:', error);
        return { banners: [] };
    }
}

// ===== Agencies =====

export interface Agency {
    id: number;
    order: number;
    name: string;
    title: string | null;
    description: string | null;
    thumbnailUrl: string | null;
    originalThumbnailUrl: string | null;
    logoUrl: string | null;
    iconUrl: string | null;
    url: string;
    category: string;
    createdAt: string;
}

export async function getAgencies(): Promise<Agency[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/agencies`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch agencies: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching agencies:', error);
        return [];
    }
}

// ===== Laws =====

export interface LawItem {
    id: number;
    category: string;
    title: string;
    year: number | null;
    announcedAt: string | null;
    order: number;
    pdfUrl: string | null;
    status: string;
    createdAt: string;
}

export async function getLawsByCategory(category: string): Promise<LawItem[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/laws/${category}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch laws: ${res.statusText}`);
        }

        const data = await res.json();
        // Only return online status items
        return Array.isArray(data) ? data.filter((item: LawItem) => item.status === 'online') : [];
    } catch (error) {
        console.error('Error fetching laws:', error);
        return [];
    }
}

// ===== Services =====

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
    createdAt: string;
}

export async function getServices(): Promise<ServiceItem[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/services`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch services: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching services:', error);
        return [];
    }
}

export async function getPopularServices(): Promise<ServiceItem[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/services/popular`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch popular services: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching popular services:', error);
        return [];
    }
}


// ===== Policies =====

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
    description: string | null;
    summaryPdfUrl: string | null;
    order: number;
    projectCount: number;
    projects?: PolicyProject[];
}

export async function getPolicyCategories(): Promise<PolicyCategory[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/policy-categories`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch policy categories: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching policy categories:', error);
        return [];
    }
}


export async function getPolicyProjects(categoryId: number): Promise<PolicyProject[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/policy-projects?categoryId=${categoryId}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch policy projects: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error(`Error fetching policy projects for category ${categoryId}:`, error);
        return [];
    }
}

// ===== History / Council Directory =====

export interface HistoryTerm {
    id: number;
    term: string;
    startYear: string;
    endYear: string;
    presidentName: string;
    presidentImage: string;
    originalPresidentImage?: string;
    secretaryName: string;
    secretaryImage: string;
    originalSecretaryImage?: string;
    createdAt?: string;
}

export async function getHistory(): Promise<HistoryTerm[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/history`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch history: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
}
// ===== Honor / Hall of Fame =====

export interface HonorAward {
    id: number;
    order: number;
    name: string;
    description: string;
    createdAt: string;
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
    awardDetail: string;
    fullDetail?: string | null;
    imageUrl: string;
    originalImageUrl: string;
    videoUrl: string;
    createdAt: string;
}

export async function getHonorAwards(): Promise<HonorAward[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/honor-awards`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch honor awards: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching honor awards:', error);
        return [];
    }
}

export async function getHonorRecipients(): Promise<HonorRecipient[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/honor`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch honor recipients: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching honor recipients:', error);
        return [];
    }
}

// ===== Public Projects =====

export interface PublicProject {
    id: number;
    title: string;
    content: string;
    excerpt?: string | null;
    thumbnailUrl?: string | null;
    status: 'draft' | 'published';
    category: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
}

export async function getPublicProjects(): Promise<PublicProject[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/public-project`, {
            next: { revalidate: 60 }, // Cache for 1 minute
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch public projects: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching public projects:', error);
        return [];
    }
}

export async function getPublicProjectById(id: string): Promise<PublicProject | null> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return null;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/public-project/${id}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`Failed to fetch public project item: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error(`Error fetching public project item ${id}:`, error);
        return null;
    }
}

// ===== Other Services (ดาวน์โหลดเอกสาร) =====

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

export async function getOtherServiceCategories(): Promise<OtherServiceCategory[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/other-service-categories`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch other service categories: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching other service categories:', error);
        return [];
    }
}

export async function getOtherServiceItems(categoryId: number): Promise<OtherServiceItem[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/other-service-items/${categoryId}`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch other service items: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error(`Error fetching other service items for category ${categoryId}:`, error);
        return [];
    }
}

export async function getAllOtherServiceItems(): Promise<OtherServiceItem[]> {
    if (!API_BASE_URL) {
        console.error('NEXT_PUBLIC_API_URL is not defined');
        return [];
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/other-service-items`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch other service items: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching all other service items:', error);
        return [];
    }
}

// ===== Pharmacists =====

export interface PharmacistApiItem {
    id: number;
    name: string;
    registrationId: string;
    province?: string | null;
    status?: string | null;
    address?: string | null;
    expiryDate?: string | null;
    imageUrl?: string | null;
}

export async function searchPharmacists(query: string): Promise<PharmacistApiItem[] | null> {
    if (!API_BASE_URL || !query.trim()) {
        return null;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/pharmacists?q=${encodeURIComponent(query.trim())}`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Failed to search pharmacists: ${res.statusText}`);
        }

        return res.json();
    } catch (error) {
        console.error('Error searching pharmacists via API:', error);
        return null;
    }
}

