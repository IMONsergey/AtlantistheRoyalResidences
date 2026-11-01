import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || process.env.SITE_URL,
  output: 'static',
  adapter: vercel(),
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  server: { port: 4322 },
  vite: { build: { target: 'es2022' } },
});
