import Lenis from 'lenis';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabic = (n) => String(n).split('').map((d) => AR[+d] ?? d).join('');

export function initUI() {
  // Rolagem suave (desligada para quem pede menos movimento).
  let lenis = null;
  if (!reduced.matches) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // Links internos passam pela rolagem suave.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.6 });
      else el.scrollIntoView();
      history.replaceState(null, '', id);
    });
  });

  // Navegação fica sólida depois do topo.
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => nav.classList.toggle('is-solida', scrollY > 40);
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

  // Entradas: cada parada aparece quando chega à tela.
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero.classList.add('is-dentro'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-dentro');
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
  let last = -1;
  function onCovado({ covado }, p) {
    const show = p > 0.06 && p < 0.97;
    medidor.classList.toggle('is-visivel', show);
    const n = Math.round(covado);
    if (n !== last) {
      last = n;
      ar.textContent = toArabic(n);
      num.textContent = `${n}`;
    }
    agua.style.transform = `scaleY(${(covado / 16).toFixed(3)})`;
    medidor.classList.toggle('is-ideal', covado >= 15.5);
  }

  return { lenis, onCovado };
}
