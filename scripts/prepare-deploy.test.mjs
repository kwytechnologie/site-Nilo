import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { test } from 'node:test';

test('prepara todas as URLs e rejeita destinos inválidos antes de alterar arquivos', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nilo-deploy-'));
  const paths = ['index.html', 'termos/index.html', 'politica-de-privacidade/index.html', 'robots.txt', 'sitemap.xml'];
  const previousUrl = 'https://kwytechnologie.github.io/site-Nilo';
  try {
    await mkdir(join(root, 'scripts'));
    const script = join(root, 'scripts/prepare-deploy.mjs');
    await copyFile(new URL('./prepare-deploy.mjs', import.meta.url), script);
    for (const path of paths) {
      const file = join(root, 'dist', path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, `${previousUrl}/ ${previousUrl}/img/og-nilo.jpg`);
    }
    const run = (url) => execFileSync(process.execPath, [script], {
      env: { ...process.env, NILO_SITE_URL: url }, stdio: 'pipe',
    });
    for (const url of ['http://nilo.kwytech.com', 'https://nilo.kwytech.com/subdir',
      'https://nilo.kwytech.com/?q=1', 'https://user:pass@nilo.kwytech.com', 'invalid']) {
      assert.throws(() => run(url));
      assert.match(await readFile(join(root, 'dist/index.html'), 'utf8'), /github\.io/);
    }
    run('https://nilo.kwytech.com/');
    for (const path of paths) {
      assert.equal(await readFile(join(root, 'dist', path), 'utf8'),
        'https://nilo.kwytech.com/ https://nilo.kwytech.com/img/og-nilo.jpg');
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
