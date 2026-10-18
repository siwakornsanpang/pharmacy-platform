// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { quill, attacks, quillExports } from '../../../../tests/fixtures/content-html';
import { createRichTextSanitizer, parseGoogleMapsEmbed } from '../../features/content/sanitize';
import { RichText } from '../../features/content/rich-text';
import { contentGoogleMapsEmbedUrl } from '@pharmacy/contracts/content';

const clean = createRichTextSanitizer([{origin:'https://app.example.test',pathPrefix:'/media/'}]);
describe('owned Content render policy', () => {
 test('preserves reviewed Quill formatting and emits resolved absolute images', () => {
  const out=clean(quill); const doc=new DOMParser().parseFromString(out,'text/html');
  expect(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(6);
  expect(doc.querySelectorAll('li[data-list]')).toHaveLength(2);
  expect(doc.querySelectorAll('span[style]')).toHaveLength(8);
  expect(doc.querySelector('img[src="https://app.example.test/media/b.png"]')).not.toBeNull();
  expect(doc.querySelectorAll('iframe')).toHaveLength(3);
  expect(clean(out)).toBe(out);
 });
 test('all reviewed attacks and semantic export payloads lose active DOM at render/SSR', () => {
  for (const html of [...attacks,...quillExports]) {
   const out=clean(html); const doc=new DOMParser().parseFromString(out,'text/html');
   expect(doc.querySelector('script,svg,math,object,embed,form,[onerror],[onclick],[srcdoc],[srcset]')).toBeNull();
   const {container,unmount}=render(<RichText html={html} className="retained"/>);
   expect(container.querySelector('[onerror],script,svg,math,[srcdoc]')).toBeNull();unmount();
   expect(renderToStaticMarkup(<RichText html={html}/>)).not.toMatch(/onerror|<script|<svg|srcdoc/);
  }
 });
 test('images fail closed, reject signed/private/nested encoding and keep canonical authority across document origins', () => {
  for (const src of ['/media/private/a','/media/%70rivate/a','/media/%2570rivate/a','//evil.test/media/a','https://app.example.test/media/a?token=x','/media/a%2Fb']) expect(clean(`<img src="${src}">`)).toBe('');
  expect(createRichTextSanitizer()('<p>safe</p><img src="/media/a.png">')).toBe('<p>safe</p>');
  const other=createRichTextSanitizer([{origin:'https://other.example.test',pathPrefix:'/public/'}]);
  expect(other('<img src="/media/a.png">')).toBe('');
  expect(clean('<img src="/media/a.png">')).toBe('<img src="https://app.example.test/media/a.png">');
 });
 test('Maps typed URL and staff snippet parse into the same canonical finite authority', () => {
  const valid='https://www.google.com/maps/embed?pb=synthetic';
  expect(parseGoogleMapsEmbed(`<iframe src="${valid}" width="10"></iframe>`)).toBe(valid);
  expect(contentGoogleMapsEmbedUrl(valid)).toBe(valid);
  for(const input of [valid+'#','http://www.google.com/maps/embed?x=1','https://evil.test/maps/embed?x=1',`<iframe src="${valid}"></iframe><script>x</script>`,`<iframe src="${valid}"><p>x</p></iframe>`]) expect(parseGoogleMapsEmbed(input)).toBeNull();
 });
});
