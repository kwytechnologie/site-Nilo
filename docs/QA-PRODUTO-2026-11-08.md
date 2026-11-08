# Seção Produto — 08/11/2026

## Validação do usuário no iPhone

Em 08/11/2026, após a publicação do commit `5c71d6f` no site oficial,
o usuário confirmou: **“testei no meu iPhone e ficou bom, está fluido.”**
O navegador informado anteriormente é Safari; o modelo do iPhone não foi informado.
Esta é uma validação física relatada pelo usuário, sem medição instrumental de FPS.
Ela confirma a seção Produto publicada e substitui a pendência de teste físico daquela versão.
Os ajustes de enquadramento descritos abaixo são posteriores a essa confirmação.

## Entrega

A seção `#produto` fica entre O problema e Como funciona. O menu principal, o menu móvel
e os menus das páginas legais apontam para ela. Usa os quatro renders aprovados pelo usuário:
perspectiva, parte inferior, frente e close do LED verde.

As marcações douradas ligam a plataforma a três detalhes selecionáveis. No celular,
os controles ficam abaixo da imagem e mostram uma explicação por vez. A entrada suave
reaproveita o observador do site; não há animação contínua, vídeo, modelo 3D adicional ou
trabalho de JavaScript por quadro na seção Produto. Movimento reduzido é respeitado.

Conteúdo confirmado:

- Plataforma sob o **bebedouro inteiro**, com o galão de 20 litros instalado normalmente nele.
- Quatro pés: dois na estrutura maior da frente e dois atrás. Orientação da logo preservada.
- LED verde pisca quando a rede de configuração está disponível. Visível na gota e na região
  frontal/inferior. Os alertas de água chegam pelo WhatsApp; o LED não indica internet conectada.
- Vidro de 30 × 30 cm e 4 mm; adesivo de 29 × 29 cm; borda livre nominal de 5 mm.
- Imagens identificadas como ilustrativas do protótipo; o brilho do LED é uma simulação visual aprovada.

## Carregamento e assets

WebP, qualidade 88, larguras 640 e 1280 px, dimensões explícitas, `srcset`, `sizes`,
`loading="lazy"`, `decoding="async"` e prioridade baixa. O build usa nomes com hash,
aproveitando o cache imutável do fluxo de publicação existente.

| Render | 640 px | 1280 px |
|---|---:|---:|
| Perspectiva | 6.292 bytes | 16.394 bytes |
| Quatro pés | 6.984 bytes | 16.606 bytes |
| Frente | 4.120 bytes | 10.258 bytes |
| LED | 7.040 bytes | 16.632 bytes |

As quatro versões maiores somam 59.890 bytes. Não houve download de imagens do produto
na abertura inicial de perfil novo nos testes locais de Chrome e WebKit.
Em uma visita com cache, o WebKit pode consultar novamente imagens já vistas.
O WebKit utilizado não informou `encodedBodySize` de forma útil; os tamanhos da tabela
são os tamanhos reais dos arquivos, não estimativas desse navegador.

Nenhum arquivo STEP, projeto Blender, fotografia original ou dado interno foi publicado.
Os renders originais e cenas de estúdio continuam fora do repositório público.
`art/nilo.blend` já estava modificado antes desta tarefa e não integra este commit.

## Validação local inicial (commit `5c71d6f`)

- `npm run build`: aprovado. O aviso do pacote 3D acima de 700 KB já é tratado pelo carregamento
  separado; não houve alteração nos modelos, materiais ou runtime do passeio.
- `node --test scripts/prepare-deploy.test.mjs scripts/cloudfront.test.mjs`: 2 testes aprovados.
- `scripts/check-product.mjs`: Chrome desktop e WebKit com viewport de iPhone 13,
  visitas fria e com cache no WebKit. Menus, seleção dos três detalhes, carregamento das imagens,
  teclado (Home, End, seta), link Como instalar, movimento reduzido e larguras de 320 a 1440 px.
- Altura da seção estável ao trocar detalhes: 1201 px no desktop e 1537 px no viewport móvel
  de 390 px. Nenhum transbordamento horizontal ou erro de página/recurso nos testes.
- Capturas dos três detalhes em desktop e móvel revisadas visualmente. As evidências locais
  ficam em `.qa/product/`, ignoradas pelo Git.
