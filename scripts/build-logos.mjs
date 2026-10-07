// Gera as opções de logo do Nilo em SVG a partir dos contornos da Rokkitt Black (licença OFL,
// que permite usar e modificar os contornos numa marca). Rodar: node scripts/build-logos.mjs
// Saída: public/marca/*.svg (usadas no site e na página da marca).
import opentype from 'opentype.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/marca');
mkdirSync(out, { recursive: true });

const buf = readFileSync(resolve(root, 'node_modules/@fontsource/rokkitt/files/rokkitt-latin-900-normal.woff'));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const C = {
  linho: '#F2E9D8',
  nilo: '#1B3A4C',
  noite: '#0B1F2A',
  faianca: '#36B3A8',
  ouro: '#D9A441',
  cornalina: '#E8652B',
  lapis: '#23408E',
  papiro: '#7FA04A',
};

const SIZE = 200; // corpo da fonte em unidades do SVG
const BASE = 200; // linha de base

// Divide um caminho do opentype em contornos (cada M inicia um).
function contours(path) {
  const list = [];
  let cur = null;
  for (const c of path.commands) {
    if (c.type === 'M') { cur = [c]; list.push(cur); } else if (cur) cur.push(c);
  }
  return list;
}
function cmdsToD(cmds) {
  const p = new opentype.Path();
  p.commands = cmds;
  return p.toPathData(2);
}
function bbox(cmds) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of cmds) for (const [x, y] of [[c.x, c.y], [c.x1, c.y1], [c.x2, c.y2]]) {
    if (x == null) continue;
    x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  }
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

// Posiciona cada letra com o avanço e o kerning da própria fonte.
function layout(text, x0 = 0, tracking = 0) {
  const glyphs = font.stringToGlyphs(text);
  const scale = SIZE / font.unitsPerEm;
  let x = x0;
  return glyphs.map((g, i) => {
    const path = g.getPath(x, BASE, SIZE);
    const item = { char: text[i], path, x, contours: contours(path), box: bbox(path.commands) };
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    x += (g.advanceWidth + kern) * scale + tracking;
    return item;
  });
}

// Gota d'água: ponta para cima, centrada em (cx, cy), altura h.
function drop(cx, cy, h) {
  const r = h * 0.36;
  const top = cy - h / 2;
  const by = cy + h / 2 - r;
  return `M${cx},${top} C${cx + r * 0.25},${top + h * 0.28} ${cx + r},${by - r * 0.45} ${cx + r},${by} A${r},${r} 0 1 1 ${cx - r},${by} C${cx - r},${by - r * 0.45} ${cx - r * 0.25},${top + h * 0.28} ${cx},${top} Z`;
}

// Onda do hieróglifo N35 (água): zigue-zague de n dentes entre x1 e x2.
function ripple(x1, x2, y, amp, n) {
  const step = (x2 - x1) / n;
  let d = `M${x1},${y}`;
  for (let i = 0; i < n; i++) {
    d += ` L${x1 + step * (i + 0.5)},${y - amp} L${x1 + step * (i + 1)},${y}`;
  }
  return d;
}

function wordmarkParts(tracking = 6) {
  const g = layout('nilo', 0, tracking);
  const [n, i, l, o] = g;
  // No "i", o contorno mais alto é o pingo.
  const ic = i.contours.map((c) => ({ c, b: bbox(c) })).sort((a, b) => a.b.y1 - b.b.y1);
  const dot = ic[0];
  const stem = ic.slice(1).map((x) => x.c).flat();
  return { n, i, l, o, dot, stem, width: o.box.x2 };
}

function svg(w, h, body, { bg, title } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title ?? 'Nilo'}">
<title>${title ?? 'Nilo'}</title>
${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}
</svg>
`;
}

// ── Opção A · "Côvado": o l vira a coluna graduada do nilômetro e o pingo do i vira gota.
// As marcas são entalhes vazados no fuste do l, do lado direito, como numa régua de côvados.
function stemRight(cmds, box) {
  // O fuste do l é um segmento vertical longo: pega o mais à direita.
  let xr = -Infinity, px = null, py = null;
  for (const c of cmds) {
    if (c.type === 'L' && px != null && Math.abs(c.x - px) < 0.6 && Math.abs(c.y - py) > box.h * 0.4) xr = Math.max(xr, c.x);
    if (c.x != null) { px = c.x; py = c.y; }
  }
  return xr;
}
function optionA(ink, water, mark, id = 'a') {
  const p = wordmarkParts(8);
  const lb = p.l.box;
  const xr = stemRight(p.l.path.commands, lb);
  const top = lb.y1 + 22, bottom = lb.y2 - 34;
  const count = 6;
  const cuts = [];
  for (let k = 0; k <= count; k++) {
    const y = top + ((bottom - top) * k) / count;
    const len = k % 3 === 0 ? 17 : 10;
    cuts.push(`<rect x="${(xr - len).toFixed(1)}" y="${(y - 2.6).toFixed(1)}" width="${len + 2}" height="5.2" fill="black"/>`);
  }
  const d = p.dot.b;
  const body = `<defs><mask id="covado-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${p.width + 20}" height="240">
  <rect x="0" y="0" width="${p.width + 20}" height="240" fill="white"/>
  ${cuts.join('\n  ')}
