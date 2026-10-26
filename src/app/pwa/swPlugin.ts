// Vite plugin (runs in Node at build time only): after `vite build` writes
// dist/, lists the built files and writes dist/sw.js from the src/app/pwa/sw.js
// template with this build's precache list and cache version. Dev and tests
// never see a service worker. See precache.ts for the rules.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { cacheVersion, fillWorker, precacheList, type BuiltFile } from './precache.ts';

function walk(dir: string, root: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).split('\\').join('/'));
  }
  return out;
}

export function serviceWorkerPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'frontierlab-service-worker',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const urls = precacheList(walk(outDir, outDir, []));
      const files: BuiltFile[] = urls.map((u) => ({
        path: u.slice(2),
        bytes: readFileSync(join(outDir, u.slice(2))),
      }));
      const template = readFileSync(resolve(config.root, 'src/app/pwa/sw.js'), 'utf8');
      writeFileSync(join(outDir, 'sw.js'), fillWorker(template, cacheVersion(files), urls));
    },
  };
}
