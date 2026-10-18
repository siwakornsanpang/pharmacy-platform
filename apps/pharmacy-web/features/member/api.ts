import {
  getPharmacistById,
  isExactLicenseMatch,
  matchesNameKeywords,
  mockPharmacistsList,
  type PharmacistData,
  type SearchType,
} from "./mock-data";

export { getPharmacistById, mockPharmacistsList };
export type { PharmacistData, SearchType };

export function searchMemberDirectory(
  searchType: SearchType,
  searchTerm: string,
): PharmacistData[] {
  if (searchType === "license") {
    return mockPharmacistsList.filter((item) =>
      isExactLicenseMatch(item.licenseNo, searchTerm),
    );
  }
  return mockPharmacistsList.filter((item) =>
    matchesNameKeywords(item.name, searchTerm),
  );
}

export async function saveMemberProfile(_payload: unknown): Promise<{ saved: true }> {
  return { saved: true };
}

export function submitContactInquiry(_payload: unknown): never {
  throw new Error("contact form stays a local mock");
}
