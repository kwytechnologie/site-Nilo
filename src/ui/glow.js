import '../styles/glow.css';
// Brilho que segue o mouse (o mesmo efeito do site da KWY). O CSS de [data-glow] desenha o brilho;
// aqui só passa a posição do mouse. No toque não existe.
export function initGlow(selector) {
  document.querySelectorAll(selector).forEach((el) => { el.dataset.glow = ''; });
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-glow]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}
