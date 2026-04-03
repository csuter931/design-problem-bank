import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Shim next/link so 21st.dev components work without Next.js
      'next/link': path.resolve(__dirname, './src/lib/link.tsx'),
    },
  },
})
