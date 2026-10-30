import Lenis from 'lenis';
import { initGlow } from './glow.js';
import { initMenu } from './menu.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabic = (n) => String(n).split('').map((d) => AR[+d] ?? d).join('');

export function initUI() {
  // Touch usa a rolagem nativa. Desktop só agenda RAF enquanto há interpolação.
  const touch = matchMedia('(any-pointer: coarse)');
  let lenis = null, lenisFrame = 0, lenisClock = 0, lastLenisNow = 0;
  function requestLenisFrame() {
    if (lenis && !lenisFrame && !document.hidden) lenisFrame = requestAnimationFrame(tickLenis);
  }
  function tickLenis(now) {
    lenisFrame = 0;
    if (!lenis || document.hidden) return;
    // O relógio não inclui o período ocioso entre dois gestos.
    lenisClock += lastLenisNow ? Math.min(now - lastLenisNow, 50) : 1000 / 60;
    lastLenisNow = now;
    lenis.raf(lenisClock);
    if (lenis.isScrolling === 'smooth') requestLenisFrame();
    else lastLenisNow = 0;
  }
  function syncScrolling() {
    const enabled = !reduced.matches && !touch.matches && !navigator.maxTouchPoints && !document.hidden;
    if (enabled && !lenis) {
      lenisClock = lastLenisNow = 0;
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false, autoRaf: false });
      lenis.on('virtual-scroll', ({ event }) => { if (event.type === 'wheel') requestLenisFrame(); });
    } else if (!enabled && lenis) {
      cancelAnimationFrame(lenisFrame);
      lenisFrame = lastLenisNow = 0;
      lenis.destroy();
      lenis = null;
    }
  }
  reduced.addEventListener('change', syncScrolling);
  touch.addEventListener('change', syncScrolling);
  document.addEventListener('visibilitychange', syncScrolling);
  syncScrolling();

  const closeMenu = initMenu();

  const nav = document.querySelector('[data-nav]');

  // O cartão da seção para logo abaixo do menu: centralizado quando cabe na tela, senão no topo.
  // offsetTop ignora o deslocamento da animação de entrada, que ainda pode estar aplicado.
  function topoDoCartao(el) {
    const card = el.querySelector('.placa, .final') || el;
    let y = 0;
    for (let n = card; n; n = n.offsetParent) y += n.offsetTop;
    const navH = nav.offsetHeight;
    const folga = Math.max(24, (innerHeight - navH - card.offsetHeight) / 2);
    return Math.max(0, y - navH - folga);
  }
  function irPara(el, suave) {
    const top = topoDoCartao(el);
    if (lenis && suave) {
      lenis.scrollTo(top, { duration: 1.6 });
      requestLenisFrame();
    } else scrollTo({ top, behavior: 'instant' });
  }

  // Links internos passam pela rolagem suave.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      let el;
      try { el = id.length > 1 && document.getElementById(decodeURIComponent(id.slice(1))); }
      catch { return; }
      if (!el) return;
      e.preventDefault();
      closeMenu();
      irPara(el, true);
      history.replaceState(null, '', id);
    });
  });

  // Quem chega de outra página com #secao (o menu das páginas legais) cai no mesmo lugar. O #
  // sai do endereço até o load, senão o navegador pula de novo para o topo da seção.
  const hash = location.hash;
  let alvoInicial = null;
  try { alvoInicial = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1))); } catch {}
  if (alvoInicial) {
    history.replaceState(null, '', location.pathname + location.search);
    // já posiciona agora e acerta de novo no load, quando fontes e imagens mudaram a altura
    irPara(alvoInicial, false);
    const ir = () => {
      irPara(alvoInicial, false);
      history.replaceState(null, '', hash);
    };
    document.readyState === 'complete' ? ir() : addEventListener('load', ir, { once: true });
  }

  // Navegação fica sólida depois do topo.
  let solid = null;
  const onScroll = () => {
    const next = scrollY > 40;
    if (next !== solid) { solid = next; nav.classList.toggle('is-solida', next); }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  initGlow('.placa, .btn, .nav__links a, .rodape');

  // Menu marca a seção em que a pessoa está.
  const navLinks = [...document.querySelectorAll('.nav__links a, .menu-movel a[href^="#"]')];
  const secIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      for (const a of navLinks) {
        if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.parada[id], .inscricao[id]').forEach((el) => secIO.observe(el));

  // Entradas: cada parada aparece quando chega à tela.
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero.classList.add('is-dentro'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add('is-dentro');
      io.unobserve(e.target);
    }
  }, { threshold: 0.18 });
  document.querySelectorAll('.parada, .inscricao').forEach((el) => io.observe(el));

  // Conversa do WhatsApp: as mensagens chegam uma a uma.
  const chat = document.querySelector('[data-chat]');
  const msgs = [...chat.querySelectorAll('.msg')];
  const chatIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    chatIO.disconnect();
    msgs.forEach((m, i) => setTimeout(() => m.classList.add('is-visivel'), reduced.matches ? 0 : 350 + i * 900));
  }, { threshold: 0.45 });
  chatIO.observe(chat);

  // Medidor de côvados.
  const medidor = document.querySelector('[data-medidor]');
  const ar = medidor.querySelector('[data-medidor-ar]');
  const num = medidor.querySelector('[data-medidor-num]');
  const agua = medidor.querySelector('[data-medidor-agua]');
  let last = -1, visible = false, ideal = false, scale = null;
  function onCovado(reading, p) {
    const valid = Number.isFinite(reading?.covado);
    const show = valid && p > 0.06 && p < 0.97;
    if (show !== visible) { visible = show; medidor.classList.toggle('is-visivel', show); }
    if (!show) return;
    const covado = Math.min(16, Math.max(0, reading.covado));
    const n = Math.round(covado);
    if (n !== last) {
      last = n;
      ar.textContent = toArabic(n);
      num.textContent = `${n}`;
    }
    const nextScale = (covado / 16).toFixed(3);
    if (nextScale !== scale) { scale = nextScale; agua.style.transform = `scaleY(${scale})`; }
    const nextIdeal = covado >= 15.5;
    if (nextIdeal !== ideal) { ideal = nextIdeal; medidor.classList.toggle('is-ideal', ideal); }
  }

  return { get lenis() { return lenis; }, onCovado };
}
