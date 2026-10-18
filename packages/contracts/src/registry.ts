export interface RegistryListQuery {
  q?: string;
  province?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'license';
  direction?: 'asc' | 'desc';
}
export interface RegistryPage<T> { items: T[]; total: number; page: number; pageSize: number }
export interface PublicPharmacist {
  id: number;
  name: string;
  registrationId: string;
  province: string | null;
  status: string | null;
  expiryDate: string | null;
  imageUrl: string | null;
}
export interface AdminPharmacist extends PublicPharmacist { address: string | null }
export interface RegistryIdentity { id: number; license: string; name: string; status: string | null }
export interface RegistryStats { total: number }
export interface RegistryFilters { provinces: string[]; statuses: string[] }

const id = { type: 'integer', minimum: 1, maximum: 2147483647 } as const;
const text = { type: 'string' } as const;
const nullableText = { anyOf: [text, { type: 'null' }] } as const;
const object = (properties: Readonly<Record<string, unknown>>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
}) as const;
const count = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const publicFields = {
  id, name: text, registrationId: text, province: nullableText, status: nullableText,
  expiryDate: nullableText, imageUrl: nullableText,
} as const;

export const PublicPharmacistSchema = object(publicFields);
export const AdminPharmacistSchema = object({ ...publicFields, address: nullableText });
export const RegistryIdentitySchema = object({ id, license: text, name: text, status: nullableText });
export const RegistryStatsSchema = object({ total: count });
export const RegistryFiltersSchema = object({
  provinces: { type: 'array', items: text },
  statuses: { type: 'array', items: text },
});
export const RegistryListQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    q: { type: 'string', maxLength: 200 },
    province: { type: 'string', minLength: 1, maxLength: 100 },
    status: { type: 'string', minLength: 1, maxLength: 100 },
    page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    sort: { type: 'string', enum: ['name', 'license'] },
    direction: { type: 'string', enum: ['asc', 'desc'] },
  },
} as const;
const page = (item: Readonly<Record<string, unknown>>) => object({
  items: { type: 'array', items: item }, total: count,
  page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  pageSize: { type: 'integer', minimum: 1, maximum: 100 },
});
export const PharmacistPageSchema = page(PublicPharmacistSchema);
export const AdminPharmacistPageSchema = page(AdminPharmacistSchema);
