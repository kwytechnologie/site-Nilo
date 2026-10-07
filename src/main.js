import '@fontsource-variable/rokkitt';
import '@fontsource-variable/instrument-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/reem-kufi/latin-600.css';
import './styles/main.css';
import { initUI } from './ui/ui.js';
import { initStage } from './scenes/stage.js';

const ui = initUI();
initStage({ onCovado: ui.onCovado }).catch((err) => {
  // Se o 3D falhar, o site continua legível com o fundo estático.
  console.warn('[nilo] 3D desativado:', err);
  document.documentElement.classList.add('sem-3d');
});
