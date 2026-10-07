import * as THREE from 'three';
import { createRiver } from './river.js';
import { createNilometer } from './nilometer.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

/**
 * Um único canvas fixo atrás do conteúdo. A rolagem decide a cena ativa:
 * rio (seção #rio) e nilômetro (seção #nilometro). Entre as duas, a porta escurece a tela.
 */
export async function initStage({ onCovado } = {}) {
  const root = document.documentElement;
  const canvas = document.getElementById('stage');
  const veil = document.querySelector('.stage__veil');
  const rio = document.getElementById('rio');
  const poco = document.getElementById('nilometro');
  const porta = document.querySelector('[data-porta]');
  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');

  const params = new URLSearchParams(location.search);
  if (!webglOK() || params.has('sem3d')) {
    root.classList.add('sem-3d');
    const io = new IntersectionObserver(([e]) => root.classList.toggle('no-poco', e.isIntersecting), { rootMargin: '0px 0px -50% 0px' });
    io.observe(poco);
    return null;
  }

  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobile = coarse || innerWidth < 760;
  const quality = mobile
    ? { mobile: true, dpr: Math.min(devicePixelRatio, 1.5), papyrus: 650, palms: 120, houses: 70, shadows: false }
    : { mobile: false, dpr: Math.min(devicePixelRatio, 1.75), papyrus: 1500, palms: 260, houses: 150, shadows: true };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'default' });
  renderer.setPixelRatio(quality.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // As texturas da coluna e das inscrições usam as fontes do site: esperar carregarem.
  await Promise.all([
    document.fonts.load('600 40px "Reem Kufi"'),
    document.fonts.load('700 40px "Space Mono"'),
    document.fonts.load('800 40px "Rokkitt Variable"'),
  ]).catch(() => {});
  await document.fonts.ready;

  const river = createRiver({ quality });
  let nilo = null; // criado sob demanda, quando a descida se aproxima
  const ensureNilo = () => {
    if (!nilo) {
      nilo = createNilometer({ quality });
      nilo.resize(innerWidth, innerHeight);
      renderer.compile(nilo.scene, nilo.camera);
    }
    return nilo;
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!coarse) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    river.resize(innerWidth, innerHeight);
    nilo?.resize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);
  resize();

  // Progresso suavizado: a câmera persegue a rolagem, sem tranco.
  let pRio = 0, pPoco = 0, visible = true, first = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  let lastNow = performance.now(), elapsed = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const reduced = reducedMQ.matches;
    const vh = innerHeight;
    const rRect = rio.getBoundingClientRect();
    const pRect = poco.getBoundingClientRect();
    const portaStart = (porta.offsetTop) / Math.max(1, rio.offsetHeight - vh);
    const targetRio = clamp01(-rRect.top / Math.max(1, rRect.height - vh));
    const targetPoco = clamp01(-pRect.top / Math.max(1, pRect.height - vh));
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 0.25);
    lastNow = now;
    elapsed += dt;
    // perseguição independente da taxa de quadros
    const k = reduced || first ? 1 : 1 - Math.exp(-dt * 5.5);
    pRio += (targetRio - pRio) * k;
    pPoco += (targetPoco - pPoco) * k;
    first = false;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const time = elapsed;

    // Pré-carrega o nilômetro quando faltar uma tela e meia para a porta.
    if (!nilo && rRect.bottom < vh * 2.5) ensureNilo();

    const inPoco = pRect.top <= 0;
    let veilOpacity;
    if (!inPoco) {
      // a porta escurece no último trecho do rio
      const approach = clamp01((pRio - portaStart) / (1 - portaStart));
      veilOpacity = smooth(0.55, 0.98, approach);
      river.update({ p: pRio, portaStart: Math.min(portaStart, 0.98), time, pointer, reduced });
      renderer.render(river.scene, river.camera);
      document.body.dataset.cena = 'rio';
    } else {
      ensureNilo();
      veilOpacity = 1 - smooth(0.0, 0.05, pPoco);
      const r = nilo.update({ p: pPoco, time, pointer, reduced });
      renderer.render(nilo.scene, nilo.camera);
      onCovado?.(r, pPoco);
      document.body.dataset.cena = 'poco';
    }
    veil.style.opacity = veilOpacity.toFixed(3);
  }
  frame();
  return { renderer };
}
