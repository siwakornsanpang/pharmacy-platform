// Finite harness-only transport mapping. Product production origin checks stay intact.
require('./offline-guard.cjs');
const fs=require('node:fs');
const guardedFetch=globalThis.fetch;
const paths=new Set(['/agencies','/council','/history','/home-content','/honor','/honor-awards','/medicine','/news','/other-service-categories','/other-service-categories/with-count','/other-service-items','/pharmacist-home-content','/policy-categories','/policy-projects','/products','/public-project','/services','/services/popular','/web-settings']);
const detail=/^\/(?:news|medicine|public-project|honor|products|policy-categories|other-service-items)\/[1-9]\d*$/;
globalThis.fetch=function(input,init){
 const logical=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(logical.origin==='https://backend.example.test'){
  const method=(init?.method??(input instanceof Request?input.method:'GET')).toUpperCase();
  const path=logical.pathname.slice(4);
  if(!logical.pathname.startsWith('/api/')||!['GET','HEAD'].includes(method)||(!paths.has(path)&&!detail.test(path)&&!/^\/laws\/law[1-7]$/.test(path)))throw new Error('Unsupported logical target '+logical);
  const queryAllowed=path==='/news'?['category','status']:['/medicine','/public-project'].includes(path)?['status']:path==='/honor'?['awardId']:path==='/policy-projects'?['categoryId']:path==='/products'?['category','search']:[];
  if([...logical.searchParams.keys()].some(key=>!queryAllowed.includes(key)))throw new Error('Unsupported logical query '+logical);
  if(new Headers(init?.headers).has('authorization'))throw new Error('Public authority');
  const mapped='http://127.0.0.1:4319'+logical.pathname+logical.search;
  fs.appendFileSync(process.env.TARGET_TRANSPORT_LOG,JSON.stringify({method,logical:logical.href,mapped})+'\n');
  return guardedFetch(mapped,init);
 }
 return guardedFetch(input,init);
};
