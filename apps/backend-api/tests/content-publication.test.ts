import assert from 'node:assert/strict';
import test from 'node:test';
import Ajv from 'ajv';
import * as contracts from '@pharmacy/contracts/content';
import * as content from '../src/modules/content';
import {quill,attacks,quillExports} from './fixtures/content-html';
import { buildApp } from '../src/app';
import { accessFixture, seedStaff, fixedNow } from './fixtures/access';

const articles = [ ['news','news','News'], ['medicine','medicine_articles','Medicine'], ['public-project','public_project_articles','PublicProject'] ] as const;
const publicRoutes = [
 ['/agencies','AgencyPublic',false], ['/council','CouncilPublic',false], ['/history','HistoryPublic',false],
 ['/home-content','HomeContentPublic',true], ['/honor','HonorPublicSummary',false], ['/honor-awards','HonorAwardPublic',false],
 ['/laws/law1','LawPublic',false], ['/medicine','MedicinePublicSummary',false], ['/medicine/1','MedicinePublicDetail',true],
 ['/news','NewsPublicSummary',false], ['/news/1','NewsPublicDetail',true], ['/other-service-categories','OtherServiceCategoryPublic',false],
 ['/other-service-categories/with-count','OtherServiceCategoryPublic',false], ['/other-service-items','OtherServiceItemPublic',false],
 ['/other-service-items/1','OtherServiceItemPublic',false], ['/pharmacist-home-content','PharmacistHomeContentPublic',true],
 ['/policy-categories','PolicyCategoryPublic',false], ['/policy-categories/1','PolicyCategoryPublic',true], ['/policy-projects','PolicyProjectPublic',false],
 ['/products','ProductPublic',false], ['/products/1','ProductPublic',true], ['/public-project','PublicProjectPublicSummary',false],
 ['/public-project/1','PublicProjectPublicDetail',true], ['/services','ServicePublic',false], ['/services/popular','ServicePublic',false],
 ['/web-settings','WebSettingsPublic',true],
] as const;
const ajv = new Ajv({ strict: true });
const dirty = '<h2>Safe ไทย</h2><img src=x onerror=alert(1)><script>bad()</script>';
const banner = {id:'banner',url:'display',originalUrl:'PRIVATE',title:'Title',clickable:true,linkUrl:'/link',active:true,order:1,isNewFile:true};
async function setup() {
 const f = await accessFixture();
 try {
  await f.db.query('ALTER TABLE home_content ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1');
  await f.db.query('ALTER TABLE pharmacist_home_content ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1');
  const staff = await seedStaff(f.db);
  for (const [family,table] of articles) {
   await f.db.query(`INSERT INTO ${table}(id,title,content,category,status,published_at) VALUES
    (1,'Null',$1,$2,'published',NULL),(2,'Past',$1,$2,'published','2025-01-01'),
    (3,'Now',$1,$2,'published','2026-10-15 12:00:00.789'),(4,'Future private',$1,$2,'published','2026-10-15 12:00:00.790'),
    (5,'Draft private',$1,$2,'draft','2025-01-01')`,[dirty,family==='news'?'news':family]);
   await f.db.query(`UPDATE ${table} SET created_at='2026-09-30 12:34:56.789' WHERE id=1`);
  }
  await f.db.query("INSERT INTO products(id,name,category,description,price) SELECT n,CASE WHEN n=1 THEN 'literal 100%_\\ item' ELSE 'Product' END,'custom','<b>plain</b>','2.10' FROM generate_series(1,15) n");
  await f.db.query("INSERT INTO laws(id,category,title,status,announced_at) VALUES(1,'law1','Online','online','2024-02-29'),(2,'law1','Private','offline',NULL),(3,'law1','Upper','ONLINE',NULL),(4,'law1','Null',NULL,NULL)");
  await f.db.query("INSERT INTO policy_categories(id,title) VALUES(1,'Policy'),(2,'Empty')");
  await f.db.query("INSERT INTO policy_projects(id,category_id,name,status) VALUES(1,1,'Planned','planned'),(2,1,'Completed','completed'),(3,1,'Custom','stored custom')");
  await f.db.query("INSERT INTO other_service_categories(id,name) VALUES(1,'Category'),(2,'Empty')");
  await f.db.query("INSERT INTO other_service_items(id,category_id,name,status) VALUES(1,1,'Online','online'),(2,1,'Offline','offline'),(3,2,'Upper','ONLINE')");
  await f.db.query("INSERT INTO council_members(id,name,position,type,\"order\",original_image_url,background) VALUES(1,'<img onerror=x>','Position','custom',1,'PRIVATE','<b>plain</b>')");
  await f.db.query("INSERT INTO council_history(id,term,president_name,secretary_name,original_president_image,original_secretary_image) VALUES(1,'Term','President','Secretary','PRIVATE','PRIVATE')");
  await f.db.query("INSERT INTO agencies(id,name,url,category,description,original_thumbnail_url) VALUES(1,'Agency','https://agency.example.test','custom','<b>plain</b>','PRIVATE')");
  await f.db.query("INSERT INTO honor_awards(id,name,description) VALUES(1,'Award','<b>plain</b>'),(2,'Empty',NULL)");
  await f.db.query("INSERT INTO honors(id,award_id,name,full_detail,award_detail,original_image_url) VALUES(1,1,'Recipient',$1,'<b>plain</b>','PRIVATE'),(2,0,'Unassigned',$1,NULL,NULL)",[dirty]);
  await f.db.query("INSERT INTO services(id,name,is_popular,popular_order) SELECT n,'Service',n<6,6-n FROM generate_series(1,7) n");
  for (const table of ['home_content','pharmacist_home_content']) await f.db.query(`INSERT INTO ${table}(id,banners) VALUES(1,$1),(9,'[]')`,[JSON.stringify([banner,{...banner,id:'inactive',active:false}])]);
  await f.db.query('UPDATE home_content SET popups=$1 WHERE id=1',[JSON.stringify([{id:'yes',url:'popup',title:'Popup',active:true,order:1},{id:'no',url:'popup',title:'Hidden',active:false,order:2}])]);
  await f.db.query("INSERT INTO web_settings(id,site_name_th,site_name_en,google_maps_url,google_maps_embed) VALUES(1,'Thai','English','https://maps.example.test/navigation',$1),(9,'Extra','Extra',NULL,NULL)",['<iframe src="https://www.google.com/maps/embed?pb=fixture" width="600" onload="bad()"></iframe>']);
  const calls:{sql:string;values?:unknown[]}[]=[];
  const db={...f.db,query:(sql:string,values?:unknown[])=>{calls.push({sql,values});return f.db.query(sql,values);}};
  const app=await buildApp({...f,config:{...f.config,contentImageSources:[{origin:'https://app.example.test',pathPrefix:'/media/'}]},db});
  const login=await app.inject({method:'POST',url:'/api/auth/login',payload:{username:staff.username,password:'only-fake-fixture-password'}});
  assert.equal(login.statusCode,200,login.body);
  let n=0;
  const get=(path:string)=>app.inject({method:'GET',url:'/api'+path,remoteAddress:`127.0.${Math.floor(++n/250)}.${n%250+1}`});
  return {...f,app,get,calls,headers:{authorization:'Bearer '+login.json().token},cleanup:async()=>{await app.close();await f.cleanup();}};
 } catch(error){await f.cleanup();throw error;}
}

