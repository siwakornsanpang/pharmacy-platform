import assert from 'node:assert/strict';
import test from 'node:test';
import Ajv from 'ajv';
import * as content from '../src/content.js';

const c = content as Record<string, any>;
const families = ['HomeContent','PharmacistHomeContent','News','Medicine','PublicProject','Law','Council','History','Agency','WebSettings','HonorAward','Honor','Service','PolicyCategory','PolicyProject','Product','OtherServiceCategory','OtherServiceItem'];
const ajv = new Ajv({ strict: true });
function valid(name: string, data: unknown) {
  assert.ok(c[`${name}Schema`], `${name}Schema exported`);
  return ajv.compile(c[`${name}Schema`])(data);
}

test('all eighteen families publish strict transport schemas for distinct projections', () => {
  for (const family of families) for (const projection of ['Public','AdminSummary','AdminDetail']) {
    const schema = c[`${family}${projection}Schema`];
    assert.ok(schema, `${family}${projection}`);
    assert.equal(schema.additionalProperties, false);
    assert.doesNotThrow(() => ajv.compile(schema));
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
    if (projection !== 'AdminDetail') for (const field of ['originalUrl','originalImageUrl','originalPresidentImage','originalSecretaryImage','originalThumbnailUrl','content','fullDetail']) {
      if (projection === 'Public' && ['content','fullDetail'].includes(field)) continue;
      assert.equal(field in schema.properties, false, `${family}${projection}.${field}`);
    }
  }
});

test('article projections reject raw rows, dates, unknown fields and wrong nullability', () => {
  const summary = { id: 1, title: 'Title', excerpt: null, thumbnailUrl: null, category: 'news', status: 'draft', createdAt: null, updatedAt: '2026-10-16T00:00:00.000Z', publishedAt: null, isHighlight: null };
  assert.equal(valid('NewsAdminSummary', summary), true);
  assert.equal(valid('NewsAdminSummary', { ...summary, content: '<p>body</p>' }), false);
  assert.equal(valid('NewsAdminDetail', { ...summary, content: '<p>body</p>' }), true);
  assert.equal(valid('NewsAdminDetail', { ...summary, content: null }), false);
  assert.equal(valid('NewsAdminDetail', { ...summary, content: '', updatedAt: new Date() }), false);
  assert.equal(valid('NewsAdminDetail', { ...summary, content: '', updatedAt: 'yesterday' }), false);
  assert.equal(valid('MedicineAdminDetail', { ...summary, content: '', category: 'custom', isHighlight: undefined }), false);
});

test('decimal prices remain strings and text status vocabularies remain open', () => {
  const item = { id: 1, name: 'Item', imageUrl: null, category: 'custom', description: null, price: '12345678.90', createdAt: null, updatedAt: null };
  assert.equal(valid('ProductAdminDetail', item), true);
  for (const price of [12.34, 'NaN', '1e3', '123456789.00', '1.234']) assert.equal(valid('ProductAdminDetail', { ...item, price }), false);
  assert.equal(valid('OtherServiceItemAdminDetail', { id: 1, categoryId: 1, name: 'File', status: 'legacy-text', pdfUrl: null, order: 0, createdAt: null }), true);
  assert.deepEqual(Object.keys(c.PolicyCategoryPublicSchema.properties), ['id','title','order','projectCount']);
});

test('nested home IDs are legacy strings and public schemas exclude originals and edit flags', () => {
  const banner = { id: 'legacy-banner-7', url: '/display.png', title: '', clickable: false, linkUrl: '', active: true, order: 1 };
  assert.equal(valid('HomeContentPublic', { banners: [banner], popups: [] }), true);
  assert.equal(valid('HomeContentPublic', { banners: [{ ...banner, originalUrl: '/original.png' }], popups: [] }), false);
  assert.equal(valid('HomeContentPublic', { banners: [{ ...banner, isNewFile: true }], popups: [] }), false);
  assert.equal(valid('HomeContentAdminDetail', { id: 1, revision: 1, banners: [{ ...banner, originalUrl: '' }], popups: null, updatedAt: null }), true);
  assert.equal(valid('HomeContentAdminDetail', { id: null, revision: 0, banners: [], popups: [], updatedAt: null }), true);
  assert.equal(valid('HomeContentAdminDetail', { id: 1, revision: 0, banners: [], popups: [], updatedAt: null }), false);
});

