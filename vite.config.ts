import { defineConfig } from 'vite'

export default defineConfig({
  // пути от корня: открытки живут на /babushka, /mama, /tetya
  base: '/',
  build: { chunkSizeWarningLimit: 900 },
})