test('all 26 accepted public GETs return strict safe DTOs, no-store, finite queries and untruncated arrays',async()=>{
 const f=await setup();try{
  for(const [path,name,single] of publicRoutes){
   const r=await f.get(path);assert.equal(r.statusCode,200,`${path}: ${r.body}`);assert.equal(r.headers['cache-control'],'no-store');
   const rows=single?[r.json()]:r.json();assert.ok(Array.isArray(rows));assert.ok(rows.length>0,path);
   for(const row of rows)assert.equal(ajv.validate((contracts as any)[name+'Schema'],row),true,`${path}: ${JSON.stringify(ajv.errors)}`);
   assert.doesNotMatch(r.body,/PRIVATE|originalUrl|originalImageUrl|originalPresidentImage|originalSecretaryImage|originalThumbnailUrl|isNewFile|revision|updatedAt/);
   const bad=await f.get(path+'?unknown=x');assert.equal(bad.statusCode,400,path);assert.equal(bad.headers['cache-control'],'no-store');
  }
  assert.equal((await f.get('/products')).json().length,15);
  assert.deepEqual((await f.get('/services/popular')).json().map((r:any)=>r.id),[5,4,3,2]);
  assert.deepEqual((await f.get('/home-content')).json(),{banners:[{id:'banner',url:'display',title:'Title',clickable:true,linkUrl:'/link',active:true,order:1}],popups:[{id:'yes',url:'popup',title:'Popup',active:true,order:1}]});
  assert.equal((await f.get('/pharmacist-home-content')).json().banners.length,1);
  assert.equal((await f.get('/web-settings')).json().googleMapsEmbedUrl,'https://www.google.com/maps/embed?pb=fixture');
  assert.equal('googleMapsEmbed' in (await f.get('/web-settings')).json(),false);
  assert.equal((await f.get('/council')).json()[0].background,'<b>plain</b>');
  assert.equal((await f.get('/agencies')).json()[0].description,'<b>plain</b>');
  assert.equal((await f.get('/products/1')).json().description,'<b>plain</b>');
  assert.ok(f.calls.filter(c=>/SELECT/.test(c.sql)).every(c=>!/^SELECT \*/.test(c.sql)));
 }finally{await f.cleanup();}
});

