// NILO_PLAYWRIGHT_MODULE may point to an existing Playwright installation.
// Browser emulation on this computer does not replace a physical iPhone test.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const { chromium, webkit, devices } = createRequire(import.meta.url)(process.env.NILO_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NILO_QA_URL || 'http://127.0.0.1:4173/';
const output = resolve('.qa', process.env.NILO_PRODUCT_LABEL || 'product');
await mkdir(output, { recursive: true });
const report = { base, tests: [], engines: 'Chrome desktop and WebKit iPhone viewport, not a physical device' };

for (const mobile of [false, true]) {
  const label = mobile ? 'webkit-mobile' : 'chrome-desktop';
  const browser = await (mobile ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
  const context = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  try {
    for (const visit of mobile ? ['cold', 'cached'] : ['cold']) {
      await page.goto(base + '?debug3d', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__niloDebug?.detailsReady || window.__niloDebug?.error, { timeout: 45000 });
      assert.equal(await page.evaluate(() => !!window.__niloDebug?.fallback), false);
      const initialImages = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /nilo-(perspectiva|led|pes|frente)-\d+/.test(r.name)).map(r => ({ name: r.name.split('/').pop(), bytes: r.transferSize })));
      if (visit === 'cached') assert.equal(await page.locator('.cookies-raiz').isVisible(), false);
      await page.evaluate(() => document.querySelector('[data-necessarios]')?.click());
      if (mobile) {
        await page.locator('[data-menu]').click();
        await page.locator('#menu-movel a[href="#produto"]').click();
        assert.equal(await page.locator('#menu-movel').isVisible(), false);
      } else await page.locator('.nav__links a[href="#produto"]').click();
      await page.waitForFunction(() => location.hash === '#produto' && document.getElementById('produto').classList.contains('is-dentro'));
      await page.waitForTimeout(mobile ? 900 : 1800);
      assert.match(await page.locator('.produto__cabecalho').innerText(), /bebedouro inteiro/);
      const button = page.locator('#produto-tab-led');
      if (!mobile) {
        const box = await button.boundingBox();
        await page.mouse.move(0, 0);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3);
        await page.waitForTimeout(250);
        const pull = await button.evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m41);
        assert.ok(pull > 1 && pull <= 8, `Magnet movement must be bounded: ${pull}`);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(50);
        assert.equal(await button.evaluate(e => getComputedStyle(e).transform), 'none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.mouse.move(0, 0);
        await page.waitForTimeout(250);
        assert.equal(await button.evaluate(e => e.style.getPropertyValue('--pull-x')), '');
      } else {
        await button.dispatchEvent('pointerenter', { pointerType: 'touch', clientX: 100, clientY: 100 });
        await button.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 110, clientY: 100 });
        assert.equal(await button.evaluate(e => e.style.getPropertyValue('--pull-x')), '');
      }
      const heights = [];
      for (const detail of ['geral', 'led', 'pes', 'frente']) {
        await page.locator(`#produto-tab-${detail}`).click();
        await page.waitForFunction(id => {
          const panel = document.getElementById('produto-' + id);
          const image = panel.querySelector('img');
          return !panel.hidden && image.complete && image.naturalWidth > 0;
        }, detail);
        assert.equal(await page.locator('#produto [role="tabpanel"]:visible').count(), 1);
        assert.equal(await page.locator(`#produto-tab-${detail}`).getAttribute('aria-selected'), 'true');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator(`#produto-${detail} .produto__foto`).evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
        assert.equal(await page.locator(`#produto-${detail} img`).evaluate(e => getComputedStyle(e).objectFit), 'contain');
        heights.push(await page.locator('#produto').evaluate(e => e.offsetHeight));
        if (visit === 'cold') await page.locator('#produto').screenshot({ path: join(output, `${label}-${detail}.png`) });
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 2, `Detail switching moves page: ${heights}`);
      await page.locator('#produto-tab-frente').press('Home');
      assert.equal(await page.locator('#produto-tab-geral').getAttribute('aria-selected'), 'true');
      await page.locator('#produto-tab-geral').press('ArrowRight');
      assert.equal(await page.locator('#produto-tab-led').getAttribute('aria-selected'), 'true');
      await page.locator('#produto-tab-led').press('End');
      assert.equal(await page.locator('#produto-tab-frente').getAttribute('aria-selected'), 'true');
      const images = await page.locator('#produto img').evaluateAll(imgs => imgs.map(i => ({ url: i.currentSrc, width: i.naturalWidth, complete: i.complete, loading: i.loading, visible: i.getClientRects().length > 0 })));
      assert.ok(images.filter(i => i.visible).every(i => i.complete && i.width > 0 && i.loading === 'lazy'));
      const imageBytes = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /nilo-(perspectiva|led|pes|frente)-\d+/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0));
      assert.ok(imageBytes < 100000, 'Product images exceed the transfer budget');
      const traversal = await page.evaluate(() => new Promise(resolve => {
        const door = document.querySelector('[data-porta]'), well = document.getElementById('nilometro');
        const start = door.getBoundingClientRect().top + scrollY, end = well.offsetTop + (well.offsetHeight - innerHeight) * .72;
        const began = performance.now(), frames = []; let previous = began, black = false;
        function step(now) {
          frames.push(now - previous); previous = now;
          const p = Math.min(1, (now - began) / 6500);
          scrollTo({ top: start + (end - start) * p, behavior: 'instant' });
          black ||= +getComputedStyle(document.querySelector('.stage__veil')).opacity > .05;
          if (p < 1) requestAnimationFrame(step);
          else setTimeout(() => {
            frames.sort((a, b) => a - b);
            resolve({ p95: frames[Math.floor(frames.length * .95)], max: Math.max(...frames), black, journey: window.__niloDebug.journey, fallback: window.__niloDebug.fallback });
          }, 500);
        }
        requestAnimationFrame(step);
      }));
      assert.ok(!traversal.black && !traversal.fallback && traversal.journey > 1.65, 'Nilometer entry regressed');
      report.tests.push({ label, visit, initialImages, images, imageBytes, heights, traversal });
      await page.goto('about:blank');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '?sem3d#produto', { waitUntil: 'load' });
    await page.waitForFunction(() => location.hash === '#produto');
    assert.equal(await page.locator('.produto__vista').evaluate(e => getComputedStyle(e).transform), 'none');
    for (const width of mobile ? [320, 390, 760] : [980, 1024, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
    }
    await page.locator('#produto-tab-led').click();
    await page.locator('.produto__base a').click();
    assert.equal(new URL(page.url()).hash, '#como-funciona');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
