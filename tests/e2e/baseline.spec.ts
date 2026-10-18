import { test, expect } from 'playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { routeManifest } from './route-manifest';
import content from '../fixtures/content.json';
import academy from '../fixtures/academy.json';
import conference from '../fixtures/conference.json';
const uiFixtures = { ...content, ...academy, ...conference } as Record<string, unknown>;
import assetManifest from '../fixtures/assets/manifest.json';
const fixedClock = new Date('2026-10-14T00:00:00Z');
const fontHashes = new Set(assetManifest.assets.filter(a => a.path.endsWith('.woff2')).map(a => a.sha256));

const suite = process.env.UI_BASELINE_SUITE ?? 'baseline';
if (!['baseline', 'content-registry-media'].includes(suite)) throw new Error('Unsupported UI_BASELINE_SUITE');
test.describe(suite, () => {
  for (const item of routeManifest) {
    test(`${item.app} ${item.route} ${item.state}`, async ({ context, page }, testInfo) => {
      const origin = item.app === 'backoffice' ? 'http://127.0.0.1:4320' : 'http://127.0.0.1:4321';
      const substitutions: string[] = [];
      const blockedPrefetches: string[] = [];
      const unexpectedRequests: string[] = [];
      const pageErrors: string[] = [];
      const requests: Record<string, number> = {};
      const payloadCounts = { bodies: 0, bytes: 0 };
      const pending = new Set<string>();
      page.on('request', request => pending.add(request.url()));
      page.on('requestfinished', request => pending.delete(request.url()));
      page.on('requestfailed', request => pending.delete(request.url()));
      const fonts: Promise<void>[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      context.on('response', response => {
        const url = new URL(response.url());
        if (url.port === '4319' && response.status() === 501) unexpectedRequests.push(`fixture ${url.pathname}`);
        if (url.pathname.endsWith('.woff2')) fonts.push(response.body().then(body => {
          expect(response.ok()).toBeTruthy();
          expect(fontHashes.has(createHash('sha256').update(body).digest('hex'))).toBeTruthy();
        }));
      });
      await context.routeWebSocket(/.*/, socket => { unexpectedRequests.push(`websocket ${socket.url()}`); socket.close(); });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const payload = route.request().postDataBuffer();
        if (payload) { payloadCounts.bodies++; payloadCounts.bytes += payload.length; }
        requests[`${route.request().method()} ${url.pathname}`] = (requests[`${route.request().method()} ${url.pathname}`] || 0) + 1;
        if (url.origin === origin && item.app === 'pharmacy') {
          if (url.searchParams.has('_rsc') && (route.request().headers()['next-router-prefetch'] === '1' || Boolean(route.request().headers()['next-router-segment-prefetch'])) && ['/register', '/forgot-password'].includes(url.pathname)) {
            blockedPrefetches.push(url.pathname);
            return route.fulfill({ status: 204, body: '' });
          }
          if (url.pathname === '/api/auth/pharmacy/login' && item.state === 'otp-challenge') return route.fulfill({ json: { challengeId: 'fixture-challenge' } });
          if (url.pathname === '/api/auth/pharmacy/me') return route.fulfill({ status: item.role === 'member' ? 200 : 401, json: item.role === 'member' ? { user: { displayName: 'Fixture Member', pharmacistLicense: 'FIX-0001' } } : { message: 'Unauthenticated fixture' } });
          if (url.pathname === '/api/conference/session') return route.fulfill({ json: { ok: true } });
          if (url.pathname.startsWith('/api/conference/') || url.pathname.startsWith('/api/academy/')) {
            const payload = uiFixtures[url.pathname];
            if (payload !== undefined && route.request().method() === 'GET') return route.fulfill({ json: payload });
            unexpectedRequests.push(`unsupported UI fixture ${url.pathname}`);
            return route.fulfill({ status: 501, json: { message: 'Unknown fixture' } });
          }
        }
        if ([origin, 'http://127.0.0.1:4319'].includes(url.origin)) return route.continue();
        if ((url.hostname === 'images.unsplash.com') || url.hostname === 'placehold.co') {
          substitutions.push(url.origin + url.pathname);
          return route.fulfill({ contentType: 'image/svg+xml', body: readFileSync('tests/fixtures/assets/synthetic.svg') });
        }
        if (url.hostname === 'www.youtube.com' && url.pathname.startsWith('/embed/')) {
          substitutions.push(url.origin + url.pathname);
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body style="background:#111;color:white;display:grid;place-items:center;height:90vh">Offline video fixture</body></html>' });
        }
        unexpectedRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
      });
      if (item.app === 'pharmacy' && item.role === 'member') await context.addCookies([{ name: 'pharmacy_session', value: 'fixture-only', url: origin }]);
      if (item.app === 'backoffice' && item.role !== 'anonymous') await context.addCookies(Object.entries({ auth_token: 'fixture-token', user_role: 'admin', user_display_name: 'Fixture Staff', user_id: '101' }).map(([name, value]) => ({ name, value, url: origin })));
      await page.clock.install({ time: fixedClock });
      await page.clock.pauseAt(fixedClock);
      const response = await page.goto(origin + item.route);
      expect(response?.ok()).toBeTruthy();
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { throw new Error(`Offline readiness pending: ${[...pending].join(', ')}`); });
      // React's dynamic editor import also schedules readiness work; progress only 20ms.
      await page.clock.runFor(20);
      await page.clock.setFixedTime(fixedClock);
      if (item.app === 'pharmacy') {
        // Flush only the existing 0ms auth readiness timer; keep every carousel below its 5s tick.
        await page.clock.runFor(20);
        await page.clock.setFixedTime(fixedClock);
      }
      await expect(page.locator('body')).not.toBeEmpty();
      if (item.app === 'backoffice' && (item.route === '/login' || item.route === '/')) await expect(page.locator('input[type="password"]')).toBeVisible();
      else if (item.app === 'backoffice') { await expect(page.locator('body')).toContainText('Fixture Staff'); expect(new URL(page.url()).pathname).toBe(item.expectedFinalRoute || item.route); }
      else {
        await expect(page.locator('main, h1, h2').first()).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(item.expectedFinalRoute || (item.route === '/' ? '/home' : item.route.split('?')[0]));
        await expect(page.locator('body')).not.toContainText('Application error:');
        await expect(page.locator('body')).not.toContainText('This page could not be found');
      }
      if (item.state === 'navigation-open' && testInfo.project.name === 'mobile') {
        await page.getByRole('button', { name: 'เปิดเมนู', exact: true }).click();
        await expect(page.getByRole('button', { name: 'ปิดเมนู', exact: true }).last()).toBeVisible();
      }
      if (item.app === 'backoffice' && /news\/(create|edit)/.test(item.route)) {
        for (let step = 0; step < 10 && await page.locator('.ql-editor').count() === 0; step++) {
          await page.clock.runFor(100);
          await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { throw new Error(`Offline readiness pending: ${[...pending].join(', ')}`); });
        }
        await page.clock.setFixedTime(fixedClock);
        await expect(page.locator('.ql-editor')).toBeVisible();
      }
      if (item.state === 'otp-challenge') {
        await page.locator('#login-id').fill('FIX-0001');
        await page.locator('#login-password').fill('synthetic-fixture-only');
        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
        await expect(page.locator('#otp-0')).toBeVisible();
        await page.clock.runFor(50);
        await page.clock.setFixedTime(fixedClock);
      }
      if (item.app === 'pharmacy' && item.route.includes('license-search?')) {
        const result = page.locator('a[href^="/license-search/"]').first();
        await expect(result).toBeVisible();
        const detail = await result.getAttribute('href');
        await result.click();
        await expect(page.getByText('รายละเอียดผู้ประกอบวิชาชีพ', { exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'ย้อนกลับผลการค้นหา', exact: true }).click();
        await page.getByRole('button', { name: '2', exact: true }).click();
        expect(await page.locator('a[href^="/license-search/"]').first().getAttribute('href')).not.toBe(detail);
      }
      if (item.state === 'profile-save') {
        // Existing form is a UI mock; submit uses its own unchanged handler.
        await page.locator('form').evaluate(form => form.requestSubmit());
        await expect(page.getByText('บันทึกข้อมูลสำเร็จ', { exact: true })).toBeVisible();
      }
      if (item.state === 'mutation-error') {
        await page.getByPlaceholder('ระบุหัวข้อข่าว...', { exact: true }).fill('Synthetic fixture article');
        await page.locator('.ql-editor').fill('Synthetic fixture content');
        await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
        await expect(page.getByText('Synthetic mutation failure', { exact: true })).toBeVisible();
      }
      if (item.state === 'crop' || item.state === 'upload-error') {
        // A deterministic synthetic SVG feeds the unchanged FileReader/crop UI.
        await page.locator('#thumb-input').setInputFiles('tests/fixtures/assets/synthetic.svg');
        await expect(page.getByRole('button', { name: 'ตกลงและบันทึก', exact: true })).toBeVisible();
        if (item.state === 'upload-error') {
          await page.getByRole('button', { name: 'ตกลงและบันทึก', exact: true }).click();
          await expect(page.getByText('อัปโหลดรูปไม่สำเร็จ', { exact: true })).toBeVisible();
        }
      }
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { throw new Error(`Offline readiness pending: ${[...pending].join(', ')}`); });
      let motionState: Array<{ opacity: string; transform: string }> | null = null;
      let motionNativeAnimationCount: number | null = null;
      if (item.app === 'pharmacy' && item.pattern === '/05_meeting') {
        // WAAPI uses the document timeline, so virtual timers alone cannot settle this entry animation.
        motionNativeAnimationCount = await page.locator('[class*="recommendCard"]').evaluate(async card => {
          const animations = card.getAnimations({ subtree: true });
          await Promise.all(animations.map(async animation => { animation.finish(); await animation.finished; }));
          return animations.length;
        });
        await page.clock.runFor(300);
        await page.locator('[class*="recommendCard"]').evaluate(async card => {
          await Promise.all(card.getAnimations({ subtree: true }).map(async animation => { animation.finish(); await animation.finished; }));
        });
        await page.clock.runFor(32);
        await page.clock.setFixedTime(fixedClock);
        motionState = await page.locator('[class*="recommendCard"]').evaluateAll(cards => cards.map(card => ({ opacity: getComputedStyle(card).opacity, transform: getComputedStyle(card).transform })));
        expect(motionState).toHaveLength(1);
        expect(motionState[0].opacity).toBe('1');
        expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(motionState[0].transform);
      }
      const fontState = await page.evaluate(async () => {
        await document.fonts.ready;
        const families = [...document.fonts].map(face => ({ family: face.family, status: face.status, weight: face.weight }));
        const family = families.find(face => !face.family.includes('Fallback') && /Kanit|kanit/.test(face.family))?.family;
        if (!family) throw new Error('Kanit missing');
        for (const weight of [300, 400, 500, 600]) await document.fonts.load(`${weight} 16px "${family}"`, 'ภาษาไทย Latin');
        await Promise.all([...document.images].map(async image => { if (!image.getAttribute('src') && !image.getAttribute('srcset')) return;
          image.loading = 'eager'; if (!image.complete) await image.decode(); if (!image.naturalWidth && !image.currentSrc.endsWith('/favicon.ico')) throw new Error(`Image failed: ${image.currentSrc}`); }));
        return { clock: new Date().toISOString(), checks: [300, 400, 500, 600].map(weight => document.fonts.check(`${weight} 16px "${family}"`, 'ภาษาไทย Latin')), faces: families, bodyFont: getComputedStyle(document.body).fontFamily };
      });
      await Promise.all(fonts);
      expect(fontState.clock).toBe('2026-10-14T00:00:00.000Z');
      expect(fontState.checks).toEqual([true, true, true, true]);
      expect(fonts.length).toBeGreaterThan(0);
      expect(unexpectedRequests).toEqual([]); expect(pageErrors).toEqual([]);
      expect(readFileSync('.superpowers/ui-baseline/egress.jsonl', 'utf8')).toBe('');
      expect(readFileSync('.superpowers/ui-baseline/fixture-requests.jsonl', 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(entry => entry.status === 501)).toEqual([]);
      await testInfo.attach('offline-provenance', { body: JSON.stringify({ route: item, requests, payloadCounts, substitutions, blockedPrefetches, unexpectedRequests, motionState, motionNativeAnimationCount, fontState, browser: context.browser()?.version() }, null, 2), contentType: 'application/json' });
      await expect(page.locator('body')).not.toContainText('Application error:');
      await expect(page.locator('body')).not.toContainText('This page could not be found');
      if (item.captureScreenshot) await expect(page).toHaveScreenshot(`${item.app}-${item.route.replaceAll('/', '_') || 'root'}-${item.state}.png`, { animations: 'disabled', fullPage: true });
    });
  }
});
