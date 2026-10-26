/// <reference types="vitest/config" />
// Vite build config. `base: './'` keeps every asset path relative so the
// site works under the GitHub Pages sub-path (/FrontierLab/). See docs/DEPLOYMENT.md.
// The service worker plugin writes dist/sw.js for offline play (src/app/pwa/).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { serviceWorkerPlugin } from './src/app/pwa/swPlugin.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  base: './',
  plugins: [preact(), serviceWorkerPlugin()],
  build: {
    rolldownOptions: {
      // A second entry for `?debug` with a fixed name, so index.html can load it.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        debug: fileURLToPath(new URL('./src/debugEntry.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'debug' ? 'assets/debug.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
