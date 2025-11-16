import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'popup',
    emptyOutDir: false, // Don't delete existing files (index.html, mermaid.min.js, etc.)
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.jsx')
      },
      output: {
        entryFileNames: 'popup.js',
        assetFileNames: 'popup.[ext]',
        format: 'iife',
        name: 'InteractionRecorder'
      }
    },
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});

