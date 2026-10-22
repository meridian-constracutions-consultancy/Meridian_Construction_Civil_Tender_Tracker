// @ts-nocheck
import { defineConfig } from 'C:/Users/pc/tender_frontend_env/node_modules/vite/dist/node/index.js';
import react from 'C:/Users/pc/tender_frontend_env/node_modules/@vitejs/plugin-react/dist/index.js';

export default defineConfig({
  root: 'G:/My Drive/Tender Website/frontend',
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'react/jsx-runtime', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/react/jsx-runtime.js' },
      { find: 'react/jsx-dev-runtime', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/react/jsx-dev-runtime.js' },
      { find: 'react-dom/client', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/react-dom/client.js' },
      { find: 'react', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/react/index.js' },
      { find: 'react-dom', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/react-dom/index.js' },
      { find: 'lucide-react', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/lucide-react/dist/cjs/lucide-react.js' },
      { find: 'clsx', replacement: 'C:/Users/pc/tender_frontend_env/node_modules/clsx/dist/clsx.js' },
    ],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
