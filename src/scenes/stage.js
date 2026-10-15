import * as THREE from 'three';
import { createRiver } from './river.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

async function withTimeout(work, ms, label) {
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

/** Um canvas; layout medido somente quando muda, cenas preparadas fora do scroll. */
export async function initStage({ onCovado } = {}) {
  const root = document.documentElement;
  const canvas = document.getElementById('stage');
  const veil = document.querySelector('.stage__veil');
  const rio = document.getElementById('rio');
  const poco = document.getElementById('nilometro');
  const porta = document.querySelector('[data-porta]');
  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = matchMedia('(any-pointer: coarse)');
  const params = new URLSearchParams(location.search);
  const mobile = coarseMQ.matches || navigator.maxTouchPoints > 0 || innerWidth < 760;
  const quality = mobile
    ? { mobile: true, dpr: 1, papyrus: 420, palms: 80, houses: 48, shadows: false }
    : { mobile: false, dpr: 1, papyrus: 1500, palms: 260, houses: 150, shadows: true };
  const maxDpr = (width) => Math.max(0.75, Math.min(devicePixelRatio || 1, mobile || width < 760 ? 1.25 : 1.5));
  let dprCap = maxDpr(innerWidth);
  quality.dpr = dprCap;

  let renderer = null, river = null, nilo = null, niloPromise = null;
  let riverLoading = !params.has('sem3d'), niloLoading = false, failed = false;
  let failure = null, shaderError = false, activeScene = 'rio';
  let raf = 0, idle = null, layoutDirty = true, snap = true;
  let scroll = window.scrollY, lastNow = 0, elapsed = 0, pRio = 0, pPoco = 0;
  let frameMs = 0, averageMs = 1000 / 60, slowMs = 0, fastMs = 0;
  let adaptAfter = 0, warmFrames = 90;
  let posterShown = null, posterPoco = null, bodyScene = null, veilValue = null, meterActive = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const layout = { width: 0, height: 0, rioTop: 0, rioSpan: 1, pocoTop: Infinity, pocoSpan: 1, pocoBottom: Infinity, portaStart: 0.98 };

  // Getters: nenhuma coleta extra por frame, e nenhuma API global sem opt-in.
  if (params.has('debug3d')) {
    window.__niloDebug = {
      get drawCalls() { return renderer?.info.render.calls ?? 0; },
      get triangles() { return renderer?.info.render.triangles ?? 0; },
      get textures() { return renderer?.info.memory.textures ?? 0; },
      get geometries() { return renderer?.info.memory.geometries ?? 0; },
      get dpr() { return renderer?.getPixelRatio() ?? 0; },
      get activeScene() { return activeScene; },
      get ready() { return !failed && !!(activeScene === 'rio' ? river : nilo); },
      get loading() { return riverLoading || niloLoading; },
      get scenes() { return { rio: !!river, poco: !!nilo }; },
      get frameMs() { return frameMs; },
      get averageFrameMs() { return averageMs; },
      get fallback() { return posterShown; },
      get error() { return failure; },
    };
  }

  function requestFrame() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function resetSampling() {
    adaptAfter = performance.now() + 2500;
    warmFrames = 90;
    averageMs = 1000 / 60;
    slowMs = fastMs = 0;
  }

  function setVeil(opacity) {
    const value = opacity.toFixed(3);
    if (value !== veilValue) {
      veilValue = value;
      if (veil) veil.style.opacity = value;
    }
  }

  function showPoster(show) {
    if (show !== posterShown) {
      posterShown = show;
      root.classList.toggle('sem-3d', show);
    }
  }

  function hideMeter() {
    if (meterActive) onCovado?.({ covado: 0 }, 0);
    meterActive = false;
  }

  function cancelPrefetch() {
    if (idle === null) return;
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
    else clearTimeout(idle);
    idle = null;
  }

  function fail(error) {
    if (failed) return;
    failed = true;
    failure = error?.message ?? String(error);
    riverLoading = niloLoading = false;
    cancelPrefetch();
    cancelAnimationFrame(raf);
    raf = 0;
    showPoster(true);
    setVeil(0);
    hideMeter();
    renderer?.dispose();
    console.warn('[nilo] 3D desativado:', error);
    requestFrame();
  }

  function measureLayout() {
    layoutDirty = false;
    // Todas as leituras precedem setSize/resize e as alterações de classes.
    scroll = window.scrollY;
    const width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
    const r = rio.getBoundingClientRect(), p = poco.getBoundingClientRect();
    const doorTop = porta?.getBoundingClientRect().top ?? r.bottom - height;
    const resized = width !== layout.width || height !== layout.height;
    dprCap = maxDpr(width);
    Object.assign(layout, {
      width, height, rioTop: r.top + scroll, rioSpan: Math.max(1, r.height - height),
      pocoTop: p.top + scroll, pocoSpan: Math.max(1, p.height - height), pocoBottom: p.bottom + scroll,
      portaStart: Math.min(0.98, Math.max(0.01, (doorTop - r.top) / Math.max(1, r.height - height))),
    });
    if (renderer && !failed) {
      if (quality.dpr > dprCap) {
        quality.dpr = dprCap;
        renderer.setPixelRatio(quality.dpr);
        resetSampling();
      }
      if (resized) {
        renderer.setSize(width, height, false);
        river?.resize(width, height);
        nilo?.resize(width, height);
        resetSampling();
      }
    }
    snap = true;
  }

  function invalidateLayout() { layoutDirty = true; requestFrame(); }

  async function prepare(scene) {
    if (!scene?.scene || !scene.camera || typeof scene.update !== 'function' || typeof scene.resize !== 'function') {
      throw new Error('Contrato de cena inválido');
    }
    if (failed) return null;
    scene.resize(layout.width, layout.height);
    let light = false, caster = false;
    scene.scene.traverse((object) => {
      if (object.isLight && object.castShadow && object.shadow) {
        light = true;
        object.shadow.autoUpdate = false;
        object.shadow.needsUpdate = true;
      }
      if (object.isMesh && object.castShadow) caster = true;
    });
    scene.hasShadows = quality.shadows && light && caster;
    scene.shadowsReady = false;
    // Sem compile síncrono de fallback: versões antigas compilam no primeiro render.
    if (typeof renderer.compileAsync === 'function') {
      const previousShadows = renderer.shadowMap.enabled;
      let compilation;
      try {
        renderer.shadowMap.enabled = scene.hasShadows;
        compilation = renderer.compileAsync(scene.scene, scene.camera);
      } finally { renderer.shadowMap.enabled = previousShadows; }
      await withTimeout(compilation, 15000, 'Tempo esgotado ao preparar shaders');
    }
    if (shaderError) throw new Error('Falha ao compilar shaders');
    if (failed) return null;
    // Shaders prontos ainda não significam texturas/geometria enviadas à GPU.
    // Um render pequeno fora da tela prepara também a sombra antes da descida.
    const warmup = new THREE.WebGLRenderTarget(16, 16);
    const previousTarget = renderer.getRenderTarget();
    const previousShadows = renderer.shadowMap.enabled;
    try {
      scene.update({ p: 0, portaStart: layout.portaStart, time: 0, pointer: { x: 0, y: 0 }, reduced: true });
      renderer.setRenderTarget(warmup);
      renderer.shadowMap.enabled = scene.hasShadows;
      renderer.shadowMap.needsUpdate = scene.hasShadows;
      renderer.render(scene.scene, scene.camera);
      scene.shadowsReady = true;
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.shadowMap.enabled = previousShadows;
      warmup.dispose();
    }
    if (shaderError) throw new Error('Falha ao preparar o primeiro quadro');
    // O viewport pode ter mudado durante os awaits.
    scene.resize(layout.width, layout.height);
    return scene;
  }

  function ensureNilo() {
    if (niloPromise || failed || !river) return niloPromise;
    cancelPrefetch();
    niloLoading = true;
    resetSampling();
    niloPromise = (async () => {
      const scene = await withTimeout((async () => {
        const { createNilometer } = await import('./nilometer.js');
        if (failed) return null;
        return await createNilometer({ quality });
      })(), 30000, 'Tempo esgotado ao carregar o nilômetro');
      if (failed) return;
      nilo = await prepare(scene);
      snap = true;
    })().catch(fail).finally(() => {
      niloLoading = false;
      resetSampling();
      requestFrame();
    });
    return niloPromise;
  }

  function prefetchNilo() {
    if (idle !== null || niloPromise || failed || !river || document.hidden) return;
    const run = () => { idle = null; if (!document.hidden) ensureNilo(); };
    idle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(run, { timeout: 1800 })
      : setTimeout(run, 250);
  }

  function adaptDpr(now, interval) {
    // Loading, primeira utilização, resize e retomada não contam como GPU lenta.
    if (riverLoading || niloLoading || now < adaptAfter || interval <= 0 || interval > 250) return;
    if (warmFrames > 0) { warmFrames--; return; }
    averageMs += (interval - averageMs) * 0.05;
    slowMs = averageMs > 24 ? slowMs + interval : 0;
    fastMs = averageMs < 18 ? fastMs + interval : 0;
    let next = quality.dpr;
    if (slowMs > 1800) next = Math.max(0.75, next - 0.125);
    else if (fastMs > 8000) next = Math.min(dprCap, next + 0.125);
    if (next !== quality.dpr) {
      quality.dpr = next;
      renderer.setPixelRatio(next);
      resetSampling();
    }
  }

  function frame(now) {
    raf = 0;
    if (document.hidden) { lastNow = 0; return; }
    try {
      if (layoutDirty) measureLayout();
      const inPoco = scroll >= layout.pocoTop;
      const name = inPoco ? 'poco' : 'rio';
      if (name !== activeScene) { activeScene = name; snap = true; resetSampling(); }
      if (inPoco !== posterPoco) { posterPoco = inPoco; root.classList.toggle('no-poco', inPoco); }
      if (name !== bodyScene) { bodyScene = name; document.body.dataset.cena = name; }
      if (!failed && river && layout.pocoTop - scroll < layout.height * 1.5) ensureNilo();
      const scene = inPoco ? nilo : river;
      if (failed || !scene) {
        showPoster(true);
        setVeil(0);
        hideMeter();
        lastNow = 0;
        return;
      }

      frameMs = lastNow ? now - lastNow : 0;
      const dt = Math.min(frameMs / 1000, 0.05);
      lastNow = now;
      const reduced = reducedMQ.matches;
      const targetRio = clamp01((scroll - layout.rioTop) / layout.rioSpan);
      const targetPoco = clamp01((scroll - layout.pocoTop) / layout.pocoSpan);
      const k = reduced || snap ? 1 : 1 - Math.exp(-dt * (mobile ? 9 : 5.5));
      pRio += (targetRio - pRio) * k;
      pPoco += (targetPoco - pPoco) * k;
      snap = false;
      const pointerK = 1 - Math.exp(-dt * 5);
      pointer.x += (pointer.tx - pointer.x) * pointerK;
      pointer.y += (pointer.ty - pointer.y) * pointerK;
      if (!reduced) elapsed += dt;
      const moving = !reduced && scroll < layout.pocoBottom - layout.height;
      // Mudar o drawing buffer antes de desenhar evita um frame vazio na troca de DPR.
      if (moving) adaptDpr(now, frameMs);
      const result = scene.update({ p: inPoco ? pPoco : pRio, portaStart: layout.portaStart, time: elapsed, pointer, reduced });
      renderer.shadowMap.enabled = scene.hasShadows;
      renderer.shadowMap.needsUpdate = scene.hasShadows && !scene.shadowsReady;
      renderer.render(scene.scene, scene.camera);
      if (shaderError) throw new Error('Falha ao renderizar shaders');
      scene.shadowsReady = true;
      showPoster(false);
      if (inPoco) {
        setVeil(1 - smooth(0, 0.05, pPoco));
        onCovado?.(result, pPoco);
        meterActive = true;
      } else {
        setVeil(smooth(0.55, 0.98, clamp01((pRio - layout.portaStart) / (1 - layout.portaStart))));
        hideMeter();
      }
      // No fim da jornada, só redesenha em resposta a entrada ou resize.
      const settling = !reduced && (Math.abs(targetRio - pRio) > 0.0001 || Math.abs(targetPoco - pPoco) > 0.0001);
      if (moving || settling) requestFrame();
      else lastNow = 0;
    } catch (error) { fail(error); }
  }

  addEventListener('scroll', () => {
    const next = window.scrollY;
    if (Math.abs(next - scroll) > layout.height) snap = true;
    scroll = next;
    requestFrame();
  }, { passive: true });
  addEventListener('resize', invalidateLayout, { passive: true });
  const jump = () => { scroll = window.scrollY; snap = true; invalidateLayout(); };
  addEventListener('hashchange', jump);
  addEventListener('popstate', jump);
  addEventListener('pageshow', jump);
  addEventListener('load', invalidateLayout, { once: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(invalidateLayout);
    for (const element of [document.body, rio, poco, porta]) if (element) observer.observe(element);
  }
  document.fonts?.ready.then(invalidateLayout);
  reducedMQ.addEventListener('change', () => {
    snap = true;
    lastNow = 0;
    pointer.x = pointer.y = pointer.tx = pointer.ty = 0;
    resetSampling();
    requestFrame();
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    lastNow = 0;
    resetSampling();
    if (document.hidden) cancelPrefetch();
    else { jump(); prefetchNilo(); }
  });
  if (!mobile) {
    addEventListener('pointermove', (event) => {
      if (reducedMQ.matches || event.pointerType === 'touch' || failed) return;
      pointer.tx = (event.clientX / Math.max(1, layout.width)) * 2 - 1;
      pointer.ty = (event.clientY / Math.max(1, layout.height)) * 2 - 1;
      requestFrame();
    }, { passive: true });
  }

  // O poster também cobre criação, download e compilação, sem esconder o conteúdo.
  showPoster(true);
  requestFrame();
  if (params.has('sem3d')) {
    failed = true;
    failure = 'sem3d';
    return null;
  }
  try {
    if (!canvas || !rio || !poco) throw new Error('Elementos do palco indisponíveis');
    // Usar o próprio renderer como teste evita alocar um segundo contexto WebGL.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
    renderer.setPixelRatio(quality.dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      shaderError = true;
      console.error('[nilo] shader:', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment));
    };
    // Perda de contexto fica em poster até recarregar, sem um loop de tentativas.
    canvas.addEventListener('webglcontextlost', () => fail(new Error('Contexto WebGL perdido')), { once: true });
    measureLayout();
    // Os materiais vêm do Blender: não dependem mais de fontes/Canvas 2D.
    if (failed) return null;
    const scene = await withTimeout(createRiver({ quality }), 30000, 'Tempo esgotado ao carregar o rio');
    if (failed) return null;
    river = await prepare(scene);
    riverLoading = false;
    if (failed) return null;
    snap = true;
    resetSampling();
    requestFrame();
    prefetchNilo();
    return { renderer };
  } catch (error) {
    fail(error);
    return null;
  }
}