test('each article SQL predicate hides draft/future before projection, exact clock UTC and admin preview remains guarded',async()=>{
 const f=await setup();try{
  for(const [family,table] of articles){
   const response=await f.get('/'+family);assert.equal(response.statusCode,200,response.body);const rows=response.json();assert.deepEqual(rows.map((r:any)=>r.id).sort(),[1,2,3]);
   assert.ok(rows.every((r:any)=>!('content' in r)&&!('status' in r)));
   if (family !== 'medicine') { assert.equal(rows.find((r:any)=>r.id===1).createdAt,'2026-09-30T12:34:56.789Z'); assert.equal(rows.find((r:any)=>r.id===1).publishedAt,null); assert.equal((await f.get('/'+family+'/1')).json().createdAt,'2026-09-30T12:34:56.789Z'); }
   else assert.ok(rows.every((r:any)=>!('createdAt' in r)));
   assert.equal(rows.find((r:any)=>r.id===3).publishedAt,'2026-10-15T12:00:00.789Z');
   assert.deepEqual((await f.get('/'+family+'?status=draft')).json(),[]);
   assert.equal((await f.get('/'+family+'?status=published')).json().length,3);
   for(const id of [4,5,999]){assert.equal((await f.get('/'+family+'/'+id)).statusCode,404);assert.equal((await f.get('/'+family+'/'+id+'?status=draft')).statusCode,400);}
   const detail=await f.get('/'+family+'/1');assert.equal(detail.statusCode,200);assert.equal(detail.json().content,'<h2>Safe ไทย</h2>');
   const staff=await f.app.inject({method:'GET',url:'/api/admin/content/'+family+'/5',headers:f.headers});assert.equal(staff.statusCode,200);assert.equal(staff.json().content,'<h2>Safe ไทย</h2>');
   assert.equal((await f.app.inject({method:'GET',url:'/api/admin/content/'+family+'/5'})).statusCode,401);
   assert.equal((await f.db.query(`SELECT content FROM ${table} WHERE id=1`)).rows[0]!.content,dirty);
   const sql=f.calls.filter(c=>c.sql.includes('FROM '+table)&&c.sql.includes("status='published'"));assert.ok(sql.length>=6,family);
   assert.ok(sql.every(c=>c.sql.includes("published_at AT TIME ZONE 'UTC'")&&c.values?.includes('2026-10-15T12:00:00.789Z')));
  }
  assert.deepEqual((await f.get('/news?category=procurement')).json(),[]);
  for(const query of ['status=x','status=draft&status=published','category=x','pageSize=100','status='])assert.equal((await f.get('/news?'+query)).statusCode,400);
 }finally{await f.cleanup();}
});

test('online children determine public counts while policy lifecycle labels and exact legacy filters survive',async()=>{
 const f=await setup();try{
  assert.deepEqual((await f.get('/laws/law1')).json().map((r:any)=>r.id),[1]);
  assert.equal((await f.get('/laws/law1')).json()[0].announcedAt,'2024-02-29');
  assert.deepEqual((await f.get('/other-service-items')).json().map((r:any)=>r.id),[1]);
  assert.deepEqual((await f.get('/other-service-items/2')).json(),[]);
  for(const path of ['/other-service-categories','/other-service-categories/with-count'])assert.deepEqual((await f.get(path)).json().map((r:any)=>r.itemCount),[1,0]);
  assert.deepEqual((await f.get('/policy-categories')).json().map((r:any)=>r.projectCount),[3,0]);
  assert.equal((await f.get('/policy-categories/1')).json().projectCount,3);
  assert.deepEqual((await f.get('/policy-projects?categoryId=1')).json().map((r:any)=>r.status),['planned','completed','stored custom']);
  assert.deepEqual((await f.get('/policy-projects?categoryId=2')).json(),[]);
  assert.deepEqual((await f.get('/honor?awardId=0')).json().map((r:any)=>r.id),[2]);
  assert.deepEqual((await f.get('/honor-awards')).json().map((r:any)=>r.recipientCount),[1,0]);
  assert.ok((await f.get('/honor')).json().every((r:any)=>!('fullDetail'in r)));
  assert.equal((await f.get('/honor?awardId=1')).json()[0].awardDetail,'<b>plain</b>');
  assert.deepEqual((await f.get('/products?search='+encodeURIComponent('100%_\\'))).json().map((r:any)=>r.id),[1]);
  assert.equal((await f.get('/products?category=custom')).json().length,15);
  for(const path of ['/policy-projects?categoryId=1x','/honor?awardId=-1','/products?search=x&search=y','/other-service-items/0','/policy-categories/1x'])assert.equal((await f.get(path)).statusCode,400,path);
  assert.equal((await f.get('/policy-categories/999')).statusCode,404);
 }finally{await f.cleanup();}
});


