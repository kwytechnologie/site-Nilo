import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// O site roda no GitHub Pages em /site-Nilo/. Com domínio próprio, trocar base para '/'.
export default defineConfig({
  base: process.env.NILO_BASE ?? '/site-Nilo/',
  build: {
    target: 'es2020',
    // o pacote do 3D (Three.js) passa de 500 KB, mas baixa depois do texto, sem travar a página
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        marca: resolve(import.meta.dirname, 'marca.html'),
      },
    },
  },
});
