import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Clean-architecture guard (C85). Complements the ESLint rule so the build fails either way.
const ROOT = join(__dirname, '..');

function tsFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(tsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const importsOf = (source: string): string[] =>
  [...source.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1] as string);

describe('architecture: dependency rule', () => {
  const coreFiles = tsFiles(join(ROOT, 'src', 'core'));

  it('has core files to check', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  it.each(coreFiles.map((f) => [relative(ROOT, f), f]))('%s is engine-free', (_name, file) => {
    const src = readFileSync(file, 'utf-8');
    for (const spec of importsOf(src)) {
      expect(spec, 'core must not import Phaser').not.toMatch(/^phaser/);
      expect(spec, 'core must not import game/ or data/').not.toMatch(/(^|\/)(game|data)(\/|$)/);
    }
    expect(src, 'core must not touch browser globals').not.toMatch(
      /\b(window|document|localStorage|navigator)\s*\./,
    );
  });
});
