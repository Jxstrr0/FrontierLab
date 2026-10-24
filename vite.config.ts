/// <reference types="vitest/config" />
// Vite build config. `base: './'` keeps every asset path relative so the
// site works under the GitHub Pages sub-path (/VaultStreet/). See docs/DEPLOYMENT.md.
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  base: './',
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
