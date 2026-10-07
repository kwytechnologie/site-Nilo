import * as THREE from 'three';

// Texturas desenhadas em canvas, sem baixar imagens: pedra, mármore da coluna com os côvados,
// faixa de inscrição e a pintura da cúpula. Tudo determinístico (mesma semente, mesmo desenho).

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Grão fino por pixel, somado ao desenho.
function grain(ctx, w, h, amount, rand) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n; d[i + 1] += n * 0.95; d[i + 2] += n * 0.85;
  }
  ctx.putImageData(img, 0, 0);
}

function toTexture(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Parede de cantaria em fiadas de blocos, com marcas de cheia (manchas horizontais de lodo),
 * a parte de baixo molhada, uma faixa de arabesco no alto e, se pedido, um painel rebaixado
 * em azul-lápis com letras claras, como os painéis de Roda. O texto é em português: as
 * inscrições originais são versículos do Alcorão e não são reproduzidas.
 * metros: largura x altura que a textura cobre; pxm: pixels por metro.
 */
export function stoneWall({ width = 6.2, height = 15, pxm = 140, seed = 7, band = true, panel = null, waterFrom = 0.78, tone = [178, 158, 134] } = {}) {
  const w = Math.round(width * pxm), h = Math.round(height * pxm);
  const [c, ctx] = canvas(w, h);
  const rand = rng(seed);
  const base = tone;
  ctx.fillStyle = `rgb(${base})`;
  ctx.fillRect(0, 0, w, h);
  const course = 0.42 * pxm;
  for (let y = 0; y < h; y += course) {
    let x = -rand() * pxm;
    while (x < w) {
      const len = (0.75 + rand() * 0.75) * pxm;
      const v = (rand() - 0.5) * 30;
      const warm = rand() * 10;
      ctx.fillStyle = `rgb(${base[0] + v + warm},${base[1] + v},${base[2] + v - warm * 0.5})`;
      ctx.fillRect(x + 1.5, y + 1.5, len - 3, course - 3);
      ctx.fillStyle = 'rgba(70,55,40,0.16)';
      ctx.fillRect(x + 1.5, y + course - 5, len - 3, 3.5);
      x += len;
    }
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = 'rgba(90,75,60,0.5)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += course) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';

  if (band) arabesqueBand(ctx, 0, 0.18 * pxm, w, 0.5 * pxm);
  if (panel) kuficPanel(ctx, panel.text, w * 0.08, panel.y * pxm, w * 0.84, panel.h * pxm);

  for (let i = 0; i < 9; i++) {
    const y = h * (0.35 + rand() * 0.5);
    const g = ctx.createLinearGradient(0, y - 18, 0, y + 30);
    g.addColorStop(0, 'rgba(60,50,30,0)');
    g.addColorStop(0.4, `rgba(60,55,35,${0.1 + rand() * 0.14})`);
    g.addColorStop(1, 'rgba(60,50,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 18, w, 48);
  }
  const wy = h * waterFrom;
  const g = ctx.createLinearGradient(0, wy - h * 0.12, 0, h);
  g.addColorStop(0, 'rgba(30,50,40,0)');
  g.addColorStop(0.35, 'rgba(32,58,48,0.45)');
  g.addColorStop(1, 'rgba(14,30,28,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, wy - h * 0.12, w, h);
  grain(ctx, w, h, 24, rand);
  return toTexture(c);
}

// Faixa de arabesco entalhado: ramo ondulado com folhas, à maneira do estuque chanfrado da
// época de Ibn Tulun. Só ornamento vegetal, sem letras.
function arabesqueBand(ctx, x0, y0, w, bh) {
  ctx.save();
  ctx.fillStyle = 'rgb(150,128,104)';
  ctx.fillRect(x0, y0, w, bh);
  ctx.strokeStyle = 'rgba(60,45,30,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 - 2, y0 + 3, w + 4, bh - 6);
  const mid = y0 + bh / 2, amp = bh * 0.22, period = bh * 1.6;
  ctx.lineWidth = bh * 0.07;
  ctx.strokeStyle = 'rgba(70,52,34,0.85)';
  ctx.beginPath();
  for (let x = x0; x <= x0 + w; x += 3) {
    const y = mid + Math.sin(((x - x0) / period) * Math.PI * 2) * amp;
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,52,34,0.8)';
  for (let x = x0; x < x0 + w; x += period / 2) {
    const up = Math.round((x - x0) / (period / 2)) % 2 === 0;
    const y = mid + (up ? -amp : amp);
    ctx.beginPath();
    ctx.ellipse(x + period * 0.12, y + (up ? -bh * 0.08 : bh * 0.08), bh * 0.17, bh * 0.07, up ? -0.6 : 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - period * 0.1, mid, bh * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Painel rebaixado: fundo azul-lápis, moldura e letras cor de mármore em estilo cúfico (Reem Kufi).
function kuficPanel(ctx, text, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,30,20,0.45)';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = '#2b3f74';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(230,222,205,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.fillStyle = '#ece4d2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = h * 0.5;
  ctx.font = `600 ${size}px "Reem Kufi", "Rokkitt Variable", serif`;
  while (ctx.measureText(text).width > w * 0.88 && size > 8) {
    size -= 2;
    ctx.font = `600 ${size}px "Reem Kufi", "Rokkitt Variable", serif`;
  }
  ctx.fillText(text, x + w / 2, y + h / 2 + size * 0.06);
  ctx.restore();
}

/** Arenito simples para degraus e bordas. */
export function stoneSmall({ seed = 3, size = 512 } = {}) {
  const [c, ctx] = canvas(size, size);
  const rand = rng(seed);
  ctx.fillStyle = 'rgb(188,152,106)';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const r = 2 + rand() * 18;
    ctx.fillStyle = `rgba(${120 + rand() * 80},${95 + rand() * 60},${60 + rand() * 40},${0.08 + rand() * 0.12})`;
    ctx.beginPath(); ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2); ctx.fill();
  }
  grain(ctx, size, size, 30, rand);
  return toTexture(c);
}

/**
 * Coluna octogonal com as marcas de côvado, como em Roda: 16 côvados graduados no fuste e os
 * 10 de cima divididos em 24 partes, em 4 grupos de 6. A textura dá a volta na coluna (u) e
 * cobre o fuste (v). Números em algarismos arábicos orientais e ocidentais (em Roda eles são
 * escritos por extenso em cúfico).
 */
export function columnTexture({ cubits = 16, pxPerCubit = 128, seed = 11 } = {}) {
  const w = 1024, h = cubits * pxPerCubit;
  const [c, ctx] = canvas(w, h);
  const rand = rng(seed);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#e9e3d6'); g.addColorStop(0.5, '#f2eee4'); g.addColorStop(1, '#e5dece');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,112,100,0.16)';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    let x = rand() * w, y = rand() * h;
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rand() - 0.4) * 90; y += (rand() - 0.5) * 140; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // juntas dos blocos de mármore empilhados
  ctx.fillStyle = 'rgba(110,100,85,0.35)';
  for (let k = 1; k < 6; k++) ctx.fillRect(0, h - k * (h / 6) - 1, w, 2);
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const toAr = (n) => String(n).split('').map((d) => arabic[+d]).join('');
  const face = w / 8;
  for (let k = 0; k <= cubits; k++) {
    const y = h - k * pxPerCubit;
    ctx.fillStyle = k === 16 ? 'rgba(150,90,20,0.95)' : 'rgba(70,56,38,0.85)';
    ctx.fillRect(0, y - 3, w, 6);
    if (k < cubits && k >= cubits - 10) {
      // 24 partes por côvado nos 10 de cima, em grupos de 6
      for (let s = 1; s < 24; s++) {
        const ys = y - (s * pxPerCubit) / 24;
        const big = s % 6 === 0;
        ctx.fillStyle = big ? 'rgba(70,56,38,0.7)' : 'rgba(70,56,38,0.42)';
        for (let f = 0; f < 8; f += 2) ctx.fillRect(f * face + 10, ys - (big ? 1.5 : 1), big ? 46 : 22, big ? 3 : 2);
      }
    }
    if (k > 0) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      for (let f = 0; f < 8; f++) {
        const cx = (f + 0.5) * face;
        ctx.fillStyle = k === 16 ? 'rgba(160,96,20,0.95)' : 'rgba(80,62,40,0.82)';
        if (f % 2 === 1) {
          ctx.font = `600 ${pxPerCubit * 0.4}px "Segoe UI", "Noto Naskh Arabic", serif`;
          ctx.fillText(toAr(k), cx, y - pxPerCubit * 0.5);
        } else if (f === 4) {
          ctx.font = `700 ${pxPerCubit * 0.28}px "Space Mono", monospace`;
          ctx.fillText(String(k), cx, y - pxPerCubit * 0.5);
        }
      }
    }
  }
  grain(ctx, w, h, 10, rand);
  const t = toTexture(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Pintura da cúpula de Roda: arabescos florais em dourado, azul-acinzentado e azul-noite, com
 * medalhão central azul e ouro (cores medidas em fotos, ver docs/pesquisa). No cone, v = 1 é o
 * ápice: as faixas de cima viram o medalhão.
 */
export function domeTexture({ seed = 21 } = {}) {
  const s = 1024;
  const [c, ctx] = canvas(s, s);
  const rand = rng(seed);
  const GOLD = '#b8963a', BLUEGREY = '#535c6c', NIGHT = '#1a1a2a', GREENGREY = '#65706f', CREAM = '#d8cdb0';
  const bands = [
    { h: 0.16, bg: NIGHT, kind: 'rays' },
    { h: 0.06, bg: GOLD, kind: 'plain' },
    { h: 0.24, bg: BLUEGREY, kind: 'vine' },
    { h: 0.05, bg: NIGHT, kind: 'dots' },
    { h: 0.26, bg: NIGHT, kind: 'vine' },
    { h: 0.05, bg: GOLD, kind: 'plain' },
    { h: 0.18, bg: GREENGREY, kind: 'arches' },
  ];
  let y = 0;
  for (const b of bands) {
    const bh = b.h * s;
    ctx.fillStyle = b.bg;
    ctx.fillRect(0, y, s, bh);
    if (b.kind === 'rays') {
      for (let k = 0; k < 24; k++) {
        ctx.fillStyle = k % 2 ? GOLD : '#2b3f74';
        const x = (k / 24) * s;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s / 48, y + bh); ctx.lineTo(x + s / 24, y); ctx.fill();
      }
    } else if (b.kind === 'vine') {
      const n = 12, per = s / n;
      ctx.strokeStyle = GOLD; ctx.lineWidth = bh * 0.035;
      ctx.beginPath();
      for (let x = 0; x <= s; x += 4) {
        const yy = y + bh / 2 + Math.sin((x / per) * Math.PI * 2) * bh * 0.22;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      for (let k = 0; k < n * 2; k++) {
        const x = (k + 0.25) * (per / 2);
        const up = k % 2 === 0;
        const yy = y + bh / 2 + (up ? -1 : 1) * bh * 0.22;
        ctx.fillStyle = k % 4 === 0 ? CREAM : GOLD;
        for (const [dx, rot] of [[-0.06, -0.5], [0, 0], [0.06, 0.5]]) {
          ctx.beginPath();
          ctx.ellipse(x + dx * per, yy + (up ? -1 : 1) * bh * 0.12, bh * 0.05, bh * 0.14, rot * (up ? 1 : -1), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath(); ctx.arc(x, yy, bh * 0.035, 0, Math.PI * 2); ctx.fill();
      }
    } else if (b.kind === 'dots') {
      ctx.fillStyle = GOLD;
      for (let k = 0; k < 64; k++) { ctx.beginPath(); ctx.arc((k + 0.5) * (s / 64), y + bh / 2, bh * 0.18, 0, Math.PI * 2); ctx.fill(); }
    } else if (b.kind === 'arches') {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const x = (k / n) * s, aw = s / n;
        ctx.fillStyle = NIGHT;
        ctx.beginPath();
        ctx.moveTo(x + aw * 0.15, y + bh);
        ctx.lineTo(x + aw * 0.15, y + bh * 0.45);
        ctx.quadraticCurveTo(x + aw * 0.17, y + bh * 0.12, x + aw * 0.5, y + bh * 0.05);
        ctx.quadraticCurveTo(x + aw * 0.83, y + bh * 0.12, x + aw * 0.85, y + bh * 0.45);
        ctx.lineTo(x + aw * 0.85, y + bh);
        ctx.fill();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(184,150,58,0.9)';
    ctx.fillRect(0, y + bh - 2, s, 3);
    y += bh;
  }
  grain(ctx, s, s, 14, rand);
  return toTexture(c);
}

/** Treliça de madeira (muxarabi) com luz atrás, para as janelas do tambor. */
export function latticeTexture() {
  const s = 256;
  const [c, ctx] = canvas(s, s);
  ctx.fillStyle = '#ffe2b4';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#3a2716';
  const n = 8, cell = s / n;
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * cell - 4, 0, 8, s);
    ctx.fillRect(0, i * cell - 4, s, 8);
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.beginPath(); ctx.arc((i + 0.5) * cell, (j + 0.5) * cell, cell * 0.16, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

/** Gradiente vertical simples em textura (usado em velas e no céu de fallback). */
export function gradientTexture(stops, h = 256) {
  const [c, ctx] = canvas(2, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, h);
  return toTexture(c);
}
