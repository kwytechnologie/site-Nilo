import Lenis from 'lenis';
import { initGlow } from './glow.js';

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
      if (lenis) {
        lenis.scrollTo(el, { offset: -20, duration: 1.6 });
        requestLenisFrame();
      } else el.scrollIntoView({ behavior: 'instant' });
      history.replaceState(null, '', id);
    });
  });

  // Navegação fica sólida depois do topo.
  const nav = document.querySelector('[data-nav]');
  let solid = null;
  const onScroll = () => {
    const next = scrollY > 40;
    if (next !== solid) { solid = next; nav.classList.toggle('is-solida', next); }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu do celular.
  const btn = document.querySelector('[data-menu]');
  const menu = document.getElementById('menu-movel');
  function closeMenu() {
    if (!menu.hidden) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  }
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });

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
