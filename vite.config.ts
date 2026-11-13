import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        -> dist/        (GitHub Pages; relative paths so it works under /<repo>/)
// `npm run build:single` -> dist-single/ (one self-contained index.html for the zip; opens by double-click)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    emptyOutDir: true,
  },
}));
