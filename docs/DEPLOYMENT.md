# Deployment — GitHub Pages

The game is a static Vite build served from `https://jxstrr0.github.io/VaultStreet/`.

## One-time setup (owner, on phone or desktop)
1. Create a repository named `VaultStreet` on GitHub (account `Jxstrr0`).
   - The site is public even if the repo is private.
   - GitHub Pro allows Pages from private repos.
2. Add these docs to the repo:
   - `README.md` and `CLAUDE.md` at the root
   - everything else in `docs/`
3. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. Start a Claude Code session on the repo with the first-session prompt in ROADMAP.md. It creates the workflow below as part of Stage 0.

## Vite config
Use a relative base so the build works under `/VaultStreet/`:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
export default defineConfig({ base: './', plugins: [preact()] });
```

No URL routes are used (in-app screen stack), so there are no 404s on refresh.

## Workflow: `.github/workflows/deploy.yml`
Bump action majors and the Node version to the current releases when you create it.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Checks after each deploy
- The Actions tab shows green.
- The live URL loads on iPhone Safari with no console errors.
- A hard refresh still works.

## PWA (built in Stage 10)
- `public/manifest.webmanifest` with `start_url: "./"` and `scope: "./"`, so it works under `/VaultStreet/`. Icons at 192, 512 and maskable are drawn by `scripts/icons.ts`.
- A service worker (`src/app/pwa/sw.js`) is written to `dist/sw.js` at build time by `src/app/pwa/swPlugin.ts`. It precaches every file of that build under a build-versioned cache name. A new deploy downloads in the background (also checked whenever the app comes back to the foreground). If the player is on the title screen with no game loaded, the page switches to it and reloads straight away; mid-game, it waits until they quit to the title, or the next launch.
- Add `?nosw` to the URL to run without the service worker (and unregister an old one) when testing.
- Still to test on a real iPhone: Share → Add to Home Screen, then launch offline.

## Later
- **Hub:** add a Vault Street card in the Longlight hub repo (`Jxstrr0/Kelbo.Website`) in a separate session.
- **Custom domain (optional):** add a CNAME in Pages settings.
