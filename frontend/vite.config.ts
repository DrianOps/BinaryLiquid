import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['bsprotocol.xyz', 'www.bsprotocol.xyz']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/lightweight-charts')) return 'charts';
          if (id.includes('node_modules/@wizardconnect')) return 'wizard';
          if (id.includes('node_modules/nostr-tools') || id.includes('node_modules/@noble')) return 'nostr';
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
