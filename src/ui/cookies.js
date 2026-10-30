import '../styles/cookies.css';
// Aviso de cookies, no mesmo funcionamento do site da KWY: aparece na primeira visita (ou depois de
// apagar os dados do navegador), escurece e trava o site até a pessoa escolher, e reabre pelo botão
// "Preferências de cookies" do rodapé. A escolha fica só no navegador (localStorage).
const KEY = 'nilo-consent';
const VERSAO = 1;

function ler() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    return c && c.version === VERSAO ? c : null;
  } catch { return null; }
}

// shortcut: o site ainda não mede visitas, então aceitar "Análise" só fica guardado; quando o
// Analytics entrar, carregar o script aqui (só com analytics === true).
function aplicar() {}

export function initCookies({ politica }) {
  const raiz = document.createElement('div');
  raiz.className = 'cookies-raiz';
  raiz.hidden = true;
  raiz.innerHTML = `
    <div class="cookies-overlay" aria-hidden="true"></div>
    <aside class="cookies" role="dialog" aria-modal="true" aria-labelledby="cookies-titulo">
      <div class="cookies__head">
        <strong class="cookies__title" id="cookies-titulo">Sua privacidade</strong>
      </div>
      <p class="cookies__text">Este site usa só o necessário para funcionar. Se um dia passarmos a medir as visitas, será apenas com a sua autorização, como pede a LGPD. Saiba mais na <a href="${politica}">Política de Privacidade</a>.</p>
      <div class="cookies__prefs" hidden>
        <div class="cookies__pref cookies__pref--fixa">
          <span><span class="cookies__pref-nome">Necessários</span><span class="cookies__pref-desc">Fazem o site funcionar. Sempre ativos.</span></span>
          <span class="cookies__switch is-on is-fixo" aria-hidden="true"></span>
        </div>
        <label class="cookies__pref">
          <span><span class="cookies__pref-nome">Análise</span><span class="cookies__pref-desc">Medição de visitas ao site. Ainda não usamos.</span></span>
          <input type="checkbox" class="cookies__check" data-analise />
          <span class="cookies__switch" aria-hidden="true"></span>
        </label>
      </div>
      <div class="cookies__actions">
        <button type="button" class="cookies__btn cookies__btn--primario" data-todos>Aceitar todos</button>
        <button type="button" class="cookies__btn" data-necessarios>Apenas necessários</button>
        <button type="button" class="cookies__link" data-personalizar>Personalizar</button>
        <button type="button" class="cookies__btn" data-salvar hidden>Salvar escolhas</button>
      </div>
    </aside>`;
  document.body.append(raiz);

  const $ = (s) => raiz.querySelector(s);
  const prefs = $('.cookies__prefs');
  const analise = $('[data-analise]');
  const outros = () => [...document.body.children].filter((el) => el !== raiz && el.tagName !== 'SCRIPT');
  // a roda do mouse sobre o aviso não pode chegar à rolagem suave (Lenis) da página
  const parar = (e) => { e.preventDefault(); e.stopPropagation(); };
  raiz.addEventListener('wheel', parar, { passive: false });
  raiz.addEventListener('touchmove', parar, { passive: false });

  // "Salvar escolhas" entra no lugar de "Personalizar" e os outros botões não se mexem: um clique
  // duplo em Personalizar não pode cair em "Aceitar todos".
  let prefsDesde = 0;
  function mostrarPrefs(sim) {
    prefs.hidden = !sim;
    $('[data-salvar]').hidden = !sim;
    $('[data-personalizar]').hidden = sim;
    prefsDesde = sim ? performance.now() : 0;
  }
  const cliqueApressado = () => performance.now() - prefsDesde < 450;

  function abrir(comPrefs) {
    const salvo = ler();
    // a análise só fica ligada se a pessoa ligou antes (LGPD: consentimento ativo)
    analise.checked = Boolean(salvo?.analytics);
    mostrarPrefs(comPrefs);
    raiz.hidden = false;
    outros().forEach((el) => { el.inert = true; });
    document.documentElement.classList.add('cookies-travado');
    requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('is-aberto')));
    $('[data-todos]').focus({ preventScroll: true });
  }

  function decidir(analytics) {
    const consent = { analytics, version: VERSAO, ts: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch { /* segue sem guardar */ }
    aplicar(consent);
    raiz.classList.remove('is-aberto');
    outros().forEach((el) => { el.inert = false; });
    document.documentElement.classList.remove('cookies-travado');
    setTimeout(() => { raiz.hidden = true; }, 320);
  }

  $('[data-todos]').addEventListener('click', () => { if (!cliqueApressado()) decidir(true); });
  $('[data-necessarios]').addEventListener('click', () => { if (!cliqueApressado()) decidir(false); });
  $('[data-salvar]').addEventListener('click', () => { if (!cliqueApressado()) decidir(analise.checked); });
  $('[data-personalizar]').addEventListener('click', () => mostrarPrefs(true));
  document.querySelectorAll('[data-cookies]').forEach((b) => b.addEventListener('click', () => abrir(true)));

  const salvo = ler();
  if (salvo) aplicar(salvo);
  else abrir(false);
}
