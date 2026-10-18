import { validateContentImageSources, type ContentImageSource } from '@pharmacy/contracts/content';
import { isIP } from 'node:net';
export interface BackendConfig {
  contentImageSources: ContentImageSource[];
  databaseUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  staffSessionTtlSeconds: number;
  corsOrigins: string[];
  academyBridgeKey: string;
  publicUploadBaseUrl: string;
  uploadMaxBytes: number;
  uploadSniffBytes: number;
  privateAssetTtlSeconds: number;
  port: number;
}

type Environment = Record<string, string | undefined>;

export function getServerConfig(env: Environment = process.env): BackendConfig {
  const invalid = (name: string): never => { throw new Error(`Invalid or missing ${name}`); };
  const required = (name: string) => env[name]?.trim() || invalid(name);
  const positiveInteger = (name: string, fallback?: number) => {
    const value = env[name] === undefined && fallback !== undefined ? fallback : Number(required(name));
    return Number.isSafeInteger(value) && value > 0 ? value : invalid(name);
  };
  const development = env.NODE_ENV === 'development';
  const origin = (name: string, value = required(name), httpsOnly = false) => {
    let url: URL;
    try { url = new URL(value.trim()); } catch { return invalid(name); }
    const hostname = url.hostname.replace(/\.$/, '');
    const loopback = hostname === 'localhost' || hostname === '[::1]' || (isIP(hostname) === 4 && hostname.startsWith('127.'));
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*') ||
      (url.protocol !== 'https:' && !(development && loopback && !httpsOnly && url.protocol === 'http:')) ||
      (!development && loopback)) return invalid(name);
    return url.origin;
  };
  const databaseUrl = required('DATABASE_URL');
  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length <= 1 || url.hash) invalid('DATABASE_URL');
  } catch { invalid('DATABASE_URL'); }
  const corsOrigins = required('CORS_ORIGINS').split(',').map((value) => origin('CORS_ORIGINS', value));
  const uploadMaxBytes = positiveInteger('UPLOAD_MAX_BYTES', 104857600);
  const uploadSniffBytes = positiveInteger('UPLOAD_SNIFF_BYTES', 65536);
  if (uploadSniffBytes > 65536 || uploadSniffBytes > uploadMaxBytes) invalid('UPLOAD_SNIFF_BYTES');
  const port = positiveInteger('PORT', 8080);
  if (port > 65535) invalid('PORT');
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) invalid('JWT_SECRET');
  let contentImageSources: ContentImageSource[];
  try { contentImageSources = validateContentImageSources(JSON.parse(env.CONTENT_IMAGE_SOURCES ?? '[]')); }
  catch { return invalid('CONTENT_IMAGE_SOURCES'); }
  return {
    contentImageSources,
    databaseUrl,
    supabaseUrl: origin('SUPABASE_URL'),
    supabaseKey: required('SUPABASE_KEY'),
    jwtSecret,
    jwtIssuer: required('JWT_ISSUER'),
    jwtAudience: required('JWT_AUDIENCE'),
    staffSessionTtlSeconds: positiveInteger('STAFF_SESSION_TTL_SECONDS', 28800),
    corsOrigins: [...new Set(corsOrigins)],
    academyBridgeKey: required('ACADEMY_BRIDGE_KEY'),
    publicUploadBaseUrl: origin('PUBLIC_UPLOAD_BASE_URL', required('PUBLIC_UPLOAD_BASE_URL'), true),
    uploadMaxBytes,
    uploadSniffBytes,
    privateAssetTtlSeconds: positiveInteger('PRIVATE_ASSET_TTL_SECONDS', 300),
    port,
  };
}
