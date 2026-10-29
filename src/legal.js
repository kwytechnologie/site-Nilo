import './marca.js';
import './styles/legal.css';
import { initGlow } from './ui/glow.js';

initGlow('.contato, .leia, .rodape');

// O índice marca a seção que está sendo lida.
const links = [...document.querySelectorAll('.indice a')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    for (const a of links) {
      if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.texto section[id]').forEach((s) => io.observe(s));
