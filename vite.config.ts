import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // GitHub Pages base path - замените на ваш репозиторий
    const basePath = process.env.GITHUB_REPOSITORY ? 
      `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/';
    
    return {
      base: basePath,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              three: ['three'],
              r3f: ['@react-three/fiber', '@react-three/drei']
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GITHUB_REPOSITORY': JSON.stringify(process.env.GITHUB_REPOSITORY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '/textures': path.resolve(__dirname, 'public/textures'),
          '/hdri': path.resolve(__dirname, 'public/hdri'),
          '/models': path.resolve(__dirname, 'public/models')
        }
      }
    };
});
