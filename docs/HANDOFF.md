# Passagem de bastão: site do Nilo

Estado em 07/10/2026, ao fim da primeira sessão (local). Este arquivo é para a próxima sessão
(nuvem) continuar sem perder contexto. Ler inteiro antes de mexer.

## O produto

**Nilo** é o nome novo da Balança H2O da KWY Technologies: uma base com 4 células de carga que
fica debaixo do galão de água de 20 L, mede quanto resta e avisa e pede água pela distribuidora
mais próxima pelo WhatsApp. Sem aplicativo. 3 pilhas AA, de 9 meses a 1 ano. Wi-Fi 2,4 GHz.
Modo automático (pede sozinho se o cliente não responder em 15 min; o primeiro pedido sempre
confirma) ou manual. Pix na conversa. CPF e CNPJ, várias balanças por cliente. Ainda é protótipo:
preço, data de venda e termos de uso não existem.

O nome vem do **nilômetro**, em especial o da ilha de Roda, no Cairo (861).

## Regras do dono (Rafael) que valem para todo texto e design

- **Nunca usar travessão (—) em texto visível.** Usar vírgula ou ponto. Também evitar tríades e
  cacoetes de texto de IA ("sem X, sem Y, sem Z").
- Português do Brasil. Explicar sigla na primeira vez.
- Este site é de propósito **mais chamativo e com marketing mais agressivo** que o site da KWY
  (kwytech.com), que é sóbrio. Mesma empresa, produto de consumo.
- **A logo com fotos de satélite do rio (pasta `~/nilo-identidade`, feita no Codex) NÃO entra no
  site.** Ele disse isso explicitamente. A logo usada é a opção A ("Côvado") de `public/marca/`,
  provisória até ele aprovar uma das opções.
- Elementos do Egito antigo e do Cairo do séc. IX, sem caricatura. **Nunca reproduzir as
  inscrições de Roda (são versículos do Alcorão), nem pseudo-árabe, nem o nome de Deus.** Texto
  das faixas em português, em fonte de estilo cúfico (Reem Kufi).
- Ele cobra prova: afirmar só o que foi testado, com captura de tela.
- Não mexer em nada da AWS. Não criar contas. Não comprar nada.

## O que já está pronto

- Vite + Three.js + Lenis, sem framework. `npm run dev` (porta livre), `npm run build`.
- `index.html`: todo o texto do site. Paradas no rio (hero, problema, como funciona, WhatsApp,
  modos, casa e empresa, distribuidoras, de onde vem o nome), a porta, e dentro do nilômetro
  (ficha técnica, perguntas, CTA final "Fundo do poço, só aqui dentro.", rodapé).
- `src/scenes/river.js`: o Nilo ao pôr do sol rumo ao norte. Sol e pirâmides de Gizé a oeste
  (esquerda), feluccas de vela latina, papiro, tamareiras, shaduf, vilarejos de adobe, minarete em
  espiral de Ibn Tulun (879) e minaretes de Fustat a leste, aves, e a ilha de Roda com o pavilhão
  do nilômetro e a porta acesa no fim. A câmera atravessa a porta e a tela escurece.
- `src/scenes/nilometer.js`: reconstrução com as medidas da pesquisa (poço quadrado de 5,9 m em
  cima e circular embaixo, dois lances retos e depois espiral, coluna de 16 côvados de 54,05 cm
  sobre pedestal de 1,2 m, capitel coríntio, viga, nichos ogivais com ziguezague, túneis, painéis
  em lápis, pavilhão com 4 pilares, tambor de 12 lados com muxarabi, cúpula pintada, lanternas,
  raio de sol e poeira). **Esta versão nova ainda não foi conferida em captura de tela**: a
  anterior foi, e funcionava.
- `src/scenes/textures.js`: todas as texturas são desenhadas em canvas (sem baixar imagem).
- `src/ui/ui.js`: rolagem suave, menu do celular, entradas das placas, conversa animada do
  WhatsApp, medidor de côvados (pílula no topo no celular; "cheia ideal" no 16).
- `scripts/build-logos.mjs` gera as 6 opções de logo em `public/marca/` a partir da Rokkitt
  Black (OFL): A Côvado, B Poço, C Mw (hieróglifo da água), D Cartucho, E Coluna, F Lótus, mais
  ícones. Rodar `node scripts/build-logos.mjs`.
- Fontes auto-hospedadas (sem Google Fonts em tempo de execução, por LGPD): Rokkitt (títulos,
  linhagem das fontes "Egyptian"/Memphis), Instrument Sans (texto), Space Mono (medidas, a mesma
  da logo KWY), Reem Kufi (faixas do nilômetro).
- `docs/pesquisa-nilometro.md`: pesquisa completa com fontes (medidas, cultura, paletas, fontes,
  modelos 3D, alerta cultural). Base de toda decisão histórica.

## Segunda sessão (nuvem, 07/10/2026): o que foi feito

- Cena do nilômetro conferida em captura, desktop 1440 x 900 e celular 390 x 844, do início ao
  fundo. Corrigido: a viga sobre a coluna virava uma laje preta na frente da câmera (agora madeira
  clara e mais fina); o ziguezague dos nichos parecia um fio solto (agora rente à parede, cor de
  reboco); o rótulo do topo sumia no céu claro do celular (sombra mais alta); o medidor de côvados
  encostava no cartão de Perguntas (cartão afastado).
- `marca.html` pronta: 6 logos em fundo claro e escuro, ícones, 8 cores com nome, história e
  contraste calculado, 4 fontes, tom de voz e regras culturais.
- Pôsteres sem WebGL capturados da cena: `public/img/poster-rio.jpg`, `poster-poco.jpg`, e a
  imagem de compartilhamento `og-nilo.jpg` (1200 x 630).
- Pacote dividido: o carregamento inicial caiu de 637 KB para 24 KB. O 3D (Three.js, 603 KB) baixa
  depois do texto, e o nilômetro (12 KB) só quando a descida se aproxima. Se o 3D falhar, os
  pôsteres entram no lugar.
- Acessibilidade testada: ordem do Tab e foco visível, movimento reduzido (conversa do WhatsApp
  aparece inteira; a câmera parar de balançar está no código, não foi capturado), modo sem 3D (`?sem3d`). Cartão com foco de teclado
  nunca fica invisível.
- Varredura de texto: nenhum travessão; nenhum cacoete fora dos exemplos de "Assim não".
- **Não publicado**: o Pages não está ativado no repositório privado (ver DECISOES.md, item 1).
- Nota para o Obsidian pronta em `docs/nota-obsidian.md`.

## O que falta

1. Rafael: decidir publicação (DECISOES.md, item 1) e escolher a logo (item 4).
2. Com a logo escolhida: trocar no `index.html`, refazer `og-nilo.jpg` e ícone da aba.
3. Paredes do pavilhão: a textura lê mais como tábua do que como pedra; vale um passe.
4. Copiar `docs/nota-obsidian.md` para `Documents/KWY TECH/02 - Projetos/Balança H2O/`.
