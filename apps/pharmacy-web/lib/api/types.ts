import type { ApiOptions } from '@pharmacy/http';
export { ApiError, apiPath, isAddressableSegment, rejectsAuthorityHeaders } from '@pharmacy/http';
export type { ApiOptions } from '@pharmacy/http';

export type ServerApiOptions = ApiOptions & {
    staffToken?: string;
};
export interface BackendRouteRule {
    readonly method: string;
    readonly path: RegExp;
    readonly queryKeys: readonly string[];
    readonly actor: 'public' | 'staff' | 'member';
}
