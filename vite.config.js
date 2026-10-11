import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stories: resolve(__dirname, 'stories.html'),
        system: resolve(__dirname, 'system.html'),
        team: resolve(__dirname, 'team.html'),
        concept: resolve(__dirname, 'concept.html'),
      },
    },
  },
})
