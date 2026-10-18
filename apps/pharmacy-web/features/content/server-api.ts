import 'server-only';
import { backendFetch } from "@/lib/api/server";
import { onlineItems, publishedArticle } from "./mapping";
import type { WebSettings, News, HomeContent, PharmacistHomeContent, Agency, LawItem, ServiceItem, PolicyCategory, PolicyProject, HistoryTerm, HonorAward, HonorRecipient, PublicProject, OtherServiceCategory, OtherServiceItem } from "./mapping";
export type * from "./mapping";

export async function getWebSettings(): Promise<WebSettings> {
 try {
  return await backendFetch<WebSettings>(`/web-settings`, {cache: "no-store"});
 } catch (error) {
  console.error("Content getWebSettings failed:", error);
  return { siteNameTh: "", siteNameEn: "", googleMapsEmbedUrl: null };
 }
}
export async function getNews(): Promise<News[]> {
 try { return (await backendFetch<News[]>(`/news`, {cache: "no-store"})).map(publishedArticle); } catch (error) { console.error("Content getNews failed:", error); return []; }
}
export async function getProducts(): Promise<any[]> {
 try { return await backendFetch<any[]>(`/products`, {cache: "no-store"}); } catch (error) { console.error("Content getProducts failed:", error); return []; }
}
export async function getNewsById(id: string): Promise<News | null> {
 try { return publishedArticle(await backendFetch<News | null>(`/news/${encodeURIComponent(id)}`, {cache: "no-store"})); } catch (error) { console.error("Content getNewsById failed:", error); return null; }
}
export async function getHomeContent(): Promise<HomeContent> {
 try { return normalizeHome(await backendFetch<HomeContent>(`/home-content`, {cache: "no-store"})); } catch (error) { console.error("Content getHomeContent failed:", error); return { banners: [], popups: [] }; }
}
export async function getPharmacistHomeContent(): Promise<PharmacistHomeContent> {
 try { return normalizeHome(await backendFetch<PharmacistHomeContent>(`/pharmacist-home-content`, {cache: "no-store"})); } catch (error) { console.error("Content getPharmacistHomeContent failed:", error); return { banners: [] }; }
}
export async function getAgencies(): Promise<Agency[]> {
 try { return await backendFetch<Agency[]>(`/agencies`, {cache: "no-store"}); } catch (error) { console.error("Content getAgencies failed:", error); return []; }
}
export async function getLawsByCategory(category: string): Promise<LawItem[]> {
 try { return onlineItems(await backendFetch<LawItem[]>(`/laws/${encodeURIComponent(category)}`, {cache: "no-store"})); } catch (error) { console.error("Content getLawsByCategory failed:", error); return []; }
}
export async function getServices(): Promise<ServiceItem[]> {
 try { return await backendFetch<ServiceItem[]>(`/services`, {cache: "no-store"}); } catch (error) { console.error("Content getServices failed:", error); return []; }
}
export async function getPopularServices(): Promise<ServiceItem[]> {
 try { return await backendFetch<ServiceItem[]>(`/services/popular`, {cache: "no-store"}); } catch (error) { console.error("Content getPopularServices failed:", error); return []; }
}
export async function getPolicyCategories(): Promise<PolicyCategory[]> {
 try { return await backendFetch<PolicyCategory[]>(`/policy-categories`, {cache: "no-store"}); } catch (error) { console.error("Content getPolicyCategories failed:", error); return []; }
}
export async function getPolicyProjects(categoryId: number): Promise<PolicyProject[]> {
 try { return await backendFetch<PolicyProject[]>(`/policy-projects?categoryId=${categoryId}`, {cache: "no-store"}); } catch (error) { console.error("Content getPolicyProjects failed:", error); return []; }
}
export async function getHistory(): Promise<HistoryTerm[]> {
 try { return await backendFetch<HistoryTerm[]>(`/history`, {cache: "no-store"}); } catch (error) { console.error("Content getHistory failed:", error); return []; }
}
export async function getHonorAwards(): Promise<HonorAward[]> {
 try { return await backendFetch<HonorAward[]>(`/honor-awards`, {cache: "no-store"}); } catch (error) { console.error("Content getHonorAwards failed:", error); return []; }
}
export async function getHonorRecipients(): Promise<HonorRecipient[]> {
 try { return await backendFetch<HonorRecipient[]>(`/honor`, {cache: "no-store"}); } catch (error) { console.error("Content getHonorRecipients failed:", error); return []; }
}
export async function getHonorById(id: number): Promise<HonorRecipient | null> {
 try { return await backendFetch<HonorRecipient | null>(`/honor/${id}`, {cache: "no-store"}); } catch (error) { console.error("Content getHonorById failed:", error); return null; }
}
export async function getPublicProjects(): Promise<PublicProject[]> {
 try { return (await backendFetch<PublicProject[]>(`/public-project`, {cache: "no-store"})).map(publishedArticle); } catch (error) { console.error("Content getPublicProjects failed:", error); return []; }
}
export async function getPublicProjectById(id: string): Promise<PublicProject | null> {
 try { return publishedArticle(await backendFetch<PublicProject | null>(`/public-project/${encodeURIComponent(id)}`, {cache: "no-store"})); } catch (error) { console.error("Content getPublicProjectById failed:", error); return null; }
}
export async function getOtherServiceCategories(): Promise<OtherServiceCategory[]> {
 try { return await backendFetch<OtherServiceCategory[]>(`/other-service-categories`, {cache: "no-store"}); } catch (error) { console.error("Content getOtherServiceCategories failed:", error); return []; }
}
export async function getOtherServiceItems(categoryId: number): Promise<OtherServiceItem[]> {
 try { return onlineItems(await backendFetch<OtherServiceItem[]>(`/other-service-items/${categoryId}`, {cache: "no-store"})); } catch (error) { console.error("Content getOtherServiceItems failed:", error); return []; }
}
export async function getAllOtherServiceItems(): Promise<OtherServiceItem[]> {
 try { return onlineItems(await backendFetch<OtherServiceItem[]>(`/other-service-items`, {cache: "no-store"})); } catch (error) { console.error("Content getAllOtherServiceItems failed:", error); return []; }
}
export async function getCouncil(): Promise<import("@/components/public/02_about/committee/CommitteeContent").CouncilMember[]> {
 try { return await backendFetch<import("@/components/public/02_about/committee/CommitteeContent").CouncilMember[]>(`/council`, {cache: "no-store"}); } catch (error) { console.error("Content getCouncil failed:", error); return []; }
}

function normalizeHome<T extends {banners: unknown}>(home: T): T { return {...home, banners: home.banners ?? [], ...("popups" in home ? {popups: home.popups ?? []} : {})}; }
