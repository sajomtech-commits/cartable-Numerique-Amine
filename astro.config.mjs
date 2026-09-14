import { defineConfig } from 'astro/config';

// Un seul code source, deux cibles :
//  - par défaut : GitHub Pages  (base /cartable-Numerique-Amine)
//  - amine.sagetech.vip : SITE_BASE=/ SITE_URL=https://amine.sagetech.vip npm run build
const base = process.env.SITE_BASE ?? '/cartable-Numerique-Amine';
const site = process.env.SITE_URL ?? 'https://sajomtech-commits.github.io';

export default defineConfig({
  site,
  base,
  build: { format: 'directory' },
});
