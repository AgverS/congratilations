import { defineConfig } from 'vite'

export default defineConfig({
  // относительные пути — сборку можно выложить в любую папку/хостинг
  base: './',
  build: { chunkSizeWarningLimit: 900 },
})