test('actual legacy SQL detail read and callable JSON write share corpus policy without rewriting source HTML',async()=>{
 const f=await setup();try{
  const sanitize=(content as any).createRichTextSanitizer([{origin:'https://app.example.test',pathPrefix:'/media/'}]);
  for(const html of [quill,...attacks,...quillExports])for(const [family,table] of articles){
   await f.db.query(`UPDATE ${table} SET content=$1 WHERE id=1`,[html]);
   const r=await f.get('/'+family+'/1');assert.equal(r.statusCode,200,r.body);assert.equal(r.json().content,sanitize(html));
   const written=(content as any).sanitizeContentRichFields(family,{content:html},sanitize).content;
   await f.db.query(`UPDATE ${table} SET content=$1 WHERE id=2`,[written]);
   assert.equal((await f.get('/'+family+'/2')).json().content,written);
   assert.equal((await f.db.query(`SELECT content FROM ${table} WHERE id=1`)).rows[0]!.content,html);
  }
  const saved=await f.app.inject({method:'PUT',url:'/api/admin/content/news/1',headers:f.headers,payload:{content:quill}});
  assert.equal(saved.statusCode,200,saved.body);
  assert.equal((await f.get('/news/1')).json().content,sanitize(quill));
  assert.equal((await f.db.query('SELECT content FROM news WHERE id=1')).rows[0]!.content,sanitize(quill));
  await f.db.query("UPDATE web_settings SET google_maps_embed='<iframe src=bad></iframe><p>extra</p>' WHERE id=1");
  assert.equal((await f.get('/web-settings')).json().googleMapsEmbedUrl,null);
  assert.equal((await f.db.query('SELECT google_maps_embed FROM web_settings WHERE id=1')).rows[0]!.google_maps_embed,'<iframe src=bad></iframe><p>extra</p>');
 }finally{await f.cleanup();}
});

test('public transport retains no-store for SQL failure',async()=>{
 const f=await setup();try{
  await f.db.query('ALTER TABLE news RENAME TO fixture_unavailable_news');
  const r=await f.get('/news');assert.equal(r.statusCode,503);assert.deepEqual(r.json(),{message:'Content temporarily unavailable'});assert.equal(r.headers['cache-control'],'no-store');
 }finally{await f.cleanup();}
});

test('public singleton null and absent collections preserve accepted shapes without seeding or rewriting legacy rows',async()=>{
 const f=await setup();try{
  for(const [family,table] of [['home-content','home_content'],['pharmacist-home-content','pharmacist_home_content']] as const){
   await f.db.query(`UPDATE ${table} SET banners=NULL WHERE id=1`);
   if(family==='home-content')await f.db.query('UPDATE home_content SET popups=NULL WHERE id=1');
   assert.deepEqual((await f.get('/'+family)).json(),{banners:null,...(family==='home-content'?{popups:null}:{})});
   await f.db.query(`DELETE FROM ${table}`);
   assert.deepEqual((await f.get('/'+family)).json(),{banners:[],...(family==='home-content'?{popups:[]}:{})});
   assert.equal((await f.db.query(`SELECT count(*) AS count FROM ${table}`)).rows[0]!.count,'0');
  }
  await f.db.query('DELETE FROM web_settings');
  const settings=await f.get('/web-settings');assert.equal(settings.statusCode,200);assert.equal(settings.json().googleMapsEmbedUrl,null);assert.equal(settings.json().siteNameTh,'สภาเภสัชกรรม');
  assert.equal((await f.db.query('SELECT count(*) AS count FROM web_settings')).rows[0]!.count,'0');
 }finally{await f.cleanup();}
});