- `scripts/check-scene.mjs`, móvel com CPU 4×, visitas fria e com cache: **20 verificações aprovadas**,
  incluindo travessia contínua nos dois sentidos, portas e lanças, ausência de tela preta,
  reduced motion, menu, paisagem, link direto, perda de contexto e falha de modelo.
- Na travessia desse Chrome emulado: p95 de 7,1 ms nas duas visitas, máximos de 14,2 e 14 ms,
  sem tarefas longas nem compilação de shaders durante a entrada. São resultados desta máquina.

O WebKit no Windows teve p95 de 66/65 ms nas visitas fria/com cache; uma conferência da
versão oficial anterior na mesma máquina teve 63/64 ms. Essa emulação tem limitação de
desempenho e não comprova fluidez em um iPhone físico. A entrada completou sem fallback
ou tela preta. A confirmação física da seção publicada foi recebida em seguida e está
registrada no início deste relatório.

## Ajustes posteriores: enquadramento dos menus

- As âncoras centralizam o conteúdo visível do Produto, sem contar os espaços do percurso.
  O cálculo usa a altura visual disponível do navegador e desconta a navegação fixa.
  O cabeçalho mantém a mesma altura antes e depois da rolagem, evitando desvio no destino.
- Produto compacto no computador. No celular, uma imagem por vez e quatro seleções:
  Plataforma, LED verde, Quatro pés e Parte frontal. São os mesmos renders e arquivos leves.
- Como funciona, WhatsApp, Perguntas e Ficha técnica usam espaços menores no celular.
  Textos repetidos foram resumidos, preservando instalação, funcionamento e configurações.
- Nenhuma altura máxima corta textos. Telas muito baixas, respostas de FAQ abertas ou
  texto ampliado continuam permitindo rolagem normal, em vez de reduzir a legibilidade.
- O ajuste não adiciona dependências, modelos 3D ou processamento contínuo por quadro.

Verificações desta atualização: `scripts/check-navigation.mjs` e `scripts/check-product.mjs`.
Evidências locais em `.qa/navigation/` e `.qa/product-navigation/`, ignoradas pelo Git.
Build e os dois testes do fluxo de publicação aprovados. O teste do Produto passou no
Chrome e no WebKit (frio e com cache): quatro seleções, teclado e entrada no nilômetro
sem tela preta ou fallback. Os assets permanecem abaixo do orçamento de 100 KB.

O teste de navegação passou em **30 combinações de seção/tela**: Chrome 1366 × 768 e
1440 × 900; WebKit 390 × 664, 375 × 667 e 430 × 740. Produto, Como funciona, WhatsApp,
Empresas, Distribuidoras e Perguntas ficaram inteiros e centralizados abaixo do cabeçalho.
Também passaram os quatro detalhes do Produto, link direto, movimento reduzido e texto
ampliado em 320 × 568, com rolagem livre e sem transbordamento horizontal.
Essas dimensões representam a área útil do navegador; não incluem as barras do Safari.

Comparação de altura do conteúdo, não do segmento de rolagem da animação:

| Conteúdo | Antes | Depois | Área útil testada |
|---|---:|---:|---|
| Produto no computador | 946 px | 668 px | 1366 × 768 |
| Produto no celular | 1345 px | 570 px | 390 × 664 |
| Como funciona no celular | 827 px | 550 px | 390 × 664 |
| WhatsApp no celular | 856 px | 554 px | 390 × 664 |
| Perguntas no celular, fechadas | 695 px | 542 px | 390 × 664 |

## Reproduzir

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# Em outro terminal, usando uma instalação existente de Playwright:
$env:NILO_PLAYWRIGHT_MODULE = 'CAMINHO_DO_PLAYWRIGHT'
node scripts/check-product.mjs

$env:NILO_QA_CHECKS = '1'
$env:NILO_QA_RETURNING = '1'
$env:NILO_QA_TRAVERSE = '1'
node scripts/check-scene.mjs dist product-mobile mobile
```

`NILO_QA_URL` permite apontar os scripts para uma URL publicada. Para regerar as imagens,
usar `python scripts/prepare-product-images.py PASTA_DOS_RENDERS_APROVADOS` com Pillow.
