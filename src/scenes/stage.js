import * as THREE from 'three';
import { createRiver } from './river.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Um único fator temporal para progresso, fronteira e lente: resize não altera
// isoladamente o denominador de approach. Função pura de DOM/assets para QA Node.
export function advanceJourney(state, target, portaStart, viewRatio, dt, rate, immediate=false) {
  const k=immediate?1:1-Math.exp(-Math.max(0,Math.min(dt,.05))*rate);
  state.journey+=(target-state.journey)*k;
  state.portaStart+=(portaStart-state.portaStart)*k;
  state.viewRatio+=(viewRatio-state.viewRatio)*k;
  const settled=Math.abs(target-state.journey)<1e-7 &&
    Math.abs(portaStart-state.portaStart)<1e-7 && Math.abs(viewRatio-state.viewRatio)<1e-7;
  if(settled){state.journey=target;state.portaStart=portaStart;state.viewRatio=viewRatio;}
  return settled;
}

async function withTimeout(work, ms, label) {
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

/** Um canvas e uma cena raiz; layout e preparação ficam fora do scroll. */
export async function initStage({ onCovado } = {}) {
  const root = document.documentElement;
  const canvas = document.getElementById('stage');
  const veil = document.querySelector('.stage__veil');
  if (veil) veil.style.opacity = '0';
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

  let renderer = null, river = null, nilo = null;
  let riverLoading = !params.has('sem3d'), failed = false;
  let failure = null, shaderError = false, activeScene = 'rio';
  let raf = 0, layoutDirty = true, snap = true;
  let scroll = window.scrollY, lastNow = 0, elapsed = 0, pRio = 0, pPoco = 0;
  const navigation = { journey: 0, portaStart: .98, viewRatio: innerWidth / Math.max(1,innerHeight) };
  let layoutTransition = false;
  let frameMs = 0, averageMs = 1000 / 60, slowMs = 0, fastMs = 0;
  let adaptAfter = 0, warmFrames = 90;
  let posterShown = null, posterPoco = null, bodyScene = null, meterActive = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const frameState = { p: 0, pInterior: 0, inInterior: false, portaStart: .98, time: 0, pointer, reduced: true, viewRatio: navigation.viewRatio };
  const hiddenMeter = { covado: 0 };
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
      get loading() { return riverLoading; },
      get scenes() { return { rio: !!river, poco: !!nilo }; },
      get frameMs() { return frameMs; },
      get averageFrameMs() { return averageMs; },
      get fallback() { return posterShown; },
      get error() { return failure; },
      get cameraWorldPosition() { return river?.camera.getWorldPosition(new THREE.Vector3()).toArray() ?? null; },
      get cameraWorldQuaternion() { return river?.camera.getWorldQuaternion(new THREE.Quaternion()).toArray() ?? null; },
      get cameraFov() { return river?.camera.fov ?? null; },
      get doorAngles() { return nilo?.doorAngles ?? null; },
      get journey() { return navigation.journey; },
      get approach() { return clamp01((Math.min(navigation.journey,1)-navigation.portaStart)/(1-navigation.portaStart)); },
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

  function showPoster(show) {
    if (show !== posterShown) {
      posterShown = show;
      root.classList.toggle('sem-3d', show);
    }
  }

  function hideMeter() {
    if (meterActive) onCovado?.(hiddenMeter, 0);
    meterActive = false;
  }

  function fail(error) {
    if (failed) return;
    failed = true;
    failure = error?.message ?? String(error);
    riverLoading = false;
    cancelAnimationFrame(raf);
    raf = 0;
    showPoster(true);
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
    const rioSpan = Math.max(1, p.top - r.top);
    const portaStart = Math.min(.98,Math.max(.01,(doorTop-r.top)/rioSpan));
    const pocoSpan = Math.max(1,p.height-height);
    const resized = width !== layout.width || height !== layout.height;
    if(river && (resized || portaStart!==layout.portaStart || rioSpan!==layout.rioSpan ||
      pocoSpan!==layout.pocoSpan || r.top+scroll!==layout.rioTop || p.top+scroll!==layout.pocoTop)) layoutTransition=true;
    dprCap = maxDpr(width);
    Object.assign(layout, {
      width, height, rioTop: r.top + scroll, rioSpan,
      pocoTop: p.top + scroll, pocoSpan, pocoBottom: p.bottom + scroll, portaStart,
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
        resetSampling();
      }
    }
    // ResizeObserver e a barra móvel podem remedir durante a travessia.
    // Mantém o progresso atual; só o carregamento inicial precisa alinhar de imediato.
    if (!river) snap = true;
  }

  function invalidateLayout() { layoutDirty = true; requestFrame(); }

  async function prepare(scene) {
    if (!scene?.scene || !scene.camera || typeof scene.update !== 'function' || typeof scene.resize !== 'function') {
      throw new Error('Contrato de cena inválido');
    }
    if (failed) return null;
    scene.resize(layout.width, layout.height);
    navigation.portaStart = frameState.portaStart = layout.portaStart;
    navigation.viewRatio = frameState.viewRatio = layout.width / layout.height;
    scene.update(frameState);
    const uploadObjects = [];
    let light = false, caster = false;
    scene.scene.traverse((object) => {
      if (object.isLight && object.castShadow && object.shadow) {
        light = true;
        object.shadow.autoUpdate = false;
        object.shadow.needsUpdate = true;
      }
      if (object.isMesh && object.castShadow) caster = true;
      if ((object.isMesh || object.isPoints) && object.frustumCulled) uploadObjects.push(object);
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
      // Um único warmup envia também o interior, mesmo distante/oculto na chegada.
      for (const object of uploadObjects) object.frustumCulled = false;
      renderer.setRenderTarget(warmup);
      renderer.shadowMap.enabled = scene.hasShadows;
      renderer.shadowMap.needsUpdate = scene.hasShadows;
      renderer.render(scene.scene, scene.camera);
      scene.shadowsReady = true;
    } finally {
      for (const object of uploadObjects) object.frustumCulled = true;
      renderer.setRenderTarget(previousTarget);
      renderer.shadowMap.enabled = previousShadows;
      warmup.dispose();
    }
    if (shaderError) throw new Error('Falha ao preparar o primeiro quadro');
    // O viewport pode ter mudado durante os awaits.
    scene.resize(layout.width, layout.height);
    return scene;
  }

  function adaptDpr(now, interval) {
    // Loading, primeira utilização, resize e retomada não contam como GPU lenta.
    if (riverLoading || now < adaptAfter || interval <= 0 || interval > 250) return;
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
      if (failed || !river) {
        const inPoco = scroll >= layout.pocoTop;
        if (inPoco !== posterPoco) { posterPoco = inPoco; root.classList.toggle('no-poco', inPoco); }
        const name = inPoco ? 'poco' : 'rio';
        if (name !== bodyScene) { bodyScene = name; document.body.dataset.cena = name; }
        showPoster(true);
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
      // Um só valor suavizado atravessa a fronteira. Não muda a câmera pelo scroll
      // bruto enquanto a aproximação ainda está terminando, nem reseta a suavização.
      const targetJourney = targetRio + targetPoco;
      // Reduced motion mantém resposta direta ao scroll. Só resize interpola a
      // mudança de layout/lente, sem ligar animações incidentais de água/aves.
      const settled=advanceJourney(navigation,targetJourney,layout.portaStart,layout.width/layout.height,
        dt,mobile?9:5.5,snap||(reduced&&!layoutTransition));
      const journey=navigation.journey;
      pRio = Math.min(journey, 1);
      pPoco = Math.max(journey - 1, 0);
      const inPoco = journey >= 1;
      const name = inPoco ? 'poco' : 'rio';
      if (name !== activeScene) { activeScene = name; resetSampling(); }
      if (inPoco !== posterPoco) { posterPoco = inPoco; root.classList.toggle('no-poco', inPoco); }
      if (name !== bodyScene) { bodyScene = name; document.body.dataset.cena = name; }
      snap = false;
      const pointerK = 1 - Math.exp(-dt * 5);
      pointer.x += (pointer.tx - pointer.x) * pointerK;
      pointer.y += (pointer.ty - pointer.y) * pointerK;
      if (!reduced) elapsed += dt;
      const moving = !reduced && scroll < layout.pocoBottom - layout.height;
      // Mudar o drawing buffer antes de desenhar evita um frame vazio na troca de DPR.
      if (moving) adaptDpr(now, frameMs);
      frameState.p = pRio; frameState.pInterior = pPoco; frameState.inInterior = inPoco;
      frameState.portaStart = navigation.portaStart; frameState.viewRatio = navigation.viewRatio;
      frameState.time = elapsed; frameState.reduced = reduced;
      const result = river.update(frameState);
      renderer.shadowMap.enabled = river.hasShadows;
      renderer.shadowMap.needsUpdate = river.hasShadows && !river.shadowsReady;
      renderer.render(river.scene, river.camera);
      if (shaderError) throw new Error('Falha ao renderizar shaders');
      river.shadowsReady = true;
      showPoster(false);
      if (inPoco) {
        onCovado?.(result, pPoco);
        meterActive = true;
      } else {
        hideMeter();
      }
      // No fim da jornada, só redesenha em resposta a entrada ou resize.
      const settling = (!reduced || layoutTransition) && !settled;
      if(settled)layoutTransition=false;
      if (moving || settling) requestFrame();
      else lastNow = 0;
    } catch (error) { fail(error); }
  }

  addEventListener('scroll', () => {
    // Mesmo um gesto grande atravessa a fronteira pelo progresso suavizado único.
    scroll = window.scrollY;
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
    if (!document.hidden) jump();
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
    const scene = await withTimeout(createRiver({ quality }), 30000, 'Tempo esgotado ao carregar rio, nilômetro e guardas');
    if (failed) return null;
    river = await prepare(scene);
    nilo = river?.nilometer ?? null;
    riverLoading = false;
    if (failed) return null;
    snap = true;
    resetSampling();
    requestFrame();
    return { renderer };
  } catch (error) {
    fail(error);
    return null;
  }
}