</mask></defs>
<g transform="translate(20 -48)">
  <path d="${cmdsToD(p.n.path.commands)}" fill="${ink}"/>
  <path d="${cmdsToD(p.stem)}" fill="${ink}"/>
  <path d="${drop(d.cx, d.cy - 4, d.h * 1.55)}" fill="${water}"/>
  <path d="${cmdsToD(p.l.path.commands)}" fill="${ink}" mask="url(#covado-${id})"/>
  <path d="${cmdsToD(p.o.path.commands)}" fill="${ink}"/>
</g>`;
  return { body, w: Math.ceil(p.width + 40), h: 170 };
}

// Só a palavra, sem símbolo (usada ao lado dos símbolos B a F).
function plainWord(ink, water, dx = 0, dy = 0, scale = 1) {
  const p = wordmarkParts(6);
  const d = p.dot.b;
  return `<g transform="translate(${dx} ${dy}) scale(${scale})">
  <path d="${cmdsToD(p.n.path.commands)}" fill="${ink}"/>
  <path d="${cmdsToD(p.stem)}" fill="${ink}"/>
  <path d="${drop(d.cx, d.cy - 4, d.h * 1.55)}" fill="${water}"/>
  <path d="${cmdsToD(p.l.path.commands)}" fill="${ink}"/>
  <path d="${cmdsToD(p.o.path.commands)}" fill="${ink}"/>
</g>`;
}

// ── Opção B · "Poço": o nilômetro visto de cima. Poço quadrado, escada em espiral, coluna no centro.
function symbolPoco(ink, water, mark) {
  const s = 120, c = s / 2;
  // Espiral quadrada da escada, de fora para dentro.
  const pts = [];
  let r = 46;
  const corners = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
  pts.push([c - r + 10, c - r]);
  for (let k = 0; k < 7; k++) {
    const [sx, sy] = corners[k % 4];
    pts.push([c + sx * r, c + sy * r]);
    r -= 4.6;
  }
  const spiral = 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  // Coluna octogonal.
  const oct = Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 4) * k + Math.PI / 8;
    return `${(c + Math.cos(a) * 12).toFixed(1)},${(c + Math.sin(a) * 12).toFixed(1)}`;
  }).join(' ');
  return `<rect x="4" y="4" width="${s - 8}" height="${s - 8}" rx="18" fill="none" stroke="${ink}" stroke-width="8"/>
  <path d="${spiral}" fill="none" stroke="${mark}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <polygon points="${oct}" fill="${water}"/>`;
}
function optionB(ink, water, mark) {
  const body = `<g transform="translate(16 25)">${symbolPoco(ink, water, mark)}</g>
${plainWord(ink, water, 158, -40, 1)}`;
  return { body, w: 560, h: 170 };
}

