import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/timeline',
  plugins: [svelte()],
  build: {
    rollupOptions: {
      external: ['/config.js', '/timeline/config.js']
    }
  }
})
