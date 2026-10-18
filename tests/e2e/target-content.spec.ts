import { test, expect, type BrowserContext, type Page } from 'playwright/test';
import { readFileSync } from 'node:fs';

const pharmacyOrigin='http://127.0.0.1:4321';
const backofficeOrigin='http://127.0.0.1:4320';
const fixtureOrigin='http://127.0.0.1:4319';
const fixedClock=new Date('2026-10-14T00:00:00Z');
const mapsUrl='https://www.google.com/maps/embed?pb=synthetic';
const fixtureRequests=()=>readFileSync('.superpowers/task-3b/fixture-requests.jsonl','utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));

async function guard(context: BrowserContext) {
  const unexpected:string[]=[];const authorization:string[]=[];const substitutions:string[]=[];
  context.on('request',request=>{if(request.headers().authorization)authorization.push(request.url());});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===pharmacyOrigin&&url.pathname==='/api/auth/pharmacy/me')return route.fulfill({status:401,json:{message:'Unauthenticated fixture'}});
    if(url.origin===pharmacyOrigin&&url.pathname==='/api/conference/session')return route.fulfill({json:{ok:true}});
    if([pharmacyOrigin,backofficeOrigin].includes(url.origin))return route.continue();
    if(url.origin===fixtureOrigin&&url.pathname==='/assets/synthetic.svg')return route.continue();
    if(url.origin===fixtureOrigin&&url.pathname==='/pharmacists')return route.continue();
    if(url.href===mapsUrl){substitutions.push(url.href);return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Reviewed synthetic Maps fixture</title>'});}
    unexpected.push(`${route.request().method()} ${url.origin}${url.pathname}`);return route.abort('blockedbyclient');
  });
  return {unexpected,authorization,substitutions};
}

async function ready(page: Page,path: string) {
  const response=await page.goto(pharmacyOrigin+path);expect(response?.ok(),path).toBeTruthy();
  await page.waitForLoadState('networkidle');
  await page.clock.runFor(20);await page.clock.setFixedTime(fixedClock);
  await expect(page.locator('main,article,h1,h2').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Application error:');
  await expect.poll(()=>page.evaluate(()=>document.fonts.status),{timeout:10_000}).toBe('loaded');
}

test.describe('actual Pharmacy Content target',()=>{
  test('matches accepted representative screenshots without updating baselines',async({context,page})=>{
    const network=await guard(context);
    await page.clock.install({time:fixedClock});await page.clock.pauseAt(fixedClock);
    for(const [path,snapshot] of [
      ['/06_news','pharmacy--06-news-default.png'],
      ['/04_service/people-project/101','pharmacy--04-service-people-project-101-default.png'],
    ] as const){
      await ready(page,path);
      await expect(page).toHaveScreenshot(snapshot,{animations:'disabled',fullPage:true});
    }
    expect(network.unexpected).toEqual([]);expect(network.authorization).toEqual([]);
  });

  test('smokes changed consumers, reviewed Maps, and preserved mock flows',async({context,page})=>{
    const network=await guard(context);
    await page.clock.install({time:fixedClock});await page.clock.pauseAt(fixedClock);
    const honorDetailBaseline=fixtureRequests().filter(entry=>entry.path==='/api/honor/101').length;
    const publicRoutes=[
      '/01_home','/02_about/committee','/02_about/council-directory','/02_about/hall-of-fame','/02_about/policy',
      '/03_department','/04_service','/04_service/people-project','/04_service/people-project/101',
      '/06_news','/06_news/101','/07_laws','/08_other-service','/09_contact',
      '/10_license-search?type=name&first=%E0%B8%81%E0%B8%B4%E0%B8%95%E0%B8%95%E0%B8%B4','/04_service/e-service/sap-33',
    ];
    for(const path of publicRoutes){
      await ready(page,path);
      if(path==='/09_contact'){
        const map=page.locator('iframe[title="Google Maps"]');await expect(map).toHaveAttribute('src',mapsUrl);await expect(map).toHaveAttribute('loading','lazy');
        expect(await map.getAttribute('srcdoc')).toBeNull();await map.scrollIntoViewIfNeeded();await expect.poll(()=>network.substitutions).toContain(mapsUrl);
      }
      if(path==='/02_about/hall-of-fame'){
        expect(fixtureRequests().filter(entry=>entry.path==='/api/honor/101')).toHaveLength(honorDetailBaseline);
        await page.getByRole('button',{name:/ดูรายละเอียด/}).click();
        await expect(page.getByRole('dialog')).toContainText('รายละเอียดเฉพาะจาก Honor detail fixture');
        await expect.poll(()=>fixtureRequests().filter(entry=>entry.path==='/api/honor/101').length).toBe(honorDetailBaseline+1);
      }
    }
    await context.addCookies([{name:'pharmacy_session',value:'fixture-only',url:pharmacyOrigin}]);
    await context.route('**/api/auth/pharmacy/me',route=>route.fulfill({json:{user:{displayName:'Fixture Member',pharmacistLicense:'FIX-0001'}}}));
    await ready(page,'/profile/edit');
    expect((await context.cookies()).some(cookie=>cookie.name.includes('staff')||cookie.name==='auth_token')).toBe(false);
    expect(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}))).not.toMatch(/staff|jwt|auth_token/i);
    expect(network.unexpected).toEqual([]);expect(network.authorization).toEqual([]);
    const identity=JSON.parse(readFileSync('.superpowers/task-3b/target-identity.json','utf8'));
    expect(identity.sourceHashes).toEqual(identity.copyHashes);expect(identity.buildIds.pharmacy).toBeTruthy();expect(identity.buildIds.backoffice).toBeTruthy();
    expect(identity.jsdomBrowserBundleMatches).toEqual([]);expect(readFileSync('.superpowers/task-3b/egress.jsonl','utf8')).toBe('');
    const fixture=fixtureRequests();
    expect(fixture.filter(entry=>entry.status===501)).toEqual([]);expect(fixture.some(entry=>entry.authority)).toBe(false);
  });

  test('installed Quill rejects hostile video before any request and keeps load/output sanitized',async({context,page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop','one real browser execution is sufficient');
    const network=await guard(context);
    await page.goto(backofficeOrigin+'/task3b-editor');await page.waitForLoadState('networkidle');
    const editor=page.locator('.ql-editor');await expect(editor).toBeVisible();
    expect(await editor.locator('[onerror],.ql-formula,img').count()).toBe(0);
    await page.getByRole('button',{name:'Export hostile video'}).click();
    await expect(page.getByTestId('raw')).not.toContainText('onerror');
    expect(await editor.locator('iframe').count()).toBe(0);
    const clean=page.getByTestId('clean');expect(await clean.locator('[onerror],img,iframe,script,svg,math').count()).toBe(0);
    expect(await clean.innerHTML()).not.toMatch(/onerror|javascript:|<iframe/i);
    expect(network.unexpected).toEqual([]);expect(network.authorization).toEqual([]);
  });
});
