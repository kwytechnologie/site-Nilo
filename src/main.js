import '@fontsource-variable/rokkitt';
import '@fontsource-variable/instrument-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/reem-kufi/latin-600.css';
import './styles/main.css';
import { initUI } from './ui/ui.js';

const ui = initUI();
// O 3D vem num pacote separado: o texto e os botões já funcionam enquanto ele baixa.
import('./scenes/stage.js').then(({ initStage }) => initStage({ onCovado: ui.onCovado })).catch((err) => {
  // Se o 3D falhar, o site continua legível com o fundo estático.
  console.warn('[nilo] 3D desativado:', err);
  document.documentElement.classList.add('sem-3d');
  const io = new IntersectionObserver(([e]) => document.documentElement.classList.toggle('no-poco', e.isIntersecting), { rootMargin: '0px 0px -50% 0px' });
  io.observe(document.getElementById('nilometro'));
});
