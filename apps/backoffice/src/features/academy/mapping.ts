export type AcademyAdminCourse = {
  id: number;
  title: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  categoryName: string | null;
  instructorName: string | null;
  cpeCredits: string | null;
};

export type AcademyOrder = {
  id: number;
  courseTitle: string;
  displayName: string | null;
  pharmacistLicense: string;
  amount: string;
  status: string;
  slipUrl: string | null;
};

export type AcademyRefund = {
  id: number;
  courseTitle: string;
  displayName: string | null;
  pharmacistLicense: string;
  amount: string;
  reason: string;
  status: string;
};

export type AcademyEnrollment = {
  id: number;
  courseTitle: string;
  pharmacistLicense: string;
  displayName: string | null;
  status: string;
  progressPercent: number;
  examPassed: boolean;
  enrolledAt: string | null;
};

export function pageRows<T>(rows: T[], page: number, pageSize: number, match: (item: T) => boolean) {
  const filtered = rows.filter(match);
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length };
}

export function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