test('list query and page envelope reject extra keys and malformed transport numbers', () => {
  assert.equal(valid('ContentListQuery', { page: 1, pageSize: 100, q: '100%_literal', direction: 'asc', sort: 'id' }), true);
  for (const value of [{ page: '1' }, { pageSize: 101 }, { awardId: 1 }, { search: 'x' }, { page: 0 }, { q: 'x'.repeat(201) }]) assert.equal(valid('ContentListQuery', value), false);
  assert.equal(c.pageSchema(c.PolicyCategoryPublicSchema).additionalProperties, false);
});

test('public lists can omit HTML while explicit public detail contracts include it', () => {
  for (const family of ['News','Medicine','PublicProject','Honor']) {
    const field = family === 'Honor' ? 'fullDetail' : 'content';
    assert.ok(c[`${family}PublicSummarySchema`], `${family} public list schema`);
    assert.equal(field in c[`${family}PublicSummarySchema`].properties, false);
    assert.equal(field in c[`${family}PublicDetailSchema`].properties, true);
  }
});

test('virtual singleton absence cannot describe stored data', () => {
  const empty = { id: null, revision: 0, banners: [], popups: [], updatedAt: null };
  const banner = { id: 'legacy', url: '', originalUrl: '', title: '', clickable: false, linkUrl: '', active: true, order: 1 };
  assert.equal(valid('HomeContentAdminDetail', { ...empty, banners: [banner] }), false);
  assert.equal(valid('HomeContentAdminDetail', { ...empty, updatedAt: '2026-10-16T00:00:00Z' }), false);
  assert.equal(valid('HomeContentAdminSummary', { id: null, revision: 0, bannerCount: 1, popupCount: 0, updatedAt: null }), false);
});

test('singleton summaries use only declared stored metadata without invented count fields', () => {
  for (const family of ['HomeContent','PharmacistHomeContent']) {
    assert.deepEqual(Object.keys(c[`${family}AdminSummarySchema`].properties).sort(), ['id','revision','updatedAt']);
    assert.equal(valid(`${family}AdminSummary`, { id: null, revision: 0, updatedAt: null }), true);
  }
});


test('public Maps projection requires a derived bounded embed URL and excludes the raw snippet', () => {
  const settings={siteNameTh:'Thai',siteNameEn:'English',slogan:null,logoPath:null,address:null,phone:null,fax:null,email:null,googleMapsUrl:'https://example.test/navigation',facebookUrl:null,lineId:null,youtubeUrl:null,googleMapsEmbedUrl:null};
  assert.equal(valid('WebSettingsPublic',settings),true);
  assert.equal(valid('WebSettingsPublic',{...settings,googleMapsEmbedUrl:'https://www.google.com/maps/embed?pb=fixture'}),true);
  for(const googleMapsEmbedUrl of ['<iframe src=x></iframe>','https://www.google.com.evil/maps/embed?pb=x','https://www.google.com/maps/embed?pb='+ 'x'.repeat(2081)]) assert.equal(valid('WebSettingsPublic',{...settings,googleMapsEmbedUrl}),false);
  assert.equal(valid('WebSettingsPublic',{...settings,googleMapsEmbed:'<iframe></iframe>'}),false);
});

