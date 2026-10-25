import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Only pin genuinely shared, always-loaded vendor libraries here.
            // Everything else intentionally falls through to Rollup's default
            // chunking, which correctly splits a dependency that's only
            // reachable through a lazy-loaded route (e.g. recharts/date-fns,
            // used solely by the lazy admin Analytics/Shipping tabs) into its
            // own async chunk -- a blanket "vendor" catch-all here would force
            // those into the main chunk every storefront visitor downloads.
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
            }
          }
        }
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR on by default; set DISABLE_HMR=true to opt out.
      hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
