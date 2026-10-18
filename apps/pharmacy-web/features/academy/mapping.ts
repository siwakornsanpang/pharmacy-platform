export type {
  AcademyCertificate,
  AcademyCommandResult,
  AcademyCourse,
  AcademyCourseDetail,
  AcademyLearningState,
} from "@pharmacy/contracts/academy";
export type { StagedAsset } from "@pharmacy/contracts/media";

export type AcademyCategory = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  courseCount: number;
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

export type AcademyEnrollment = {
  courseId: number;
  title: string;
  status: string;
  progressPercent: number;
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

export function academyAssetDownloadUrl(assetId: string) {
  return `/api/academy/assets/${assetId}/download`;
}

export function academyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
