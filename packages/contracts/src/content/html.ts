/** Pure values only: each app owns its sanitizer runtime and rendering boundary. */
export const CONTENT_RICH_TAGS = ['p','br','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','s','strike','sub','sup','ol','ul','li','span','blockquote','pre','code','a','img','iframe'] as const;
export const CONTENT_RICH_ATTRIBUTES = ['class','style','data-list','contenteditable','href','target','rel','src','alt','width','height','frameborder','allowfullscreen'] as const;
export const CONTENT_FONT_SIZES = ['16px','18px','20px','24px','28px','32px','48px','64px'] as const;
export interface ContentImageSource { origin: string; pathPrefix: string }
const unsafeUrlText = (value: string) => /[\s\u0000-\u001f\u007f\\]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|2e|2f|5c)/i.test(value);
function absoluteUrl(value: string): URL | null {
  if (!value || unsafeUrlText(value) || !/^[a-z]+:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    const authority = value.slice(value.indexOf('://') + 3).split(/[/?#]/)[0]!;
    if (url.username || url.password || authority.includes('@') || authority.includes(':') || !['http:','https:'].includes(url.protocol)) return null;
    return url;
  } catch { return null; }
}
export function isContentLink(value: string): boolean {
  if (unsafeUrlText(value)) return false;
  if (/^(mailto|tel):[^<>"']+$/i.test(value)) return true;
  return absoluteUrl(value) !== null;
}
export function isContentClass(value: string): boolean {
  return /^(?:ql-align-(?:center|right|justify)|ql-indent-[1-8]|ql-direction-rtl|ql-font-(?:serif|monospace)|ql-syntax|ql-ui|ql-video)$/.test(value);
}
export function isContentDimension(value: string): boolean { return /^[1-9]\d{0,3}$/.test(value) && Number(value) <= 4096; }
export function isContentColor(value: string): boolean {
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) return true;
  const rgb = /^rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/i.exec(value);
  return Boolean(rgb && rgb.slice(1).every(channel => Number(channel) <= 255));
}
export function isContentStyleValue(property: string, value: string): boolean {
  return property === 'font-size' ? (CONTENT_FONT_SIZES as readonly string[]).includes(value)
    : ['color','background-color'].includes(property) && isContentColor(value);
}
export function validateContentImageSources(input: unknown): ContentImageSource[] {
  if (!Array.isArray(input) || input.length > 20) throw new Error('Invalid Content image sources');
  return input.map(rule => {
    if (!rule || typeof rule !== 'object' || Object.keys(rule).sort().join(',') !== 'origin,pathPrefix') throw new Error('Invalid Content image source');
    const {origin,pathPrefix} = rule as ContentImageSource;
    const url = typeof origin === 'string' ? absoluteUrl(origin) : null;
    if (!url || url.origin !== origin || url.protocol !== 'https:' || origin.includes('*') || url.hostname.endsWith('.') ||
        typeof pathPrefix !== 'string' || !/^\/(?:[A-Za-z0-9_-]+\/)+$/.test(pathPrefix) ||
        /\/(?:sign|private|authenticated)(?:\/|$)/i.test(pathPrefix)) throw new Error('Invalid Content image source');
    return {origin,pathPrefix};
  });
}
/** Resolve once and emit this value: a renderer's document origin must never change image authority. */
export function resolveContentImage(value: string, sources: readonly ContentImageSource[]): string | null {
  if (unsafeUrlText(value) || /\/\.{1,2}(?:\/|[?#]|$)/.test(value)) return null;
  const relative = value.startsWith('/') && !value.startsWith('//');
  const url = absoluteUrl(relative && sources[0] ? sources[0].origin + value : value);
  if (!url || url.search || url.hash) return null;
  let path: string;
  try { path = decodeURIComponent(url.pathname); } catch { return null; }
  const segments = path.slice(1).split('/');
  // One strict decode only: residual escapes and reserved separators cannot acquire a second meaning.
  if (segments.some(segment => !/^[\p{L}\p{N}\p{M}_.~-]+$/u.test(segment) ||
      segment === '.' || segment === '..' || /^(?:sign|private|authenticated)$/i.test(segment))) return null;
  if (!sources.some(source => url.origin === source.origin && path.startsWith(source.pathPrefix))) return null;
  return url.origin + '/' + segments.map(segment => encodeURIComponent(segment)).join('/');
}
export function isContentImage(value: string, sources: readonly ContentImageSource[]): boolean {
  return resolveContentImage(value,sources) !== null;
}
export function isContentVideo(value: string): boolean {
  const url = absoluteUrl(value);
  if (!url || url.protocol !== 'https:' || url.hash || url.search.length > 512) return false;
  if (['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) {
    if (!/^\/embed\/[A-Za-z0-9_-]+$/.test(url.pathname)) return false;
    const keys = new Set<string>();
    for (const [key,v] of url.searchParams) {
      if (keys.has(key) || !['showinfo','rel','controls','start','end','autoplay','mute','loop','playlist'].includes(key) || !/^[A-Za-z0-9_,-]{1,100}$/.test(v)) return false;
      keys.add(key);
    }
    return true;
  }
  return url.hostname === 'player.vimeo.com' && /^\/video\/[1-9]\d*\/?$/.test(url.pathname) && !url.search;
}
declare const googleMapsEmbedBrand: unique symbol;
export type GoogleMapsEmbedUrl = string & { readonly [googleMapsEmbedBrand]: true };
export function contentGoogleMapsEmbedUrl(value: string): GoogleMapsEmbedUrl | null {
  const url = absoluteUrl(value);
  return url && url.protocol === 'https:' && url.hostname === 'www.google.com' && url.pathname === '/maps/embed' &&
    !value.includes('#') && url.search.length > 1 && url.search.length <= 2048 ? url.href as GoogleMapsEmbedUrl : null;
}
