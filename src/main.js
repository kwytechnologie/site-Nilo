import '@fontsource-variable/rokkitt';
import '@fontsource-variable/instrument-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/reem-kufi/latin-600.css';
import './styles/main.css';
import { initUI } from './ui/ui.js';
import { initCookies } from './ui/cookies.js';
import { initCadastro } from './ui/cadastro.js';
import { modelUrl } from './scenes/model-url.js';

// Baixa os mesmos arquivos enquanto o pacote 3D carrega, sem esperar seu código.
if (!new URLSearchParams(location.search).has('sem3d')) {
  for (const name of ['vegetation', 'nilometer', 'guardians']) {
    const preload = document.createElement('link');
    Object.assign(preload, { rel: 'preload', as: 'fetch', href: modelUrl(name), crossOrigin: 'anonymous', fetchPriority: name==='vegetation'?'high':'low' });
    document.head.append(preload);
  }
}

const stage = import('./scenes/stage.js');
const ui = initUI();
initCookies({ politica: 'politica-de-privacidade/' });
initCadastro();
// O 3D vem num pacote separado: o texto e os botões já funcionam enquanto ele baixa.
stage.then(({ initStage }) => initStage({ onCovado: ui.onCovado })).catch((err) => {
  // Se o 3D falhar, o site continua legível com o fundo estático.
  console.warn('[nilo] 3D desativado:', err);
  document.documentElement.classList.add('sem-3d');
  const io = new IntersectionObserver(([e]) => document.documentElement.classList.toggle('no-poco', e.isIntersecting), { rootMargin: '0px 0px -50% 0px' });
  io.observe(document.getElementById('nilometro'));
});
