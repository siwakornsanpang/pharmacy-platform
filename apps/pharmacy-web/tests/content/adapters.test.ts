import { expect, test, vi, afterEach } from 'vitest';
vi.mock('server-only',()=>({}));
import * as server from '../../features/content/server-api';
import * as browser from '../../features/content/browser-api';
afterEach(()=>vi.unstubAllGlobals());
test('public browser arrays preserve all rows with no credentials/authority and no-store',async()=>{
 const rows=Array.from({length:21},(_,id)=>({id,name:'literal',categoryId:1,pdfUrl:null,order:id}));
 const fetch=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>new Response(JSON.stringify(rows),{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 expect(await browser.getAllOtherServiceItems()).toEqual(rows.map(row=>({...row,status:'online'})));
 expect(fetch.mock.calls[0][0]).toBe('/api/backend/other-service-items');
 expect(fetch.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'same-origin'});
 expect(new Headers(fetch.mock.calls[0][1]?.headers).has('authorization')).toBe(false);
});
test('server detail and metadata path use private origin, /api once, no-store and omit staff authority',async()=>{
 vi.stubEnv('NODE_ENV','production');process.env.BACKEND_API_URL='https://backend.example.test';process.env.PHARMACY_WEB_ORIGIN='https://app.example.test';
 const fetch=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>new Response(JSON.stringify({id:1,title:'x',content:'<p>x</p>',publishedAt:null}),{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 expect((await server.getNewsById('1'))?.id).toBe(1);
 expect(fetch.mock.calls[0][0]).toBe('https://backend.example.test/api/news/1');
 expect(fetch.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'omit'});
 expect(new Headers(fetch.mock.calls[0][1]?.headers).has('authorization')).toBe(false);
});
