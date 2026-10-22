import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const isWin = process.platform === 'win32';
const winEnv = 'C:/Users/pc/tender_frontend_env/node_modules';
const useWinEnv = isWin && fs.existsSync(winEnv);

const { defineConfig } = useWinEnv
  ? await import(pathToFileURL(path.join(winEnv, 'vite/dist/node/index.js')).href)
  : await import('vite');

const reactPlugin = useWinEnv
  ? (await import(pathToFileURL(path.join(winEnv, '@vitejs/plugin-react/dist/index.js')).href)).default
  : (await import('@vitejs/plugin-react')).default;

export default defineConfig({
  plugins: [reactPlugin()],
  resolve: useWinEnv
    ? {
        alias: [
          { find: 'react/jsx-runtime', replacement: `${winEnv}/react/jsx-runtime.js` },
          { find: 'react/jsx-dev-runtime', replacement: `${winEnv}/react/jsx-dev-runtime.js` },
          { find: 'react-dom/client', replacement: `${winEnv}/react-dom/client.js` },
          { find: 'react', replacement: `${winEnv}/react/index.js` },
          { find: 'react-dom', replacement: `${winEnv}/react-dom/index.js` },
          { find: 'lucide-react', replacement: `${winEnv}/lucide-react/dist/cjs/lucide-react.js` },
          { find: 'clsx', replacement: `${winEnv}/clsx/dist/clsx.js` },
        ],
      }
    : {},
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
