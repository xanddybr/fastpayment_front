import { defineConfig } from 'vite';

export default defineConfig({
  // O 'base' é o segredo. Ele diz ao Vite: 
  // "Adicione /agenda/ na frente de todos os caminhos de arquivos"
  base: '/agenda/', 
  
  server: {
    // Configurações para o seu teste local
    port: 5173,
    strictPort: true,
  },
  build: {
    // Garante que o build vá para a pasta certa se você precisar
    outDir: 'dist',
  }
});