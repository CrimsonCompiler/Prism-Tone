import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* The FastAPI service in backend/ answers on :8000. The preview page calls
     /api/preview/series; proxying here keeps the browser same-origin in dev
     and `vite preview`. A deployed build can point VITE_PREVIEW_API at the
     hosted API instead (direct NASA POWER remains the fallback). */
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stories: resolve(__dirname, 'stories.html'),
        system: resolve(__dirname, 'system.html'),
        team: resolve(__dirname, 'team.html'),
        concept: resolve(__dirname, 'concept.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
})
