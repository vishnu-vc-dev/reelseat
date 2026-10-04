import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * In development the API runs on :8080. Proxying /api and /socket.io through
 * Vite keeps everything same-origin, mirroring the production setup where
 * Netlify proxies /api to the backend, so cookies behave identically.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:8080', ws: true, changeOrigin: true },
    },
  },
  build: {
    /**
     * The dashboards bundle the charting library (~200 kB gzipped). They are
     * lazy-loaded routes used only by partners and admins, so customers never
     * download that chunk; the default 500 kB warning is raised accordingly.
     */
    chunkSizeWarningLimit: 800,
  },
});
