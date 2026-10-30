import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// S3/CloudFront serve na raiz. NILO_BASE permite prévias em um subdiretório.
export default defineConfig({
  base: process.env.NILO_BASE ?? '/',
  build: {
    target: 'es2020',
    // o pacote do 3D (Three.js) passa de 500 KB, mas baixa depois do texto, sem travar a página
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacidade: resolve(import.meta.dirname, 'politica-de-privacidade/index.html'),
        termos: resolve(import.meta.dirname, 'termos/index.html'),
      },
    },
  },
});
