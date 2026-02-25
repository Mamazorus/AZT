import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/REPO_NAME/', // ← remplace REPO_NAME par le nom exact de ton dépôt GitHub
  server: {
    port: 3000
  }
})
