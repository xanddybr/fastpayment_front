import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // O 'base' é o segredo. Ele diz ao Vite:
  //
  base: '/',
  plugins: [react()],

  server: {
    // Configurações para o seu teste local
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  }
});