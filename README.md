# Nilo

Site do Nilo, o medidor inteligente da KWY Technologies instalado sob o bebedouro inteiro,
com o galão de 20 litros instalado normalmente no bebedouro.
Uma descida pelo rio Nilo até o nilômetro da ilha de Roda, no Cairo, feita em Three.js.

```bash
npm install
npm run dev
```

- `npm run build` gera `dist/` (publicado no S3 com HTTPS pelo CloudFront).
- CI/CD do GitHub Actions e configuração AWS: [docs/DEPLOY.md](docs/DEPLOY.md).
- `node scripts/build-logos.mjs` regera as opções de logo em `public/marca/`.
- Estado do trabalho e próximos passos: `docs/HANDOFF.md`.
- Decisões em aberto: `DECISOES.md`.
- Pesquisa histórica com fontes: `docs/pesquisa-nilometro.md`.
- Modelos Blender e como editar/exportar: `art/README.md`.
- Revisão 3D de 15/10/2026 e resultados de desempenho: `docs/BLENDER-2026-10-15.md`.
