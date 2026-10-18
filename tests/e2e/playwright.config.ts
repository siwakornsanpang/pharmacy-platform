import { resolve } from 'node:path';
import { defineConfig } from 'playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'baseline.spec.ts', fullyParallel: false, workers: 1,
  timeout: 45_000, expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixels: 0 } },
  snapshotPathTemplate: '{testDir}/snapshots/{projectName}/{arg}{ext}',
  reporter: [['list'], ['json', { outputFile: 'test-results/visual-results.json' }]],
  use: { channel: 'chrome', locale: 'th-TH', timezoneId: 'Asia/Bangkok', deviceScaleFactor: 1, serviceWorkers: 'block', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { cwd: resolve(__dirname, '../..'), command: 'node --import tsx tests/e2e/start-legacy.ts', url: 'http://127.0.0.1:4321/login', timeout: 360_000, reuseExistingServer: false },
});
