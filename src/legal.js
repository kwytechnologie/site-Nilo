import '@fontsource-variable/rokkitt';
import '@fontsource-variable/instrument-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/main.css';
import './styles/legal.css';
import { initGlow } from './ui/glow.js';
import { initMenu } from './ui/menu.js';
import { initCookies } from './ui/cookies.js';
import { initCadastro } from './ui/cadastro.js';

initGlow('.btn, .nav__links a, .indice__caixa, .leia, .legal-contato__card, .rodape');
initMenu();
initCookies({ politica: '../politica-de-privacidade/' });
initCadastro();

// No computador o índice fica sempre aberto, numa caixa fixa; no celular vira uma lista que abre e fecha.
const indice = document.querySelector('[data-indice]');
const largo = matchMedia('(min-width: 900px)');
const ajustarIndice = () => { indice.open = largo.matches; };
largo.addEventListener('change', ajustarIndice);
ajustarIndice();
indice.addEventListener('click', (e) => { if (e.target.closest('a') && !largo.matches) indice.open = false; });

// O índice marca a seção que está sendo lida.
const links = [...indice.querySelectorAll('a')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    for (const a of links) {
      if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.texto section[id]').forEach((s) => io.observe(s));
