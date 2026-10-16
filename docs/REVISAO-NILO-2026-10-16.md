# Nilo: entrada contínua e detalhes do nilômetro

Revisão de 16/10/2026. Implementação em Blender 5.2.2 e Three.js. Sem geração paga, serviços de nuvem ou novas contas. O arquivo anterior `art/nilo.blend`, que já tinha alterações locais, foi preservado.

## O que esta versão faz

- O exterior, a porta, os guardas, a galeria e o poço pertencem ao mesmo espaço. A câmera atravessa a abertura, observa a cúpula, olha para a coluna, percorre a galeria e desce as escadas. O scroll reverso também fecha portas e lanças.
- Dois guardas humanos, com cabeça e mãos derivadas da base CC0 do MakeHuman, roupas próprias, lança simples e movimento pelo ombro. As articulações não exigem uma simulação ou um esqueleto completo no navegador.
- Porta de duas folhas com quatro campos entalhados por folha, madeira com mapas de cor, rugosidade e normal, ferragens discretas e pivôs reais nas dobradiças.
- Pintura floral do site anterior recuperada como textura da cúpula interna. O teto entre o quadrado da galeria e o tambor de doze lados foi fechado; o telhado externo é uma superfície separada.
- Inscrições em português recuperadas: “MEDIR PARA NÃO FALTAR” e “QUEM MEDE NÃO FICA SEM”. Ornamentos vegetais, marcações da coluna e nichos em arco continuam presentes.
- Escadas contínuas substituem caixas sobrepostas. Faces internas coincidentes, junções e orientação das superfícies foram revisadas para reduzir cintilação.
- Água com quatro escalas de ondulação, variação espacial, Fresnel e brilho filtrado pela área do pixel. O poço tem movimento mais discreto que o rio.

## Limites históricos e visuais

