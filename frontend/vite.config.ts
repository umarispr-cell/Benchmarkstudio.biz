import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Split vendor chunks for better caching and parallel loading
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — rarely changes, cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          // Animation library (~140KB) — used broadly but cacheable
          'vendor-motion': ['framer-motion'],
          // HTTP client
          'vendor-axios': ['axios'],
          // Charts — only needed by CEO dashboard
          'vendor-recharts': ['recharts'],
          // PDF generation — only on button click
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
    // Increase warning limit (chunks are now intentionally split)
    chunkSizeWarningLimit: 600,
    // Target modern browsers for smaller output
    target: 'es2020',
  },
})
