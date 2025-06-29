import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          // Notify the renderer process to reload the page
          // when the preload script is built
          options.reload()
        },
      },
    ]),
  ],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
})
