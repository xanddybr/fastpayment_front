import { defineConfig } from 'vite';

export default defineConfig({
  // O 'base' é o segredo. Ele diz ao Vite: 
  // 
  base: '/',
  
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