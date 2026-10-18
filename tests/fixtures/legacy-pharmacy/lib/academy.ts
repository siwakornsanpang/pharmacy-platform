import { API_BASE_URL } from "./api";

export type AcademyCategory = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  courseCount: number;
};

export type AcademyCourse = {
  id: number;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  durationLabel: string | null;
  cpeLabel: string;
  categoryName: string | null;
  categoryColor: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  studentCount: number;
  rating: number | null;
  reviewCount: number;
  outcomes: string[];
  isFeatured: boolean;
  format: "online" | "onsite";
  venue: string | null;
  trainingStartsAt: string | null;
  trainingEndsAt: string | null;
};

export function formatTraining(start?: string | null, end?: string | null) {
  if (!start) return "";
  const starts = new Date(start);
  const startText = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short" }).format(starts);
  if (!end) return startText;
  const ends = new Date(end);
  const sameDay = starts.toDateString() === ends.toDateString();
  const endText = new Intl.DateTimeFormat("th-TH", sameDay ? { timeStyle: "short" } : { dateStyle: "long", timeStyle: "short" }).format(ends);
  return `${startText} – ${endText}`;
}

export type AcademyCourseDetail = AcademyCourse & {
  cpeCredits: string | null;
  conferenceCode: string | null;
  price: string;
  audience: string;
  instructorExpertise: string | null;
  instructorImageUrl: string | null;
  lessons: { id: number; title: string; description: string | null }[];
};

export type AcademyInstructor = {
  id: number;
  name: string;
  title: string | null;
  expertise: string | null;
  imageUrl: string | null;
};

export type AcademyReview = {
  id: number;
  rating: number;
  body: string;
  reviewerName: string;
  reviewerRole: string | null;
  courseTitle: string;
};

export type AcademyStats = {
  courseCount: number;
  learnerCount: number;
  instructorCount: number;
};

async function readJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Academy API ${res.status}`);
  return res.json();
}

export function getAcademyCategories() {
  return readJson<AcademyCategory[]>("/academy/categories");
}

export function getAcademyCourses(params?: { category?: string; q?: string; featured?: boolean }) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.q) query.set("q", params.q);
  if (params?.featured) query.set("featured", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return readJson<AcademyCourse[]>(`/academy/courses${suffix}`);
}

export function getAcademyCourse(id: string) {
  return readJson<AcademyCourseDetail>(`/academy/courses/${id}`);
}

export function getAcademyInstructors() {
  return readJson<AcademyInstructor[]>("/academy/instructors");
}

export function getAcademyReviews() {
  return readJson<AcademyReview[]>("/academy/reviews");
}

export function getAcademyStats() {
  return readJson<AcademyStats>("/academy/stats");
}
