import assert from 'node:assert/strict';
import test from 'node:test';
import Ajv from 'ajv';
import * as contracts from '@pharmacy/contracts/content';
import * as content from '../src/modules/content';
import { buildApp } from '../src/app';
import type { Database, QueryClient } from '../src/db/client';
import { accessFixture, seedStaff, fixedNow } from './fixtures/access';

const families = [
  { name: 'home-content', table: 'home_content', dto: 'HomeContent', popups: true },
  { name: 'pharmacist-home-content', table: 'pharmacist_home_content', dto: 'PharmacistHomeContent', popups: false },
] as const;
const banner = { id: 'legacy-string', url: 'display', originalUrl: 'original', title: 'Title', clickable: true, linkUrl: '/link', active: true, order: 1 };
const popup = { id: 'popup-legacy', url: 'popup', title: 'Popup', active: false, order: 1 };
const names = [...families.map(f => f.name), 'web-settings'];
const routes = names.flatMap(name => [{method:'GET' as const,url:'/api/admin/content/'+name}, ...['/api/admin/content/','/api/'].map(prefix=>({method:'POST' as const,url:prefix+name}))]);
const ajv = new Ajv({strict:true});
async function setup() {
  const fixture = await accessFixture();
  try {
  const guard = new URL(fixture.config.databaseUrl);
  assert.equal(guard.hostname,'127.0.0.1'); assert.equal(guard.port,'54329'); assert.equal(guard.username,'pharmacy_test'); assert.match(guard.pathname,/^\/pharmacy_test_/);
  await fixture.db.query('ALTER TABLE home_content ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1');
  await fixture.db.query('ALTER TABLE pharmacist_home_content ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1');
  assert.equal((await fixture.db.query('SHOW timezone')).rows[0]!.TimeZone,'UTC');
  const staff = await seedStaff(fixture.db);
  for(const key of ['manage_home','manage_web_settings']) {
    await fixture.db.query('INSERT INTO permissions(key,label) VALUES($1,$2) ON CONFLICT DO NOTHING',[key,key]);
    await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('editor',$1,true)",[key]);
  }
  let unavailable=false, parsing=0, files=0, transactions=0, failAfter:RegExp|undefined;
  const calls:{sql:string;tx:number;values?:unknown[]}[]=[];
  const query=async(client:QueryClient,tx:number,sql:string,values?:unknown[])=>{
    if(unavailable) throw new Error('private database unavailable');
    calls.push({sql,tx,values}); const result=await client.query(sql,values);
    if(failAfter?.test(sql)){failAfter=undefined;throw new Error('private late SQL failure');} return result;
  };
  const db:Database={query:(sql,values)=>query(fixture.db,0,sql,values),withTransaction:work=>{const id=++transactions;return fixture.db.withTransaction(tx=>work({query:(sql,values)=>query(tx,id,sql,values)}));},close:async()=>{}};
  const app=await buildApp({config:fixture.config,db,clock:()=>fixedNow});
  app.addHook('preParsing',async(_request,_reply,payload)=>{parsing++;return payload;});
  app.addHook('onRequest',async request=>{for(const key of ['file','files','parts'] as const){const original=request[key];(request as any)[key]=function(...args:unknown[]){files++;return original.apply(this,args as any);};}});
  const login=await app.inject({method:'POST',url:'/api/auth/login',payload:{username:staff.username,password:'only-fake-fixture-password'}});
  assert.equal(login.statusCode,200,login.body);
  const headers={authorization:'Bearer '+login.json().token};
  return {...fixture,app,staff,headers,contentDb:db,calls,stats:()=>({parsing,files,transactions}),reset:()=>{calls.length=0;parsing=files=transactions=0;},unavailable:(v:boolean)=>{unavailable=v;},failAfter:(v:RegExp)=>{failAfter=v;},cleanup:async()=>{await app.close();await fixture.cleanup();}};
  } catch(error) { await fixture.cleanup(); throw error; }
}
const snapshot=(db:Database,table:string)=>db.query(`SELECT row_to_json(t) AS value FROM ${table} t ORDER BY id`);
const save=(db:Database,family:string,input:unknown)=>{
  const fn=(content as any).replaceHomeContent;
  assert.equal(typeof fn,'function','Content-owned singleton CAS service must be exported');
  return fn({db,clock:()=>fixedNow},family,input) as Promise<any>;
};
const rejectsStatus=async(work:()=>unknown,status:number)=>assert.rejects(async()=>work(),(error:any)=>error.statusCode===status);

