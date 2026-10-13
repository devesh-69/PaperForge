import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // On Vercel, fall back to the project's production domain when VITE_SITE_URL is not set,
  // so canonical URLs and Open Graph tags are never silently dropped (see src/seo/site.ts).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL && vercel) process.env.VITE_SITE_URL = `https://${vercel}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
