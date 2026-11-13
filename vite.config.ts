import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Dev-server-only endpoint for saving gameplay screenshots into docs/screenshots (daily routine).
 * The page POSTs a PNG data URL (text/plain) to /__screenshot?name=<file>.png. Not part of any build.
 */
function screenshotEndpoint(): Plugin {
  return {
    name: 'dev-screenshot-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__screenshot', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[A-Za-z0-9._-]+\.png$/.test(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const data = body.startsWith('data:') ? body.slice(body.indexOf(',') + 1) : body;
          const dir = join(process.cwd(), 'docs', 'screenshots');
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, name), Buffer.from(data, 'base64'));
          res.end('saved');
        });
      });
    },
  };
}

// `npm run build`        -> dist/        (GitHub Pages; relative paths so it works under /<repo>/)
// `npm run build:single` -> dist-single/ (one self-contained index.html for the zip; opens by double-click)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [screenshotEndpoint(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    emptyOutDir: true,
  },
}));