test('three admin singleton reads and six held saves enforce fresh Access before parsing or Content work',async()=>{
 const f=await setup();try{
  for(const state of ['anonymous','allowed','denied','role','inactive','revoked','unavailable']){
   await f.db.query('UPDATE role_permissions SET is_active=$1',[state!=='denied']);
   await f.db.query("INSERT INTO roles(name) VALUES('fixture_viewer') ON CONFLICT DO NOTHING");
   await f.db.query('UPDATE users SET active=$1,role=$2 WHERE id=$3',[state!=='inactive',state==='role'?'fixture_viewer':'editor',f.staff.id]);
   await f.db.query('UPDATE staff_sessions SET revoked_at=$1',[state==='revoked'?fixedNow:null]);
   f.unavailable(state==='unavailable');
   for(const route of routes){f.reset();const r=await f.app.inject({...route,headers:state==='anonymous'?{}:f.headers});
    const want=state==='allowed'?(route.method==='GET'?200:400):['anonymous','inactive','revoked'].includes(state)?401:['denied','role'].includes(state)?403:503;
    assert.equal(r.statusCode,want,`${state} ${route.url}: ${r.body}`);assert.equal(r.headers['cache-control'],'no-store');
    if(state!=='allowed') assert.ok(f.calls.every(c=>!/(?:home_content|web_settings)/.test(c.sql)));
    if(state!=='allowed') assert.equal(f.stats().parsing,0);assert.equal(f.stats().files,0);
   }f.unavailable(false);
  }
 }finally{await f.cleanup();}
});

test('held saves reject malformed multipart/JSON early; singleton queries and undeclared routes fail closed',async()=>{
 const f=await setup();try{
  for(const route of routes.filter(r=>r.method==='POST')) for(const type of ['application/json','multipart/form-data; boundary=broken']){
   f.reset();const r=await f.app.inject({...route,headers:{...f.headers,'content-type':type},payload:'{broken'});
   assert.equal(r.statusCode,400,r.body);
  }
  for(const name of names){for(const q of ['page=1','q=x','revision=1','actor=x','x=1&x=2']) assert.equal((await f.app.inject({method:'GET',url:'/api/admin/content/'+name+'?'+q,headers:f.headers})).statusCode,400);
   assert.equal((await f.app.inject({method:'GET',url:'/api/'+name})).statusCode,200);
   for(const path of ['/api/admin/content/'+name+'/1','/api/admin/content/'+name+'/reorder']) assert.equal((await f.app.inject({method:'GET',url:path,headers:f.headers})).statusCode,404,path);
  }
 }finally{await f.cleanup();}
});