O nilômetro de Roda foi reconstruído em 861, sob al-Mutawakkil. A cobertura atualmente visitável incorpora reconstruções posteriores. A galeria, o tambor com doze janelas, a cúpula pintada interna e o telhado em tenda são referências ao edifício visitável, sem apresentar sua aparência atual como restituição integral de 861. Referências: [Ministério egípcio](https://egymonuments.gov.eg/en/monuments/rawda-island-nilometer/) e [estudo de Kay C. Klinger, BBAW](https://thesaurus.bbaw.de/en/blog/11-panta-rei-everything-flows-the-nilometer-on-rhoda-island-cairo).

A porta é uma criação do projeto inspirada na organização e no entalhe vegetal do [par de portas do século IX, Met 31.119.4](https://www.metmuseum.org/art/collection/search/448655), atribuído a Samarra. Não é uma cópia medida nem uma porta original comprovada de Roda.

As roupas usam evidências e analogias do período abássida. Não se conhece um uniforme exato dos vigias desse nilômetro. A presença da dupla e o gesto de cruzar as lanças são uma escolha narrativa. A pesquisa completa, com graus de certeza e limites de cada referência, está em [guardas-roda-861.md](guardas-roda-861.md).

A pintura é a interpretação já desenhada para o Nilo, não uma reprodução arqueológica do mosaico ou de suas cores. Não foram copiadas inscrições corânicas nem criadas frases pseudoárabes. As frases da empresa são intervenções de marca.

O minarete e outros elementos de paisagem fazem uma composição inspirada na região e em diferentes camadas históricas. O cenário não é um mapa do Cairo de 861. A água tem reflexos analíticos do ambiente; não reflete literalmente barcos e paredes. A prévia de água no Blender usa seu próprio material e não é idêntica ao shader do site.

## Arquivos editáveis e reprodução

Arquivo principal desta revisão: `art/nilo-revisao.blend`. Cenas:

- **Nilo • arquitetura v2**: entrada, galeria, cúpula, coluna e escada. Timeline: 1, entrada fechada; 100, entrada concluída; 135, vista do teto; 160, mirada para o poço; 200, descida.
- **Nilo • guardas**: inspeção do par, tecidos, mãos e lanças.
- **Nilo • rio v2**: prévia com rio, margens, vegetação e edifício conectado ao interior.

No Blender, selecione a cena no seletor superior. `Numpad 0` mostra a câmera; a timeline permite inspecionar as posições. Botão do meio orbita; `Shift` + botão do meio desloca; roda aproxima. Sem teclado numérico, use **View > Cameras > Active Camera**. `Shift` + crase abre navegação livre, com `W A S D` e mouse; `Esc` sai. Os atalhos dependem do keymap padrão.

Geradores: `art/build_nilo_v2.py`, `art/build_guards.py`, depois `art/preview_nilo_v2.py`. Para reproduzir o conjunto do zero, comece em um arquivo novo e execute no Text Editor do Blender ou pelo MCP. **Recriar substitui as cenas geradas; salve uma cópia antes de editar manualmente.** O gerador dos guardas recusa a substituição quando os objetos estão ligados a outras cenas, como ocorre na prévia integrada. A raiz absoluta `ROOT` precisa ser ajustada se a pasta mudar. `art/prepare_wood.py` gera os mapas de madeira; `scripts/bake-ornaments.mjs` recupera os desenhos Canvas originais com Chrome local. As texturas prontas já estão versionadas.

O navegador carrega `nilometer.glb`, `guardians.glb` e `vegetation.glb`, com compressão Meshopt e imagens WebP. Uma revisão na URL dos modelos impede o reaproveitamento de um GLB antigo incompatível com os novos pivôs. `pavilion.glb` permanece como arquivo legado, sem uso nesta versão. As animações de abertura são aplicadas aos mesmos pivôs do Blender pelo scroll.

## Revisão humana

1. Aprovar os guardas, o desenho da porta, as cores e o ritmo de observação do teto.
2. Medir em Android/iPhone físico, especialmente aparelho intermediário e conexão móvel. Emulação de viewport e CPU no computador não reproduz a GPU nem a bateria de um telefone.
3. Para uma réplica histórica, encomendar levantamento dimensional e revisão especializada. Esta entrega é uma interpretação de marketing, com as conjecturas identificadas.

## Validação final

Build Vite concluído. Há um aviso de tamanho do chunk 3D: 704,85 KB minificado, aproximadamente 184,14 KB gzip. Esse módulo continua carregado separadamente do conteúdo inicial.

Arquitetura: **12.256 triângulos**. Guardas: **9.787 por personagem**, 19.574 no par. Os três GLB carregados somam **1.386.632 bytes**, aproximadamente 1,39 MB. O arquivo Blender inclui as texturas e as cenas de prévia.

A checagem geométrica passou para arquitetura e ambos os guardas: sem erros de sobreposição coplanar, normais invertidas, winding inconsistente, UV degenerada ou partes soltas. O cálculo de volume do verificador foi estabilizado em precisão dupla e relativo ao componente, pois o determinante float32 em coordenadas mundiais acusava falsamente a pequena fivela do cinto. `scripts/check-blender-assets.py` registra essa adaptação; os demais testes da skill permanecem ativos.

Avisos aceitos: UVs sobrepostas/repetidas são intencionais para texturas de revestimento e materiais compartilhados; não são um atlas para bake único. Há vértices separados nas junções de componentes e polígonos planos que o glTF triangula. Algumas faces opostas internas permanecem em contatos entre peças e placas; não são superfícies coplanares visíveis disputando o depth buffer. Olhos e suportes das placas têm partes intencionalmente embutidas. A arquitetura se estende abaixo de Z=0 porque esse zero é o piso da galeria. As aberturas de punhos, gola e base da cúpula são interfaces intencionais entre peças, não buracos visíveis na cobertura.

Chrome local, desktop 1440×900 e celular emulado 390×844, DPR 2 e CPU 4× mais lenta. Revisão visual do exterior, porta em abertura, passagem, teto, coluna, escada e água. **Nenhum erro de JavaScript/shader, download 404 ou overflow horizontal na navegação normal.** Passaram: continuidade da câmera nos dois sentidos, abertura das folhas e lanças, ausência do véu preto, redução de movimento sem quadros ociosos, menu móvel, âncoras, orientação horizontal, acesso direto, perda de contexto, `?sem3d` e falha deliberada de modelo mantendo conteúdo legível.

No perfil móvel emulado, o trecho da escada desenhou **15 chamadas / 8.332 triângulos**; no fundo, **8 / 6.064**. A paisagem externa deixa de ser desenhada durante a descida e é restaurada no retorno. A resolução adaptativa e a ausência de sombras dinâmicas móveis foram mantidas. O carregamento inicial ainda concentra tarefas de preparação, incluindo uma de aproximadamente 1,24 s com CPU reduzida; o poster mantém a página utilizável nesse período.

Os intervalos de RAF medidos no computador não são FPS de um telefone. O teste em aparelho físico permanece na lista de revisão humana. Relatórios e capturas: `.qa/release-v2-mobile/`, `.qa/release-v2-desktop/` e `.qa/meshes-final.json` (não versionados). Reprodução: `npm run build`, depois `NILO_QA_CHECKS=1` com `node scripts/check-scene.mjs dist revisao mobile` ou `desktop`. `NILO_QA_PORTAL=1` seleciona os oito enquadramentos da entrada/descida; no PowerShell, atribua essas variáveis por `$env:`.
