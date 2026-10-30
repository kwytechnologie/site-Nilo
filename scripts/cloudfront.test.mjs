import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('CloudFront resolve índices e preserva os caminhos de assets', async () => {
  const template = await readFile(new URL('../infra/site.yml', import.meta.url), 'utf8');
  const source = template.match(/FunctionCode: \|\n([\s\S]*?)\n\n/)[1]
    .split('\n').map((line) => line.slice(8)).join('\n');
  const handler = runInNewContext(`${source}\nhandler`);
  for (const path of ['/', '/termos/', '/politica-de-privacidade/']) {
    assert.equal(handler({ request: { uri: path } }).uri, `${path}index.html`);
  }
  const redirect = handler({ request: { uri: '/termos' } });
  assert.equal(redirect.statusCode, 301);
  assert.equal(redirect.headers.location.value, '/termos/');
  for (const path of ['/assets/main-123.js', '/models/nilo.glb', '/sitemap.xml']) {
    assert.equal(handler({ request: { uri: path } }).uri, path);
  }
});
