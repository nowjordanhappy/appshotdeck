import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths: the same build works locally and at the GitHub Pages subpath (/appshotdeck/)
  base: './',
})
