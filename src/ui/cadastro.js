import '../styles/cadastro.css';
// Botões "Quero o meu" / "Quero ser parceira": abrem uma janela que deixa a pessoa ir direto ao
// WhatsApp ou mandar junto um pré-cadastro. Nada fica guardado no site: os dados só entram no texto
// da mensagem, que a pessoa ainda revisa no WhatsApp antes de enviar.
const NUMERO = '554840420379';

const TIPOS = {
  cliente: {
    titulo: 'Quero o meu Nilo',
    mensagem: 'Quero conhecer o Nilo',
    nome: 'Seu nome ou empresa',
  },
  distribuidora: {
    titulo: 'Quero ser parceira',
    mensagem: 'Quero ser uma distribuidora parceira do Nilo',
    nome: 'Nome da distribuidora',
  },
};

const wa = (texto) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;

export function initCadastro() {
  const dialog = document.createElement('dialog');
  dialog.className = 'cadastro';
  dialog.setAttribute('aria-labelledby', 'cadastro-titulo');
  // a roda do mouse aqui dentro não pode chegar à rolagem suave (Lenis) da página
  dialog.setAttribute('data-lenis-prevent', '');
  dialog.innerHTML = `
    <button type="button" class="cadastro__fechar" data-fechar aria-label="Fechar">×</button>
    <p class="eyebrow">Fale com a gente no WhatsApp</p>
    <h2 class="cadastro__titulo" id="cadastro-titulo"></h2>
    <p class="cadastro__intro">Você escolhe: preencher um pré-cadastro rápido ou ir direto pelo botão lá embaixo, sem preencher nada. Os dois caminhos levam para a mesma conversa.</p>

    <form class="cadastro__form" novalidate>
      <p class="cadastro__passo"><b>Com pré-cadastro</b> (opcional)</p>
      <p class="cadastro__explica">Preencha os campos e os seus dados já vão junto na primeira mensagem. Assim o atendente não precisa perguntar tudo de novo e o atendimento anda mais rápido.</p>
      <div class="cadastro__dupla">
        <label class="cadastro__campo"><span data-rotulo-nome></span>
          <input name="nome" required autocomplete="organization" maxlength="80" /></label>
        <label class="cadastro__campo"><span>Nome do contato <i>opcional</i></span>
          <input name="contato" autocomplete="name" maxlength="80" /></label>
      </div>
      <div class="cadastro__dupla">
        <label class="cadastro__campo"><span>CEP</span>
          <input name="cep" required inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" pattern="\\d{5}-?\\d{3}" maxlength="9" /></label>
        <label class="cadastro__campo"><span>Telefone para contato</span>
          <input name="telefone" required type="tel" inputmode="tel" autocomplete="tel" placeholder="(48) 99999-9999" pattern="[\\d\\s()+\\-]{10,20}" maxlength="20" /></label>
      </div>
      <label class="cadastro__campo"><span>E-mail</span>
        <input name="email" required type="email" autocomplete="email" maxlength="120" /></label>
      <p class="cadastro__erro" data-erro hidden>Confira os campos marcados.</p>
      <button type="submit" class="btn btn--cta cadastro__enviar">Enviar pelo WhatsApp com pré-cadastro</button>
    </form>

    <div class="cadastro__ou"><span>ou</span></div>
    <p class="cadastro__explica">Prefere não preencher nada? Sem problema, é só ir direto. O atendente pergunta o que precisar na conversa.</p>
    <a class="btn btn--ghost cadastro__direto" data-direto target="_blank" rel="noopener">Ir para o WhatsApp sem cadastro</a>
    <p class="cadastro__nota">Nada fica guardado neste site. Os dados vão só no texto da mensagem, que você ainda revisa antes de enviar. Veja a <a data-politica>Política de Privacidade</a>.</p>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const erro = dialog.querySelector('[data-erro]');
  const politica = document.querySelector('a[href*="politica-de-privacidade/"]');
  dialog.querySelector('[data-politica]').href = politica ? politica.getAttribute('href') : 'politica-de-privacidade/';
  let tipo = TIPOS.cliente;

  function abrir(qual) {
    tipo = TIPOS[qual] || TIPOS.cliente;
    dialog.querySelector('#cadastro-titulo').textContent = tipo.titulo;
    dialog.querySelector('[data-rotulo-nome]').textContent = tipo.nome;
    dialog.querySelector('[data-direto]').href = wa(tipo.mensagem);
    erro.hidden = true;
    form.classList.remove('is-tentou');
    dialog.showModal();
    document.documentElement.classList.add('cadastro-aberto');
  }

  dialog.addEventListener('close', () => document.documentElement.classList.remove('cadastro-aberto'));
  dialog.querySelector('[data-fechar]').addEventListener('click', () => dialog.close());
  // clique no fundo escuro fecha
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.querySelector('[data-direto]').addEventListener('click', () => dialog.close());

  form.cep.addEventListener('input', () => {
    const d = form.cep.value.replace(/\D/g, '').slice(0, 8);
    form.cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.classList.add('is-tentou');
    if (!form.checkValidity()) {
      erro.hidden = false;
      form.querySelector(':invalid').focus();
      return;
    }
    const v = (n) => form[n].value.trim();
    const linhas = [
      tipo.mensagem,
      '',
      'Meu pré-cadastro:',
      `${tipo === TIPOS.distribuidora ? 'Distribuidora' : 'Nome/empresa'}: ${v('nome')}`,
      v('contato') ? `Contato: ${v('contato')}` : null,
      `CEP: ${v('cep')}`,
      `Telefone: ${v('telefone')}`,
      `E-mail: ${v('email')}`,
    ].filter((l) => l !== null);
    window.open(wa(linhas.join('\n')), '_blank', 'noopener');
    dialog.close();
    form.reset();
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cta]');
    if (!btn) return;
    e.preventDefault();
    document.querySelector('[data-menu][aria-expanded="true"]')?.click();
    abrir(btn.dataset.cta === 'distribuidora' ? 'distribuidora' : 'cliente');
  });
}