test('authorized honor detail refinement exposes sanitized explicit detail with strict IDs/queries, no originals and read-only source',async()=>{
 const f=await setup();try{
  const r=await f.get('/honor/1');assert.equal(r.statusCode,200,r.body);assert.equal(r.headers['cache-control'],'no-store');
  assert.equal(ajv.validate(contracts.HonorPublicDetailSchema,r.json()),true,JSON.stringify(ajv.errors));
  assert.equal(r.json().fullDetail,'<h2>Safe ไทย</h2>');assert.equal(r.json().awardDetail,'<b>plain</b>');
  assert.equal('originalImageUrl' in r.json(),false);assert.equal('createdAt'in r.json(),false);
  assert.equal((await f.db.query('SELECT full_detail FROM honors WHERE id=1')).rows[0]!.full_detail,dirty);
  for(const id of ['1','999'])for(const query of ['awardId=1','status=published','q=x','x=1&x=2']){
   f.calls.length=0;const bad=await f.get('/honor/'+id+'?'+query);assert.equal(bad.statusCode,400,bad.body);assert.equal(bad.headers['cache-control'],'no-store');assert.equal(f.calls.length,0);
  }
  for(const id of ['0','-1','+1','1x','1.0','2147483648'])assert.equal((await f.get('/honor/'+id)).statusCode,400,id);
  assert.equal((await f.get('/honor/999')).statusCode,404);
  await f.db.query("INSERT INTO permissions(key,label) VALUES('manage_about','Fixture about') ON CONFLICT DO NOTHING");
  await f.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('editor','manage_about',true)");
  const admin=await f.app.inject({method:'GET',url:'/api/admin/content/honor/1',headers:f.headers});assert.equal(admin.statusCode,200,admin.body);assert.equal(admin.json().fullDetail,'<h2>Safe ไทย</h2>');assert.equal(admin.json().awardDetail,'<b>plain</b>');
  const sanitizer=(content as any).createRichTextSanitizer([{origin:'https://app.example.test',pathPrefix:'/media/'}]);
  for(const html of [quill,...attacks,...quillExports]){
   await f.db.query('UPDATE honors SET full_detail=$1 WHERE id=1',[html]);
   assert.equal((await f.get('/honor/1')).json().fullDetail,sanitizer(html));
   const written=(content as any).sanitizeContentRichFields('honor',{fullDetail:html},sanitizer).fullDetail;
   await f.db.query('UPDATE honors SET full_detail=$1 WHERE id=2',[written]);
   assert.equal((await f.get('/honor/2')).json().fullDetail,written);
   assert.equal((await f.db.query('SELECT full_detail FROM honors WHERE id=1')).rows[0]!.full_detail,html);
  }
 }finally{await f.cleanup();}
});

test('actual legacy detail emits resolved image authority and canonical Maps while preserving raw stored source',async()=>{
 const f=await setup();try{
  const html='<p>Safe</p><img src="/media/a.png"><img src="/media/%70rivate/a.png"><img src="/media/%2570rivate/a.png">';
  await f.db.query('UPDATE news SET content=$1 WHERE id=1',[html]);
  const r=await f.get('/news/1');assert.equal(r.statusCode,200,r.body);assert.equal(r.json().content,'<p>Safe</p><img src="https://app.example.test/media/a.png">');
  assert.equal((await f.db.query('SELECT content FROM news WHERE id=1')).rows[0]!.content,html);
  for(const raw of ['HTTPS://WWW.GOOGLE.COM/maps/embed?pb=x','https://www.google.com/other/../maps/embed?pb=x']){
   await f.db.query('UPDATE web_settings SET google_maps_embed=$1 WHERE id=1',[raw]);
   const settings=await f.get('/web-settings');assert.equal(settings.statusCode,200,settings.body);assert.equal(settings.json().googleMapsEmbedUrl,'https://www.google.com/maps/embed?pb=x');assert.equal(ajv.validate(contracts.WebSettingsPublicSchema,settings.json()),true,JSON.stringify(ajv.errors));
   assert.equal((await f.db.query('SELECT google_maps_embed FROM web_settings WHERE id=1')).rows[0]!.google_maps_embed,raw);
  }
 }finally{await f.cleanup();}
});

test('legacy law delete removes the stored row',async()=>{
 const f=await setup();try{
  await f.db.query("INSERT INTO permissions(key,label) VALUES('manage_law','Fixture law') ON CONFLICT DO NOTHING");
  await f.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('editor','manage_law',true)");
  await f.db.query("INSERT INTO content_asset_refs(owner_type,owner_id,owner_slot,asset_id) VALUES('laws','4','pdf','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')");
  const del=await f.app.inject({method:'DELETE',url:'/api/laws/4',headers:f.headers});
  assert.equal(del.statusCode,200,del.body);
  assert.equal((await f.db.query('SELECT id FROM laws WHERE id=4')).rows.length,0);
 }finally{await f.cleanup();}
});
