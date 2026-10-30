import { readFile, writeFile } from 'node:fs/promises';

const siteUrl = new URL(process.env.NILO_SITE_URL);
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' ||
    siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) {
  throw new Error('NILO_SITE_URL deve ser uma origem HTTPS, sem caminho, credenciais ou parâmetros.');
}

const previousUrl = 'https://kwytechnologie.github.io/site-Nilo';
for (const path of [
  'index.html',
  'termos/index.html',
  'politica-de-privacidade/index.html',
  'robots.txt',
  'sitemap.xml',
]) {
  const file = new URL(`../dist/${path}`, import.meta.url);
  const contents = await readFile(file, 'utf8');
  if (!contents.includes(previousUrl)) {
    throw new Error(`URL original não encontrada em ${path}; revise a preparação do deploy.`);
  }
  await writeFile(file, contents.replaceAll(previousUrl, siteUrl.origin));
}
