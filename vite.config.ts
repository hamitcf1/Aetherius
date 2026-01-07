import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(),
      {
        name: 'copy-redirects',
        closeBundle: () => {
          try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = resolve(__filename, '..');
            const source = resolve(__dirname, 'public/_redirects');
            const dest = resolve(__dirname, 'dist/_redirects');
            copyFileSync(source, dest);
          } catch (e) {
            console.error('Error copying _redirects file:', e);
          }
        },
      },
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
  };
});