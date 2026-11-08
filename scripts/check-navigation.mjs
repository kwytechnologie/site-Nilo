// Check the visible content, not the tall scroll segment used by the river journey.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, devices } = createRequire(import.meta.url)(process.env.NILO_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NILO_QA_URL || 'http://127.0.0.1:4173/';
const output = '.qa/navigation';
await mkdir(output, { recursive: true });
const report = [];
for (const mobile of [false, true]) {
  const browser = await (mobile ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
  try {
    const page = await browser.newPage(mobile ? devices['iPhone 13'] : { viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + '?sem3d', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-necessarios]').click();
    for (const viewport of mobile ? [{ width: 390, height: 664 }, { width: 375, height: 667 }, { width: 430, height: 740 }] : [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const id of ['produto', 'como-funciona', 'whatsapp', 'empresas', 'distribuidoras', 'perguntas']) {
        if (mobile) await page.locator('[data-menu]').click();
        await page.locator(`${mobile ? '#menu-movel' : '.nav__links'} a[href="#${id}"]`).click();
        await page.waitForTimeout(mobile ? 1000 : 1900);
        const box = await page.locator('#' + id).evaluate(section => {
          const r = section.querySelector('.produto__conteudo, .placa').getBoundingClientRect();
          const nav = document.querySelector('[data-nav]').getBoundingClientRect().bottom;
          return { top: r.top, bottom: r.bottom, height: r.height, nav, viewport: visualViewport.height, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        report.push({ mobile, size: viewport, id, ...box });
        assert.equal(box.overflow, false);
        assert.ok(box.top >= box.nav + 6, `Header overlaps ${JSON.stringify(report.at(-1))}`);
        assert.ok(box.bottom <= box.viewport - 6, `Section exceeds screen: ${JSON.stringify(report.at(-1))}`);
        assert.ok(Math.abs((box.top - box.nav) - (box.viewport - box.bottom)) <= 10, `Not centered: ${JSON.stringify(report.at(-1))}`);
        if (viewport.width === 390 || viewport.width === 1366) await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${id}.png` });
        if (id === 'produto') for (const detail of ['geral', 'led', 'pes', 'frente']) {
          await page.locator('#produto-tab-' + detail).click();
          const fits = await page.locator('.produto__conteudo').evaluate(e => e.getBoundingClientRect().bottom <= visualViewport.height - 6);
          assert.ok(fits, `Product detail ${detail} exceeds ${JSON.stringify(viewport)}`);
        }
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '?sem3d#produto', { waitUntil: 'load' });
    await page.waitForFunction(() => location.hash === '#produto');
    assert.ok(await page.locator('.produto__conteudo').evaluate(e => e.getBoundingClientRect().top >= document.querySelector('[data-nav]').getBoundingClientRect().bottom));
    await page.setViewportSize(mobile ? { width: 844, height: 390 } : { width: 1024, height: 600 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Larger text / short screens must remain scrollable instead of clipped to a fixed height.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addStyleTag({ content: 'html { font-size: 24px; }' });
    await page.locator('#produto-tab-frente').click();
    assert.equal(await page.locator('#produto-frente').evaluate(e => e.scrollHeight <= e.clientHeight + 1), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(`Navigation: ${report.length} centered sections checked, plus deep links, reduced motion and enlarged text.`);