test('image policy emits the approved absolute authority and checks canonical decoded public paths',()=>{
  const sources=content.validateContentImageSources([{origin:'https://app.example.test',pathPrefix:'/media/'}]);
  const resolve=c.resolveContentImage;
  assert.equal(typeof resolve,'function','pure resolve-and-validate image boundary');
  for(const [input,expected] of [
    ['/media/a.png','https://app.example.test/media/a.png'],
    ['https://app.example.test/media/photo-1_v2.png','https://app.example.test/media/photo-1_v2.png'],
    ['/media/%61sset%2D1.png','https://app.example.test/media/asset-1.png'],
    ['/m%65dia/a.png','https://app.example.test/media/a.png'],
    ['/media/ภาพ.png','https://app.example.test/media/%E0%B8%A0%E0%B8%B2%E0%B8%9E.png'],
  ]){
    assert.equal(resolve(input,sources),expected,input);assert.equal(resolve(expected,sources),expected,'canonical URL stable');
  }
  assert.equal(resolve('/media/a.png',[]),null);
  assert.equal(resolve('/media/a.png',[{origin:'https://staff.example.test',pathPrefix:'/media/'}]),'https://staff.example.test/media/a.png');
});

test('image predicates reject encoded forbidden segments and malformed or nested path ambiguity',()=>{
  const sources=content.validateContentImageSources([{origin:'https://app.example.test',pathPrefix:'/media/'}]);
  for(const path of ['/media/%70rivate/a.png','/media/%50rIvAtE/a.png','/media/%73ign/a.png','/media/%53IGN/a.png','/media/%61uthenticated/a.png','/media/%41uThEnTiCaTeD/a.png',
    '/media/%2570rivate/a.png','/media/%252570rivate/a.png','/media/%252fprivate/a.png','/media/%','/media/%2','/media/%GG/a.png','/media/%C0%AFprivate/a.png','/media/%E0%A4/a.png',
    '/media/a/../a.png','/media/a/./a.png','/media//a.png','/media/private;ignored/a.png','/media/a%3Fb.png','/media/%23fragment.png','/media/%00a.png','/media/%5Cprivate/a.png','/media/%2fprivate/a.png',
    '/outside/media/a.png','/media-other/a.png']){
    assert.equal(content.isContentImage(path,sources),false,path);
    assert.equal(content.isContentImage('https://app.example.test'+path,sources),false,path);
  }
});

test('every nonnull Maps value is canonical public-schema-compatible at exact query bounds',()=>{
  const schema=(content.WebSettingsPublicSchema as any).properties.googleMapsEmbedUrl;
  const validate=ajv.compile(schema);
  for(const input of ['HTTPS://WWW.GOOGLE.COM/maps/embed?pb=x','https://www.google.com/other/../maps/embed?pb=x','https://www.google.com/maps/embed?pb=ไทย','https://www.google.com/maps/embed?'+ 'a'.repeat(2047)]){
    const value=content.contentGoogleMapsEmbedUrl(input);assert.notEqual(value,null,input);assert.equal(validate(value),true,JSON.stringify(validate.errors));
    assert.ok(value!.startsWith('https://www.google.com/maps/embed?'));assert.equal(content.contentGoogleMapsEmbedUrl(value!),value);
  }
  assert.equal(content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?'+ 'a'.repeat(2048)),null);
  assert.equal(content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?'),null);
  assert.equal(content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?pb='+ 'ไ'.repeat(1000)),null);
});

test('Maps rejects every fragment delimiter including an empty fragment while encoded query hashes remain data',()=>{
  const validate=ajv.compile((content.WebSettingsPublicSchema as any).properties.googleMapsEmbedUrl);
  for(const input of ['https://www.google.com/maps/embed?pb=x#','https://www.google.com/maps/embed?pb=x#section','HTTPS://WWW.GOOGLE.COM/maps/embed?pb=x#'])assert.equal(content.contentGoogleMapsEmbedUrl(input),null,input);
  const value=content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?pb=x%23y');
  assert.equal(value,'https://www.google.com/maps/embed?pb=x%23y');assert.equal(validate(value),true,JSON.stringify(validate.errors));
});
