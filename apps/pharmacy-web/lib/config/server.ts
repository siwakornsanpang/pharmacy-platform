import { isIP } from 'node:net';
import 'server-only';

export interface ServerConfig {
  backendApiUrl: string;
  appOrigin: string;
  conferenceApiUrl: string;
  jsonMetadataMaxBytes: number;
  pharmacySessionSecret: string;
  academyBridgeKey: string;
}

type Environment = Record<string, string | undefined>;

export function getServerConfig(env: Environment = process.env): ServerConfig {
  const invalid = (name: string): never => { throw new Error(`Invalid or missing ${name}`); };
  const required = (name: string) => env[name]?.trim() || invalid(name);
  const development = env.NODE_ENV === 'development';
  const loopback = (url: URL) => {
    const hostname = url.hostname.replace(/\.$/, '');
    return hostname === 'localhost' || hostname === '[::1]' || (isIP(hostname) === 4 && hostname.startsWith('127.'));
  };
  const origin = (name: string) => {
    let url: URL;
    try { url = new URL(required(name)); } catch { return invalid(name); }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*') ||
      (url.protocol !== 'https:' && !(development && loopback(url) && url.protocol === 'http:')) ||
      (!development && loopback(url))) return invalid(name);
    return url.origin;
  };
  const backendApiUrl = origin('BACKEND_API_URL');
  const appOrigin = origin('PHARMACY_WEB_ORIGIN');
  const flag = (name: string) => {
    if (env[name] !== undefined && env[name] !== 'true' && env[name] !== 'false') invalid(name);
    return env[name] === 'true';
  };
  const allowLocalUiBypass = flag('ALLOW_LOCAL_UI_BYPASS');
  if (allowLocalUiBypass) invalid('ALLOW_LOCAL_UI_BYPASS');
  const pharmacySessionSecret = required('PHARMACY_SESSION_SECRET');
  if (pharmacySessionSecret.length < 32) invalid('PHARMACY_SESSION_SECRET');
  const academyBridgeKey = required('ACADEMY_BRIDGE_KEY');
  if (academyBridgeKey.length < 16) invalid('ACADEMY_BRIDGE_KEY');
  const conferenceApiUrl = origin('CONFERENCE_API_URL');
  return { backendApiUrl, appOrigin, conferenceApiUrl, jsonMetadataMaxBytes: 4_000_000, pharmacySessionSecret, academyBridgeKey };
}
