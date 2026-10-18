import DOMPurify from 'isomorphic-dompurify';
import {
  CONTENT_RICH_TAGS, CONTENT_RICH_ATTRIBUTES, isContentClass, isContentStyleValue, isContentDimension,
  isContentLink, resolveContentImage, isContentVideo, validateContentImageSources, contentGoogleMapsEmbedUrl,
  isContentTimestamp, isContentDate, type ContentImageSource, type GoogleMapsEmbedUrl,
} from '@pharmacy/contracts/content';
/** No global hooks/config: per-call DOM fragments and immutable, app-configured trust. */
export function createRichTextSanitizer(input: readonly ContentImageSource[] = []): (html: string) => string {
  const sources = validateContentImageSources(input);
  return html => {
    const fragment = DOMPurify.sanitize(html, { ALLOWED_TAGS: [...CONTENT_RICH_TAGS], ALLOWED_ATTR: [...CONTENT_RICH_ATTRIBUTES],
      ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, RETURN_DOM_FRAGMENT: true });
    for (const node of Array.from(fragment.querySelectorAll('*'))) {
      const tag = node.tagName.toLowerCase();
      if (node.classList.contains('ql-formula')) { node.remove(); continue; }
      const classes = (node.getAttribute('class') ?? '').split(/\s+/).filter(isContentClass);
      const styles: string[] = [];
      for (const declaration of (node.getAttribute('style') ?? '').split(';')) {
        const match = /^\s*([a-z-]+)\s*:\s*([^:;]+?)\s*$/.exec(declaration);
        if (match && isContentStyleValue(match[1]!,match[2]!)) styles.push(`${match[1]}: ${match[2]}`);
      }
      const attributes = new Map(Array.from(node.attributes).map(attr => [attr.name,attr.value]));
      for (const attr of Array.from(node.attributes)) node.removeAttribute(attr.name);
      if (classes.length) node.setAttribute('class',[...new Set(classes)].join(' '));
      if (styles.length && !['img','iframe'].includes(tag)) node.setAttribute('style',styles.join('; '));
      const keep = (name: string) => { const value = attributes.get(name); if (value !== undefined) node.setAttribute(name,value); };
      if (tag === 'li' && ['ordered','bullet'].includes(attributes.get('data-list') ?? '')) keep('data-list');
      if (tag === 'span' && classes.includes('ql-ui')) node.setAttribute('contenteditable','false');
      if (tag === 'a' && isContentLink(attributes.get('href') ?? '')) {
        keep('href');
        if (attributes.get('target') === '_blank') { node.setAttribute('target','_blank'); node.setAttribute('rel','noopener noreferrer'); }
      }
      if (tag === 'img' || tag === 'iframe') {
        const original = attributes.get('src') ?? '';
        const src = tag === 'img' ? resolveContentImage(original,sources) : isContentVideo(original) ? original : null;
        if (src === null) { node.remove(); continue; }
        node.setAttribute('src',src);
        for (const dimension of ['width','height']) if (isContentDimension(attributes.get(dimension) ?? '')) keep(dimension);
        if (tag === 'img') keep('alt');
        else { node.setAttribute('frameborder','0'); node.setAttribute('allowfullscreen','true'); }
      }
    }
    const container = fragment.ownerDocument.createElement('div');
    container.appendChild(fragment);
    return container.innerHTML;
  };
}

// Nonsecret, identical public-content trust for SSR, browser, staff preview and editor.
const sources = validateContentImageSources(JSON.parse(process.env.NEXT_PUBLIC_CONTENT_IMAGE_SOURCES ?? "[]"));
export const sanitizeRichText = createRichTextSanitizer(sources);
export function parseGoogleMapsEmbed(input: unknown): GoogleMapsEmbedUrl | null {
  if (typeof input !== 'string' || input.length > 8192) return null;
  const raw = input.trim();
  if (!raw.startsWith('<')) return contentGoogleMapsEmbedUrl(raw);
  if (!/^<iframe\b[^<>]*>\s*<\/iframe>$/i.test(raw) || (raw.match(/\bsrc\s*=/gi) ?? []).length !== 1) return null;
  const fragment = DOMPurify.sanitize(raw, { ALLOWED_TAGS:['iframe'], ALLOWED_ATTR:['src'], RETURN_DOM_FRAGMENT:true });
  if (fragment.childNodes.length !== 1 || fragment.firstElementChild?.tagName !== 'IFRAME') return null;
  return contentGoogleMapsEmbedUrl(fragment.firstElementChild.getAttribute('src') ?? '');
}