test('lowest-id explicit DTOs preserve nulls/string identities, omit flags, and virtual defaults never seed',async()=>{
 const f=await setup();try{
  for(const family of families){
   const get=()=>f.app.inject({method:'GET',url:'/api/admin/content/'+family.name,headers:f.headers});
   assert.deepEqual((await get()).json(),{id:null,revision:0,banners:[],...(family.popups?{popups:[]}:{}),updatedAt:null});assert.deepEqual((await snapshot(f.db,family.table)).rows,[]);
   await f.db.query(`INSERT INTO ${family.table}(id,banners${family.popups?',popups':''},updated_at) VALUES(9,NULL${family.popups?',NULL':''},NULL),(3,$1${family.popups?',$2':''},'2025-01-01 00:00:00.123')`,[JSON.stringify([{...banner,isNewFile:true,file:{secret:true}}]),...(family.popups?[JSON.stringify([popup])]:[])]);
   await f.db.query(`ALTER TABLE ${family.table} ADD COLUMN fixture_secret text DEFAULT 'secret'`);
   const before=await snapshot(f.db,family.table),r=await get();assert.equal(r.statusCode,200,r.body);
   assert.deepEqual(r.json(),{id:3,revision:1,banners:[banner],...(family.popups?{popups:[popup]}:{}),updatedAt:'2025-01-01T00:00:00.123Z'});
   assert.equal(ajv.validate((contracts as any)[family.dto+'AdminDetailSchema'],r.json()),true,JSON.stringify(ajv.errors));assert.deepEqual(await snapshot(f.db,family.table),before);
   await f.db.query(`DELETE FROM ${family.table} WHERE id=3`);assert.equal((await get()).json().banners,null);
  }
  const get=()=>f.app.inject({method:'GET',url:'/api/admin/content/web-settings',headers:f.headers});
  const defaults={id:null,siteNameTh:'สภาเภสัชกรรม',siteNameEn:'The Pharmacy Council of Thailand',slogan:'',logoPath:'',address:'',phone:'',fax:'',email:'',googleMapsUrl:'',googleMapsEmbed:'',facebookUrl:'',lineId:'',youtubeUrl:'',createdAt:null,updatedAt:null};
  assert.deepEqual((await get()).json(),defaults);assert.deepEqual((await snapshot(f.db,'web_settings')).rows,[]);
  await f.db.query("INSERT INTO web_settings(id,site_name_th,site_name_en,created_at,updated_at) VALUES(9,'Extra','Extra',NULL,NULL),(3,'Thai','English','2025-01-01 00:00:00.123',NULL)");
  const before=await snapshot(f.db,'web_settings'),r=await get();assert.equal(r.statusCode,200,r.body);assert.equal(r.json().id,3);assert.equal(r.json().slogan,null);assert.equal(r.json().createdAt,'2025-01-01T00:00:00.123Z');assert.equal('revision' in r.json(),false);assert.equal(ajv.validate(contracts.WebSettingsAdminDetailSchema,r.json()),true);assert.deepEqual(await snapshot(f.db,'web_settings'),before);
 }finally{await f.cleanup();}
});

test('both Content services require caller tokens and strict complete collections, preserve stale state and extras, and roll back late SQL failures',async()=>{
 const f=await setup();try{for(const family of families){
  const input={expectedRevision:0,banners:[banner],...(family.popups?{popups:[popup]}:{})};
  for(const token of [undefined,null,'0',1.5,-1,2147483648]){f.reset();await rejectsStatus(()=>save(f.contentDb,family.name,{...input,expectedRevision:token}),400);assert.equal(f.stats().transactions,0);}
  for(const bad of [{...input,banners:'broken'},{...input,banners:null},{...input,banners:[{...banner,isNewFile:true}]},{...input,banners:[{...banner,id:null}]},{...input,actor:'admin'}, {...input,banners:[{...banner,active:'true'}]}]) await rejectsStatus(()=>save(f.contentDb,family.name,bad),400);
  await rejectsStatus(()=>save(f.contentDb,family.name,{...input,expectedRevision:1}),409);
  f.reset();const created=await save(f.contentDb,family.name,input);assert.equal(created.revision,1);assert.equal(created.updatedAt,'2026-10-15T12:00:00.789Z');assert.equal(f.stats().transactions,1);assert.ok(f.calls.every(c=>c.tx===1));
  await f.db.query(`INSERT INTO ${family.table}(id,banners) VALUES(900,'[]')`);const before=await snapshot(f.db,family.table);
  for(const token of [0,2]){await rejectsStatus(()=>save(f.contentDb,family.name,{...input,expectedRevision:token,banners:[]}),409);assert.deepEqual(await snapshot(f.db,family.table),before);}
  f.failAfter(/^UPDATE/);await assert.rejects(()=>save(f.contentDb,family.name,{...input,expectedRevision:1,banners:[]}));assert.deepEqual(await snapshot(f.db,family.table),before);
  const result=await save(f.contentDb,family.name,{...input,expectedRevision:1,banners:[]});assert.equal(result.revision,2);assert.deepEqual(result.banners,[]);assert.deepEqual((await snapshot(f.db,family.table)).rows[1],before.rows[1]);
 }}finally{await f.cleanup();}
});

