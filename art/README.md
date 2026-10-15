# Nilo no Blender

Abra `nilo.blend` no Blender 5.2 ou mais recente. O arquivo inclui as texturas.

- **Nilo • atelier**: poço, escadas, coluna octogonal, divisões em côvados, nichos, capitel, pavilhão e iluminação de revisão. Numpad 0 alterna a vista da câmera; botão do meio orbita.
- **Nilo • rio**: prévia editável do rio, margens, tamareiras, papiros e pavilhão.
- **Scene**: cena original preservada.

A prévia do rio usa materiais do Blender. No site, a água, o vento e o percurso da câmera são controlados em Three.js. As duas renderizações não são idênticas.

## Arquivos e exportação

`build_nilo.py` constrói os cinco modelos e exporta três GLB em `public/models/`. `preview_river.py` acrescenta a prévia do rio e a água para inspecionar o arquivo Blender. Ambos podem ser executados pelo MCP, sem processos externos ou acesso à rede. Ajuste a raiz do projeto no código se mover a pasta.

Para recriar: execute `build_nilo.py` e depois `preview_river.py`. Isso substitui as cenas geradas; salve alterações manuais em uma cópia antes de recriar. Não execute o gerador para exportar alterações feitas à mão.

Para exportar alterações manuais na cena **Nilo • atelier**, selecione apenas:

| Arquivo | Objetos |
| --- | --- |
| `nilometer.glb` | Nilometer |
| `vegetation.glb` | PalmA, PalmB, Papyrus |
| `pavilion.glb` | Pavilion |

Use glTF Binary, **Selected Objects** e **Active Scene**, Apply Modifiers, cores dos vértices ativas, texturas WebP qualidade 82 e compressão Meshopt. Não inclua a água de prévia, câmeras nem luzes. A água do site é um shader próprio. Depois rode `npm run build` e confira a prévia.

Um metro no Blender corresponde a um metro no site. A exportação glTF converte Z-up para Y-up. O percurso e as dimensões da escada devem permanecer compatíveis com `src/scenes/nilometer.js`.

## Materiais e autoria

Geometria de arquitetura e vegetação criada neste projeto. Interpretação artística de Roda baseada na pesquisa existente; não é levantamento arqueológico nem réplica certificada. Os ornamentos são geométricos, sem reprodução inventada de inscrições religiosas.

Texturas de arenito: **Sandstone Blocks 08**, de **Rob Tuytel / Poly Haven**, licença **CC0**. Originais de 1K em `textures/`: diffuse, normal OpenGL e roughness. Fonte: <https://polyhaven.com/a/sandstone_blocks_08>. Metadados e downloads: <https://api.polyhaven.com/files/sandstone_blocks_08>. Consultados em 15/10/2026. Os GLB contêm versões WebP.
