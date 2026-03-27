import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Website auth update: proxy the shared Nest backend endpoints so the React portal can use the same auth/database locally.
    proxy: {
      '/auth': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
    },
  },
})