test('independent SQL transactions allow exactly one initializer and one same-revision edit for both home families',async()=>{
 const f=await setup();try{for(const family of families){
  const input={expectedRevision:0,banners:[banner],...(family.popups?{popups:[]}:{})};
  for(const expectedRevision of [0,1]){
   const pids=new Set<number>();let arrivals=0;let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});
   const db:Database={...f.db,withTransaction:work=>f.db.withTransaction(async tx=>{pids.add(Number((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0]!.pid));if(++arrivals===2)release();await barrier;return work(tx);})};
   const outcomes=await Promise.allSettled([save(db,family.name,{...input,expectedRevision}),save(db,family.name,{...input,expectedRevision,banners:[]})]);
   assert.equal(arrivals,2,'No transaction retries');assert.equal(pids.size,2);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal((outcomes.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.statusCode,409);
   const rows=(await snapshot(f.db,family.table)).rows;assert.equal(rows.length,1);assert.equal((rows[0]!.value as any).revision,expectedRevision+1);
  }
 }}finally{await f.cleanup();}
});

test('CAS UTC parameters and read projections preserve absolute instants on a non-UTC host',async()=>{
 const previous=process.env.TZ;process.env.TZ='Asia/Bangkok';let f:Awaited<ReturnType<typeof setup>>|undefined;
 try{f=await setup();for(const family of families){const r=await save(f.contentDb,family.name,{expectedRevision:0,banners:[],...(family.popups?{popups:[]}:{})});assert.equal(r.updatedAt,'2026-10-15T12:00:00.789Z');assert.equal((await f.db.query(`SELECT to_char(updated_at,'YYYY-MM-DD HH24:MI:SS.MS') AS value FROM ${family.table}`)).rows[0]!.value,'2026-10-15 12:00:00.789');const response=await f.app.inject({method:'GET',url:'/api/admin/content/'+family.name,headers:f.headers});assert.equal(response.json().updatedAt,'2026-10-15T12:00:00.789Z');}}
 finally{await f?.cleanup();if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});


test('final factory all33 reads/60 working writes/60 holds retain current authorization and staged behavior',async()=>{
 const f=await setup();try{
  // Distinct addresses avoid conflating exhaustive authorization coverage with the limiter.
  await f.db.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT DO NOTHING");
  await f.db.query("UPDATE users SET role='admin' WHERE id=$1",[f.staff.id]);
  await f.db.query(`INSERT INTO policy_categories(id,title,"order") VALUES(1,'Fixture',0)`);
  await f.db.query(`INSERT INTO other_service_categories(id,name,"order") VALUES(1,'Fixture',0)`);
  await f.db.query(`SELECT setval(pg_get_serial_sequence('policy_categories','id'),1)`);
  await f.db.query(`SELECT setval(pg_get_serial_sequence('other_service_categories','id'),1)`);
  const pdfFamilies=new Set(['laws','policy-projects','other-service-items']);
  const postBody=(family:string):unknown=>({
    news:{title:'Fixture',content:'body'},medicine:{title:'Fixture',content:'body'},'public-project':{title:'Fixture',content:'body'},
    products:{name:'Fixture',category:'arbitrary',price:'1.00'},
    council:{name:'Fixture',position:'Member',type:'a',order:1},
    history:{term:'1',startYear:'2568',endYear:'2570',presidentName:'P',secretaryName:'S'},
    agencies:{name:'Fixture',url:'',category:'a',order:1},
    laws:{title:'Fixture',category:'1'},services:{name:'Fixture'},honor:{name:'Fixture'},
    'policy-projects':{name:'Fixture',categoryId:1},'other-service-items':{name:'Fixture',categoryId:1},
    'web-settings':{siteNameTh:'Thai',siteNameEn:'English'},'policy-categories':{title:'Fixture'},
    'honor-awards':{name:'Fixture'},'other-service-categories':{name:'Fixture'},
  }[family]??{name:'Fixture'});
  const declared=[...content.canonicalContentRoutes.filter(r=>!r.path.endsWith('/upload-image')),...content.legacyContentRoutes.filter(r=>r.method!=='GET')];
  let reads=0,writes=0,holds=0,index=0;
  for(const route of declared){
   const url=route.path.replace(':id','2147483647');
   let payload:unknown=undefined,want=200;
   if(route.method==='GET'){reads++;if(route.parameter==='id')want=404;}
   else if(route.path.endsWith('/upload-image')){
    writes++;payload=pdfFamilies.has(route.family)?{filename:'a.pdf',declaredMime:'application/pdf',size:16}:{filename:'a.jpg',declaredMime:'image/jpeg',size:16};
   }
   else if(route.request.mediaLifecycleRequired){holds++;want=503;}
   else {
    writes++;
    if(route.path.endsWith('/reorder'))payload=route.request.format==='items-object'?{items:[]}:[];
    else if(route.family==='home-content'||route.family==='pharmacist-home-content'){
     const table=route.family==='home-content'?'home_content':'pharmacist_home_content';
     const current=(await f.db.query(`SELECT revision FROM ${table} ORDER BY id ASC LIMIT 1`)).rows[0];
     payload={expectedRevision:current?Number(current.revision):0,banners:[],...(route.family==='home-content'?{popups:[]}:{})};
    }
    else if(route.method==='POST')payload=postBody(route.family);
    else {payload={};want=route.family==='policy-categories'&&route.method==='PUT'?200:404;}
   }
   const response=await f.app.inject({method:route.method,url,headers:f.headers,payload:payload as any,remoteAddress:`127.3.${Math.floor(++index/250)}.${index%250+1}`});
   assert.equal(response.statusCode,want,`${route.method} ${url}: ${response.body}`);assert.equal(response.headers['cache-control'],'no-store');
   if(route.method==='GET'&&!route.parameter&&!names.includes(route.family)&&!['policy-categories','other-service-categories'].includes(route.family))assert.deepEqual(response.json(),{items:[],total:0,page:1,pageSize:10});
  }
  assert.deepEqual([reads,writes,holds],[33,131,0]);
  await f.db.query("UPDATE users SET role='editor' WHERE id=$1",[f.staff.id]);
  await f.db.query('UPDATE role_permissions SET is_active=false');
  for(const route of declared){
    f.reset();const response=await f.app.inject({method:route.method,url:route.path.replace(':id','1'),headers:f.headers,remoteAddress:`127.4.${Math.floor(++index/250)}.${index%250+1}`});
    assert.equal(response.statusCode,403,route.path);assert.ok(f.calls.every(c=>!/\b(?:home_content|pharmacist_home_content|web_settings|news|medicine_articles|public_project_articles|laws|council_members|council_history|agencies|honor_awards|honors|services|policy_categories|policy_projects|products|other_service_categories|other_service_items)\b/.test(c.sql)));assert.equal(f.stats().parsing,0);
  }
 }finally{await f.cleanup();}
});

test('stored malformed collections never read as empty or become a destructive save; canonical CAS retains out-of-order extras',async()=>{
 const f=await setup();try{for(const family of families){
  await f.db.query(`INSERT INTO ${family.table}(id,banners${family.popups?',popups':''}) VALUES(20,'[]'${family.popups?",'[]'":''}),(4,$1${family.popups?",'[]'":''})`,[JSON.stringify([banner])]);
  const before=await snapshot(f.db,family.table),input={expectedRevision:1,banners:[],...(family.popups?{popups:[]}:{})};
  const saved=await save(f.contentDb,family.name,input);assert.equal(saved.id,4);assert.equal(saved.revision,2);assert.deepEqual((await snapshot(f.db,family.table)).rows[1],before.rows[1]);
  for(const malformed of [{legacy:'unknown'},[{}],['bad']]){
   await f.db.query(`UPDATE ${family.table} SET banners=$1 WHERE id=4`,[JSON.stringify(malformed)]);const snapshotBefore=await snapshot(f.db,family.table);
   const response=await f.app.inject({method:'GET',url:'/api/admin/content/'+family.name,headers:f.headers});assert.equal(response.statusCode,503);assert.equal(response.body.includes('Unsupported'),false);
   await rejectsStatus(()=>save(f.contentDb,family.name,{...input,expectedRevision:2}),400);assert.deepEqual(await snapshot(f.db,family.table),snapshotBefore);
  }
 }}finally{await f.cleanup();}
});


test('singleton capabilities stay distinct after grant changes with the same JWT',async()=>{
 const f=await setup();try{for(const capability of ['manage_home','manage_web_settings']){
  await f.db.query('UPDATE role_permissions SET is_active=(permission_key=$1)',[capability]);
  for(const route of routes){const response=await f.app.inject({...route,headers:f.headers});const own=route.url.endsWith('web-settings')?capability==='manage_web_settings':capability==='manage_home';assert.equal(response.statusCode,own?(route.method==='GET'?200:400):403,route.url);}
 }}finally{await f.cleanup();}
});

test('accepted singleton identity schemas require validated serialization for virtual and stored nullable shapes',async()=>{
 const {default:Fastify}=await import('fastify');const {singletonSerializer}=await import('../src/modules/content/singleton-service');
 const app=Fastify();app.get('/repro',{schema:{response:{200:contracts.HomeContentAdminDetailSchema}}},async()=>({id:null,revision:0,banners:[],popups:[],updatedAt:null}));
 try{await assert.rejects(()=>app.ready(),/Failed to merge "type" keyword schemas/);}finally{await app.close();}
 const serialize=singletonSerializer({schema:contracts.HomeContentAdminDetailSchema,method:'GET',url:'/singleton',httpStatus:'200'});
 for(const shape of [{id:null,revision:0,banners:[],popups:[],updatedAt:null},{id:4,revision:1,banners:null,popups:null,updatedAt:null}])assert.deepEqual(JSON.parse(serialize(shape)),shape);
 for(const shape of [{id:null,revision:1,banners:[],popups:[],updatedAt:null},{id:4,revision:0,banners:null,popups:null,updatedAt:null},{id:null,revision:0,banners:[banner],popups:[],updatedAt:null}])assert.throws(()=>serialize(shape),/Invalid singleton projection/);
});


test('zero-row SQL revision predicate conflicts without replacing collections, and failed initialization rolls back',async()=>{
 const f=await setup();try{for(const family of families){
  const input={expectedRevision:0,banners:[banner],...(family.popups?{popups:[popup]}:{})};
  f.failAfter(/^INSERT/);await assert.rejects(()=>save(f.contentDb,family.name,input));assert.deepEqual((await snapshot(f.db,family.table)).rows,[]);
  const created=await save(f.contentDb,family.name,input);const before=await snapshot(f.db,family.table);let interfered=false;
  const db:Database={...f.db,withTransaction:work=>f.db.withTransaction(tx=>work({query:async(sql,values)=>{
   const result=await tx.query(sql,values);
   if(!interfered&&/^SELECT id, revision/.test(sql)){interfered=true;await f.db.query(`UPDATE ${family.table} SET revision=revision+1 WHERE id=$1`,[created.id]);}
   return result;
  }}))};
  await rejectsStatus(()=>save(db,family.name,{...input,expectedRevision:1,banners:[],...(family.popups?{popups:[]}:{})}),409);
  assert.equal(interfered,true);const after=await snapshot(f.db,family.table);assert.deepEqual(after.rows,[{value:{...(before.rows[0]!.value as object),revision:2}}]);
 }}finally{await f.cleanup();}
});

test('expectedRevision0 never initializes over any existing identity, including malformed stored revision0',async()=>{
 const f=await setup();try{for(const family of families){
  await f.db.query(`INSERT INTO ${family.table}(id,revision,banners${family.popups?',popups':''}) VALUES(7,0,'[]'${family.popups?",'[]'":''})`);
  const before=await snapshot(f.db,family.table);
  await rejectsStatus(()=>save(f.contentDb,family.name,{expectedRevision:0,banners:[banner],...(family.popups?{popups:[popup]}:{})}),409);
  assert.deepEqual(await snapshot(f.db,family.table),before);
 }}finally{await f.cleanup();}
});
