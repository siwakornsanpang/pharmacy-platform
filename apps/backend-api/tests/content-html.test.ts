import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import * as content from '../src/modules/content';
import * as contracts from '@pharmacy/contracts/content';
import { getServerConfig } from '../src/config/server';
import { backendEnv } from './fixtures/database';
const {JSDOM}=createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const trust=[{origin:'https://app.example.test',pathPrefix:'/media/'},{origin:'https://storage.example.test',pathPrefix:'/storage/v1/object/public/images/'}];
function sanitizer(rules=trust){const fn=(content as any).createRichTextSanitizer;assert.equal(typeof fn,'function','owned sanitizer export');return fn(rules) as (html:string)=>string;}
function document(html:string){return new JSDOM(html).window.document;}
import {quill,attacks,quillExports} from './fixtures/content-html';

test('required Quill semantic structure, styles, links, resized images and approved embeds survive write and read',()=>{
 const clean=sanitizer(),out=clean(quill),doc=document(out);
 assert.equal(doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length,6);assert.equal(doc.querySelectorAll('li[data-list]').length,2);
 assert.equal(doc.querySelector('.ql-ui')?.getAttribute('contenteditable'),'false');assert.ok(doc.querySelector('.ql-align-center.ql-indent-8.ql-direction-rtl'));
 assert.equal(doc.querySelectorAll('span[style]').length,8);
 for(const span of doc.querySelectorAll('span[style]')){assert.match(span.getAttribute('style'),/font-size: (16|18|20|24|28|32|48|64)px/);assert.match(span.getAttribute('style'),/color:/);}
 assert.equal(doc.querySelectorAll('a[href]').length,4);assert.equal(doc.querySelector('a[target]')?.getAttribute('rel'),'noopener noreferrer');
 assert.equal(doc.querySelector('img')?.getAttribute('width'),'320');assert.equal(doc.querySelectorAll('img').length,2);assert.equal(doc.querySelectorAll('iframe').length,3);
 assert.equal(clean(out),out);
 const boundary=(content as any).sanitizeContentRichFields;assert.equal(typeof boundary,'function');
 for(const family of ['news','medicine','public-project'])assert.deepEqual(boundary(family,{content:quill,title:'<img onerror=x>',excerpt:'<b>plain</b>'},clean),{content:out,title:'<img onerror=x>',excerpt:'<b>plain</b>'});
 assert.deepEqual(boundary('honor',{fullDetail:quill,awardDetail:'<b>plain</b>',name:'<img onerror=x>'},clean),{fullDetail:out,awardDetail:'<b>plain</b>',name:'<img onerror=x>'});
 assert.deepEqual(boundary('products',{description:quill},clean),{description:quill});
});


