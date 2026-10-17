import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
async function ready(page) { await page.goto('./'); await expect(page.locator('#status-comparison')).toContainText('Complete', { timeout: 45000 }); await expect(page.locator('#source-error')).toBeHidden(); }
async function compare(page) { await page.locator('#run-comparison').click(); await expect(page.locator('#status-comparison')).toContainText('Complete'); await expect(page.locator('#error-comparison')).toBeHidden(); }
test('default Moon run, independent parts, real histograms and no external requests', async ({ page }) => {
  const errors = [], external = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4175') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); });
  await ready(page);
  await expect(page.locator('#metric-original')).toHaveText('13.33'); await expect(page.locator('#metric-global')).toHaveText('74.01'); await expect(page.locator('#metric-clahe')).toHaveText('18.53');
  for (const key of ['input', 'stretch', 'global', 'clahe']) await expect(page.locator(`#p2-${key}`)).toBeVisible();
  await page.locator('#run-global').click(); await expect(page.locator('#status-global')).toContainText('Complete');
  await page.locator('[data-preset="4,8,2"]').click(); await expect(page.locator('#download-comparison')).toBeDisabled(); await expect(page.locator('#p2-clahe')).toBeHidden(); await expect(page.locator('#p1-global')).toBeVisible();
  await compare(page); await expect(page.locator('#output-settings')).toContainText('CLAHE 4');
  await page.locator('[data-preset="2,8,0"]').click(); await compare(page);
  const identical = await page.evaluate(() => { const a = document.querySelector('#p2-input'), b = document.querySelector('#p2-stretch'); return a.toDataURL() === b.toDataURL(); }); expect(identical).toBe(true);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
test('color upload, working-channel histograms, failed input, and recovery', async ({ page }) => {
  await ready(page);
  await page.locator('#image-upload').setInputFiles(fileURLToPath(new URL('./color-fixture.png', import.meta.url)));
  await expect(page.locator('#source-name')).toHaveText('color-fixture.png'); await expect(page.locator('#status-comparison')).toContainText('Complete');
  await page.locator('#color-mode').selectOption('yuv'); await expect(page.locator('#p1-global')).toBeHidden(); await compare(page);
  await expect(page.locator('#part2-panels .channel-label').first()).toHaveText('Y working channel');
  await page.locator('#image-upload').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(page.locator('#source-error')).toBeVisible(); await expect(page.locator('#run-comparison')).toBeDisabled(); await expect(page.locator('#export-results')).toBeDisabled();
  await page.locator('#use-sample').click(); await expect(page.locator('#source-name')).toHaveText('moon.png'); await expect(page.locator('#status-comparison')).toContainText('Complete');
});
test('actual downloads, observation persistence, source copy fallback and configurable links', async ({ page }) => {
  await ready(page);
  for (const [selector, suffix] of [['#download-comparison', '.png'], ['#export-results', '.json'], ['[data-download="p2-clahe"]', '.png']]) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]); expect(download.suggestedFilename()).toContain(suffix); expect(await download.failure()).toBeNull();
  }
  await page.locator('#observation-notes').fill('CLAHE preserves subtle local detail.'); await page.reload(); await expect(page.locator('#observation-notes')).toHaveValue('CLAHE preserves subtle local detail.');
  await page.locator('#open-settings').click(); await expect(page.locator('#link-dialog')).toBeVisible();
  await page.locator('#compilation-url').fill('https://example.com/compilation/'); await page.locator('#repository-url').fill('https://github.com/example/lab3');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-config').click()]); expect(download.suggestedFilename()).toBe('site-config.js');
  await page.locator('#link-form button[type="submit"]').click(); await expect(page.locator('#link-dialog')).toBeHidden();
  await page.locator('#python-details').evaluate(el => { el.open = true; }); await expect(page.locator('#python-code')).toContainText('cv2.equalizeHist');
});
test('mobile navigation, keyboard, responsive layout, and accessibility', async ({ page }) => {
  await ready(page);
  const accessibility = await new AxeBuilder({ page }).analyze(); expect(accessibility.violations).toEqual([]);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`).toBe(true);
  }
  await page.locator('#menu-toggle').click(); await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#main-nav a[href="#experiments"]').click(); await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#open-settings').click(); await page.keyboard.press('Escape'); await expect(page.locator('#link-dialog')).toBeHidden();
  const mobile = await new AxeBuilder({ page }).analyze(); expect(mobile.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  await page.screenshot({ path: 'artifacts/mobile-home.png' });
  await page.locator('#part2').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'artifacts/mobile-experiments.png' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('./');
  await expect(page.locator('#status-comparison')).toContainText('Complete');
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.locator('#part2').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'artifacts/experiments.png' });
});
test('worker load failure has a working retry and root routing works', async ({ page }) => {
  await page.route('**/assets/vendor/opencv.js', route => route.abort());
  await page.goto('http://127.0.0.1:4175/');
  await expect(page.locator('#engine-status')).toContainText('unavailable');
  await expect(page.locator('#run-comparison')).toBeDisabled();
  await page.unroute('**/assets/vendor/opencv.js'); await page.locator('#retry-engine').click();
  await expect(page.locator('#status-comparison')).toContainText('Complete');
  await expect(page.locator('#retry-engine')).toBeHidden();
});
