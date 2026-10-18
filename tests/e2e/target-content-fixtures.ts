import { createServer } from 'node:http';
import { appendFileSync, readFileSync } from 'node:fs';
import Ajv from 'ajv';
import * as C from '@pharmacy/contracts/content';
import legacy from '../fixtures/content.json';
import registry from '../fixtures/registry.json';

const schemas: Record<string,string> = {
 '/news':'NewsPublicSummary','/news/101':'NewsPublicDetail','/medicine':'MedicinePublicSummary','/medicine/101':'MedicinePublicDetail',
 '/public-project':'PublicProjectPublicSummary','/public-project/101':'PublicProjectPublicDetail','/products':'ProductPublic',
 '/home-content':'HomeContentPublic','/pharmacist-home-content':'PharmacistHomeContentPublic','/web-settings':'WebSettingsPublic',
 '/honor':'HonorPublicSummary','/honor/101':'HonorPublicDetail','/honor-awards':'HonorAwardPublic','/policy-categories':'PolicyCategoryPublic','/policy-categories/101':'PolicyCategoryPublic',
 '/policy-projects':'PolicyProjectPublic','/other-service-categories':'OtherServiceCategoryPublic','/other-service-categories/with-count':'OtherServiceCategoryPublic',
 '/other-service-items':'OtherServiceItemPublic','/other-service-items/101':'OtherServiceItemPublic','/agencies':'AgencyPublic','/history':'HistoryPublic',
 '/council':'CouncilPublic','/services':'ServicePublic','/services/popular':'ServicePublic',
 ...Object.fromEntries(Array.from({length:7},(_,i)=>['/laws/law'+(i+1),'LawPublic'])),
};
const ajv=new Ajv({strict:true});
const singleton=new Set(['/home-content','/pharmacist-home-content','/web-settings']);
const targetHonorSummary={id:101,awardId:101,order:1,prefix:'ภก. ',name:'ผู้รับรางวัลทดสอบ',awardName:'หมวดทดสอบ',workName:'ผลงานสังเคราะห์',awardDetail:'ข้อความสรุปสำหรับการ์ด',imageUrl:null,videoUrl:null};
const targetHonorDetail={...targetHonorSummary,fullDetail:'<p>รายละเอียดเฉพาะจาก Honor detail fixture</p>'};
// Shape-only adaptations: exact reviewed public fields, same source text/bytes/clock.
function missing(property: any): unknown {
 if(property.enum)return property.enum[0];
 if(property.anyOf?.some((part:any)=>part.type==='null'))return null;
 if(property.type==='string')return '';
 if(property.type==='boolean')return false;
 if(property.type==='integer'||property.type==='number')return 1;
 if(property.type==='array')return [];
 return null;
}
function project(row: Record<string,unknown>, name: string): Record<string,unknown> {
 const schema=(C as unknown as Record<string,any>)[name+'Schema'];
 const result: Record<string,unknown>={};
 for (const [key, property] of Object.entries(schema.properties) as [string,any][]) {
  let value=row[key];
  if(key==='googleMapsEmbedUrl')value='https://www.google.com/maps/embed?pb=synthetic';
  if(key==='price' && value!==undefined)value=String(value);
  if(value===undefined) value=missing(property);
  if(key==='banners' && Array.isArray(value))value=value.map((banner:any)=>({
   id:String(banner.id),url:banner.url,title:banner.title,clickable:Boolean(banner.clickable),
   linkUrl:banner.linkUrl??'',active:Boolean(banner.active),order:banner.order??1,
  }));
  result[key]=value;
 }
 if(!ajv.validate(schema,result))throw new Error(name+': '+JSON.stringify(ajv.errors));
 return result;
}
export async function startTargetContentFixture() {
 const server=createServer((req,res)=>{
  const url=new URL(req.url!,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
  if(req.headers.authorization||req.headers.cookie)throw new Error('Fixture received authority');
  if(url.pathname==='/assets/synthetic.svg'){res.setHeader('content-type','image/svg+xml');res.end(readFileSync('tests/fixtures/assets/synthetic.svg'));return;}
  let payload: unknown;
  if(url.pathname==='/pharmacists')payload=registry; // Retained Registry owner/legacy HomeStats only.
  else if(url.pathname.startsWith('/api/')){
   const path=url.pathname.slice(4);const schema=schemas[path];
   if(schema){
    const source=path==='/honor'?[targetHonorSummary]:path==='/honor/101'?targetHonorDetail:(legacy as Record<string,unknown>)[path];
    payload=Array.isArray(source)?source.map(row=>project(row,schema)):source&&project(source as Record<string,unknown>,schema);
   }
  }
  // Existing unrelated Academy build-only fixture values; never a new API implementation.
  else if(url.pathname.startsWith('/api/academy/'))payload=(legacy as Record<string,unknown>)[url.pathname];
  const status=payload===undefined?501:req.method==='GET'?200:405;
  appendFileSync('.superpowers/task-3b/fixture-requests.jsonl',JSON.stringify({method:req.method,path:url.pathname,query:url.search,status,authority:!!req.headers.authorization})+'\n');
  res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(payload??{error:'UNSUPPORTED_TARGET_FIXTURE'}));
 });
 await new Promise<void>(resolve=>server.listen(4319,'127.0.0.1',resolve));
 return {close:()=>new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();})};
}