test('malicious HTML, mutation nesting, CSS and every active attribute channel are removed and idempotent',()=>{
 const clean=sanitizer();
 for(const attack of attacks){const out=clean(attack),doc=document(out);assert.equal(doc.querySelectorAll('script,style,object,embed,form,input,svg,math,source,picture').length,0,out);
  for(const element of doc.querySelectorAll('*'))for(const attr of element.attributes){assert.doesNotMatch(attr.name,/^on|^(id|name|srcdoc|srcset|background|data-evil|aria-label|allow)$/);if(attr.name==='style')assert.doesNotMatch(attr.value,/url|expression|var\(|position|behavior|999|calc|\\/i);if(attr.name==='class')assert.doesNotMatch(attr.value,/evil|99/);}
  assert.equal(clean(out),out);
 }
 const events=quill.replace(/<(h[1-6]|p|strong|em|u|s|sub|sup|ol|ul|li|span|blockquote|pre|code|a|img|iframe)\b/g,'<$1 onmouseover="bad()"');
 assert.doesNotMatch(clean(events),/onmouseover/);
});

test('URI validation rejects scheme obfuscation, credentials, ports, lookalikes and private/signed image channels',()=>{
 const clean=sanitizer();
 const bad=['javascript:alert(1)','JaVaScRiPt:alert(1)','java&#x09;script:alert(1)','&#106;avascript:alert(1)','data:image/png;base64,x','vbscript:x','file:///tmp/x','blob:https://app.example.test/a','//app.example.test/media/x','https:\\evil.test/x',' java&#x0a;script:alert(1)','https://u:p@app.example.test/media/x','https://app.example.test:444/media/x'];
 for(const value of bad){const out=clean(`<a href="${value}">text</a><img src="${value}"><iframe src="${value}"></iframe>`),doc=document(out);assert.equal(doc.querySelectorAll('[href],[src]').length,0,value+': '+out);}
 for(const value of ['sms:+123','/relative','https://evil.test/storage/v1/object/public/images/a','https://storage.example.test/storage/v1/object/sign/images/a','https://storage.example.test/storage/v1/object/private/images/a','https://storage.example.test/storage/v1/object/public/images/a?token=secret','/media/../private/x','/media/%2e%2e/private/x']){
  assert.equal(document(clean(`<img src="${value}">`)).querySelectorAll('img').length,0,value);
 }
 for(const value of ['http://www.youtube.com/embed/abc','https://youtube.com.attacker.test/embed/x','https://attacker-youtube.com/embed/x','https://www.youtube.com/watch?v=x','https://www.youtube.com/redirect?x=a','https://player.vimeo.com/123','https://www.google.com/maps/embed?pb=x'])assert.equal(document(clean(`<iframe src="${value}"></iframe>`)).querySelectorAll('iframe').length,0,value);
 assert.equal(document(clean('<a href="sms:+123">text</a>')).querySelector('a')?.hasAttribute('href'),false);
});

test('sanitizers close over immutable trust without per-request hook leakage and absent trust strips all images',()=>{
 const a=sanitizer(),b=sanitizer([{origin:'https://other.example.test',pathPrefix:'/public/'}]);
 const html='<img src="https://app.example.test/media/x"><img src="https://other.example.test/public/x">';
 for(let i=0;i<4;i++){assert.equal(document(a(html)).querySelector('img')?.getAttribute('src'),'https://app.example.test/media/x');assert.equal(document(b(html)).querySelector('img')?.getAttribute('src'),'https://other.example.test/public/x');}
 assert.equal(document(sanitizer([])(html)).querySelectorAll('img').length,0);
 const mutable=[{origin:'https://app.example.test',pathPrefix:'/media/'}],closed=sanitizer(mutable);mutable[0].origin='https://evil.test';assert.equal(document(closed(html)).querySelector('img')?.getAttribute('src'),'https://app.example.test/media/x');
 for(const rules of [[{origin:'https://*.example.test',pathPrefix:'/'}],[{origin:'https://app.example.test',pathPrefix:'/'}],[{origin:'https://app.example.test',pathPrefix:'/storage/v1/object/sign/'}]])assert.throws(()=>sanitizer(rules));
});

test('byte-exact installed Quill formula/video semantic export injection is neutralized through write and legacy read',()=>{
 const clean=sanitizer(),boundary=(content as any).sanitizeContentRichFields;
 // Quill 2.0.3 formula.html() and video.html(): verbatim interpolations, no KaTeX runtime is added.
 for(const html of quillExports){const written=boundary('news',{content:html},clean).content;for(const out of [written,clean(html),clean(written)])assert.doesNotMatch(out,/<img|onerror|<script/);}
 assert.equal(document(clean('<span class="ql-formula" data-value="x">math</span>')).querySelector('.ql-formula'),null);
});

test('Maps parser extracts only a bounded HTTPS exact Google embed URL and rejects additional markup',()=>{
 const parse=(content as any).parseGoogleMapsEmbed;assert.equal(typeof parse,'function');
 for(const input of ['https://www.google.com/maps/embed?pb=fixture','<iframe src="https://www.google.com/maps/embed?pb=fixture" width="600" onload="bad()"></iframe>'])assert.equal(parse(input),'https://www.google.com/maps/embed?pb=fixture');
 for(const input of ['',null,'http://www.google.com/maps/embed?pb=x','https://www.google.com.evil/maps/embed?pb=x','https://u@www.google.com/maps/embed?pb=x','https://www.google.com:444/maps/embed?pb=x','https://www.google.com/maps/embed/other?x=y','https://www.google.com/maps/embed?pb='+ 'x'.repeat(2050),'<p>extra</p><iframe src="https://www.google.com/maps/embed?pb=x"></iframe>','<iframe src="https://www.google.com/maps/embed?pb=x"></iframe><iframe></iframe>','<iframe src="https://www.google.com/maps/embed?pb=x"><img src=x></iframe>'])assert.equal(parse(input),null,String(input));
});

test('strict calendar predicates reject impossible leap dates/timestamps and config validates finite nonsecret trust',()=>{
 const date=(contracts as any).isContentDate,timestamp=(contracts as any).isContentTimestamp;assert.equal(typeof date,'function');assert.equal(typeof timestamp,'function');
 for(const value of ['2024-02-29','2000-02-29','2026-10-15'])assert.equal(date(value),true,value);
 for(const value of ['2025-02-29','1900-02-29','2026-04-31','2026-13-01','2026-00-01'])assert.equal(date(value),false,value);
 assert.equal(timestamp('2026-10-15T19:00:00.789+07:00'),true);assert.equal(timestamp('2025-02-29T00:00:00Z'),false);assert.equal(timestamp('2026-01-01T24:00:00Z'),false);
 const boundary=(content as any).sanitizeContentRichFields;
 for(const input of [{publishedAt:'2025-02-29T00:00:00Z'},{publishedAt:'2026-04-31T00:00:00Z'},{announcedAt:'1900-02-29'}])assert.throws(()=>boundary('news',input));
 assert.deepEqual(boundary('news',{publishedAt:'2024-02-29T00:00:00Z'}),{publishedAt:'2024-02-29T00:00:00Z'});
 const now=new Date('2026-10-15T12:00:00.789Z'),visible=(content as any).isPublicArticle;assert.equal(typeof visible,'function');
 for(const publishedAt of [null,new Date('2026-10-15T12:00:00.789Z'),new Date('2026-10-15T19:00:00.789+07:00')])assert.equal(visible({status:'published',publishedAt},now),true);
 assert.equal(visible({status:'published',publishedAt:new Date('2026-10-15T12:00:00.790Z')},now),false);assert.equal(visible({status:'draft',publishedAt:null},now),false);
 assert.deepEqual((getServerConfig(backendEnv) as any).contentImageSources,[]);
 assert.deepEqual((getServerConfig({...backendEnv,CONTENT_IMAGE_SOURCES:JSON.stringify(trust)}) as any).contentImageSources,trust);
 for(const source of ['*','{}',JSON.stringify([{origin:'https://*.example.test',pathPrefix:'/media/'}]),JSON.stringify([{origin:'https://app.example.test',pathPrefix:'/'}])])assert.throws(()=>getServerConfig({...backendEnv,CONTENT_IMAGE_SOURCES:source}));
});

test('sanitized relative images emit an absolute approved URL under alternate renderer origins and interleaved trust',()=>{
 const a=sanitizer(),b=sanitizer([{origin:'https://other.example.test',pathPrefix:'/media/'}]);
 for(let n=0;n<3;n++)for(const [clean,want] of [[a,'https://app.example.test/media/a.png'],[b,'https://other.example.test/media/a.png']] as const){
  const out=clean('<img src="/media/a.png">');
  for(const origin of ['https://staff.example.test/edit','https://public.example.test/article']){
   const image=new JSDOM(out,{url:origin}).window.document.querySelector('img');
   assert.equal(image?.getAttribute('src'),want);assert.equal(image?.src,want);
  }
  assert.equal(clean(out),out);
 }
 assert.equal(document(sanitizer([])('<img src="/media/a.png">')).querySelector('img'),null);
});

test('sanitizer rejects encoded private paths while canonical ordinary image paths stay stable',()=>{
 const clean=sanitizer();
 for(const path of ['/media/%70rivate/a.png','/media/%50rIvAtE/a.png','/media/%73ign/a.png','/media/%53IGN/a.png','/media/%61uthenticated/a.png','/media/%41uThEnTiCaTeD/a.png','/media/%2570rivate/a.png','/media/%252570rivate/a.png','/media/%','/media/%2','/media/%GG/a.png','/media/%C0%AFprivate/a.png','/media/%E0%A4/a.png','/media/a/../a.png','/media//a.png']){
  assert.equal(document(clean(`<img src="${path}">`)).querySelector('img'),null,path);
 }
 assert.equal(document(clean('<img src="/media/%61sset%2D1.png">')).querySelector('img')?.getAttribute('src'),'https://app.example.test/media/asset-1.png');
});

test('Maps snippet and direct parser output always match the actual public property schema',()=>{
 const parse=(content as any).parseGoogleMapsEmbed;
 const schema=(contracts.WebSettingsPublicSchema as any).properties.googleMapsEmbedUrl;
 for(const input of ['HTTPS://WWW.GOOGLE.COM/maps/embed?pb=x','https://www.google.com/other/../maps/embed?pb=x','https://www.google.com/maps/embed?'+ 'a'.repeat(2047)]){
  for(const raw of [input,`<iframe src="${input}"></iframe>`]){
   const value=parse(raw);assert.notEqual(value,null,raw);assert.equal(new RegExp(schema.anyOf[0].pattern).test(value),true,raw);assert.ok(value.length<=schema.anyOf[0].maxLength);
  }
 }
 for(const input of ['https://www.google.com/maps/embed?'+ 'a'.repeat(2048),'https://www.google.com/maps/embed?'])assert.equal(parse(input),null);
});

test('Maps direct and iframe extraction reject even an empty fragment delimiter',()=>{
 const parse=(content as any).parseGoogleMapsEmbed;
 for(const url of ['https://www.google.com/maps/embed?pb=x#','https://www.google.com/maps/embed?pb=x#section','HTTPS://WWW.GOOGLE.COM/maps/embed?pb=x#']){
  assert.equal(parse(`<iframe src="${url}"></iframe>`),null,url);assert.equal(parse(url),null,url);
 }
 assert.equal(parse('<iframe src="https://www.google.com/maps/embed?pb=x&#35;"></iframe>'),null);
 assert.equal(parse('<iframe src="https://www.google.com/maps/embed?pb=x%23y"></iframe>'),'https://www.google.com/maps/embed?pb=x%23y');
});
