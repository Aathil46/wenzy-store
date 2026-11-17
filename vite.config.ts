import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/skills/**', '**/supabase/**', '**/.git/**', '**/node_modules/**']
    }
  }
})