// ── Opção C · "Mw": três ondas do hieróglifo da água, empilhadas como régua de nível.
function symbolMw(ink, water, mark, bg) {
  return `<rect x="0" y="0" width="120" height="120" rx="30" fill="${bg}"/>
  <path d="${ripple(22, 98, 44, 9, 6)}" fill="none" stroke="${mark}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${ripple(22, 98, 66, 9, 6)}" fill="none" stroke="${water}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${ripple(22, 98, 88, 9, 6)}" fill="none" stroke="${water}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function optionC(ink, water, mark, tile) {
  const body = `<g transform="translate(16 25)">${symbolMw(ink, water, mark, tile)}</g>
${plainWord(ink, water, 158, -40, 1)}`;
  return { body, w: 560, h: 170 };
}

// ── Opção D · "Cartucho": a palavra dentro do cartucho, o anel que guardava nomes no Egito.
function optionD(ink, water, mark) {
  const p = wordmarkParts(6);
  const w = p.width * 0.52 + 120;
  const body = `<rect x="14" y="20" width="${w - 28}" height="130" rx="65" fill="none" stroke="${mark}" stroke-width="7"/>
  <rect x="26" y="32" width="${w - 52}" height="106" rx="53" fill="none" stroke="${mark}" stroke-width="2.5" opacity=".7"/>
  <rect x="${w - 14}" y="30" width="9" height="110" rx="3" fill="${mark}"/>
  ${plainWord(ink, water, 54, 24, 0.52)}`;
  return { body, w: w + 6, h: 170 };
}

// ── Opção E · "Coluna": arco ogival de Roda, coluna octogonal graduada e a linha d'água.
function symbolColuna(ink, water, mark) {
  const ticks = [];
  for (let k = 0; k < 7; k++) {
    const y = 40 + k * 10;
    ticks.push(`<rect x="${k % 3 === 0 ? 50 : 54}" y="${y}" width="${k % 3 === 0 ? 20 : 12}" height="3" fill="${ink}" opacity=".9"/>`);
  }
  return `<path d="M10,118 V58 C10,30 34,12 60,4 C86,12 110,30 110,58 V118" fill="none" stroke="${ink}" stroke-width="8" stroke-linejoin="round"/>
  <rect x="46" y="30" width="28" height="80" rx="3" fill="${mark}"/>
  <rect x="40" y="24" width="40" height="9" rx="2" fill="${mark}"/>
  ${ticks.join('')}
  <path d="M14,96 Q25,89 36,96 T58,96 T80,96 T106,96 V118 H14 Z" fill="${water}"/>`;
}
function optionE(ink, water, mark) {
  const body = `<g transform="translate(16 25)">${symbolColuna(ink, water, mark)}</g>
${plainWord(ink, water, 158, -40, 1)}`;
  return { body, w: 560, h: 170 };
}

// ── Opção F · "Lótus": lótus azul do Nilo, com a pétala central em forma de gota.
function symbolLotus(ink, water, mark) {
  return `<path d="M60,8 C78,30 82,58 60,86 C38,58 42,30 60,8 Z" fill="${water}"/>
  <path d="M60,86 C46,70 22,56 8,58 C12,80 34,94 60,92 Z" fill="${ink}"/>
  <path d="M60,86 C74,70 98,56 112,58 C108,80 86,94 60,92 Z" fill="${ink}"/>
  <path d="M30,46 C40,58 50,72 60,86 C44,80 30,66 30,46 Z" fill="${mark}"/>
  <path d="M90,46 C80,58 70,72 60,86 C76,80 90,66 90,46 Z" fill="${mark}"/>
  <path d="${ripple(14, 106, 112, 5, 8)}" fill="none" stroke="${water}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function optionF(ink, water, mark) {
  const body = `<g transform="translate(16 25)">${symbolLotus(ink, water, mark)}</g>
${plainWord(ink, water, 158, -40, 1)}`;
  return { body, w: 560, h: 170 };
}

const themes = {
  escuro: { ink: C.linho, water: C.faianca, mark: C.ouro, tile: C.lapis, bg: C.nilo },
  claro: { ink: C.nilo, water: '#1F8F86', mark: '#B07D1F', tile: C.nilo, bg: C.linho },
};

const options = {
  'a-covado': (t) => optionA(t.ink, t.water, t.mark, t === themes.escuro ? 'e' : 'c'),
  'b-poco': (t) => optionB(t.ink, t.water, t.mark),
  'c-mw': (t) => optionC(t.ink, t.water, t.mark, t.tile),
  'd-cartucho': (t) => optionD(t.ink, t.water, t.mark),
  'e-coluna': (t) => optionE(t.ink, t.water, t.mark),
  'f-lotus': (t) => optionF(t.ink, t.water, t.mark),
};

for (const [name, fn] of Object.entries(options)) {
  for (const [tn, t] of Object.entries(themes)) {
    const { body, w, h } = fn(t);
    writeFileSync(resolve(out, `nilo-${name}-${tn}.svg`), svg(w, h, body, { title: 'Nilo' }));
    writeFileSync(resolve(out, `nilo-${name}-${tn}-fundo.svg`), svg(w, h, body, { bg: t.bg, title: 'Nilo' }));
  }
}

// Símbolos sozinhos, em ladrilho, para favicon e ícone de app.
const tiles = {
  'poco': (t) => `<rect width="120" height="120" rx="28" fill="${C.nilo}"/><g transform="translate(14 14) scale(.7667)">${symbolPoco(C.linho, C.faianca, C.ouro)}</g>`,
  'mw': () => symbolMw(C.linho, C.faianca, C.ouro, C.lapis),
  'coluna': () => `<rect width="120" height="120" rx="28" fill="${C.nilo}"/><g transform="translate(16 12) scale(.733)">${symbolColuna(C.linho, C.faianca, C.ouro)}</g>`,
  'lotus': () => `<rect width="120" height="120" rx="28" fill="${C.nilo}"/><g transform="translate(14 10) scale(.7667)">${symbolLotus(C.linho, C.faianca, C.ouro)}</g>`,
  'gota': () => {
    const p = wordmarkParts(6);
    return `<rect width="120" height="120" rx="28" fill="${C.nilo}"/><path d="${drop(60, 60, 74)}" fill="${C.faianca}"/>`;
  },
};
for (const [name, fn] of Object.entries(tiles)) {
  writeFileSync(resolve(out, `icone-${name}.svg`), svg(120, 120, fn(themes.escuro), { title: 'Nilo' }));
}

console.log('logos geradas em', out);
