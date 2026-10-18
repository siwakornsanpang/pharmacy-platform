import { listed } from '../listed';

export type PolicyCategoryRecord = {
  id: number;
  title: string;
  order: number;
  createdAt: string;
  projectCount: number;
};

export type PolicyProjectStatus = 'planned' | 'ongoing' | 'completed' | 'delayed' | 'terminated';

export type PolicyProjectRecord = {
  id: number;
  categoryId: number;
  name: string;
  summaryPdfUrl: string | null;
  status: PolicyProjectStatus;
  order: number;
  createdAt: string;
};

const projectStatuses: readonly PolicyProjectStatus[] = ['planned', 'ongoing', 'completed', 'delayed', 'terminated'];

export function mapPolicyCategory(value: unknown): PolicyCategoryRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    order: Number(row.order ?? 0),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    projectCount: Number(row.projectCount ?? 0),
  };
}

export function mapPolicyProject(value: unknown): PolicyProjectRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id),
    categoryId: Number(row.categoryId ?? 0),
    name: String(row.name ?? ''),
    summaryPdfUrl: typeof row.summaryPdfUrl === 'string' ? row.summaryPdfUrl : null,
    status: projectStatuses.includes(row.status as PolicyProjectStatus) ? (row.status as PolicyProjectStatus) : 'planned',
    order: Number(row.order ?? 0),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
  };
}

export function mapPolicyCategoryList(data: unknown): PolicyCategoryRecord[] {
  return listed(data).map(mapPolicyCategory);
}

export function mapPolicyProjectList(data: unknown): PolicyProjectRecord[] {
  return listed(data).map(mapPolicyProject);
}
