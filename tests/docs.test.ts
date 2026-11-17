import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAMBERS } from '../src/data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../src/data/rooms/expedition';

/**
 * Living-docs checks (C86: "if code and docs disagree, that's a bug"). They catch the drift that
 * is easy to miss by hand: decision ids cited but never recorded, links and screenshots that do
 * not exist, a missing "Next task" pointer, chambers or rooms the docs never mention, and gaps in
 * the AI bug log numbering.
 */
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const rel = join(dir, f);
    return statSync(join(root, rel)).isDirectory() ? files(rel, ext) : ext.test(f) ? [rel] : [];
  });

const LIVING_DOCS = ['README.md', 'docs/GDD.md', 'docs/tasks.md', 'docs/devlog.md', 'docs/implementation-plan.md', 'docs/ASSETS.md', 'docs/expedition-rooms-draft.md'];
const decisionLog = read('docs/design-decision-log.md');

describe('living docs are in sync (C86)', () => {
  it('every decision id cited in code and docs is recorded in the decision log', () => {
    const recorded = new Set([...decisionLog.matchAll(/^\| (C\d+) \|/gm)].map((m) => m[1]));
    const cited = new Map<string, string>();
    for (const f of [...files('src', /\.ts$/), ...LIVING_DOCS]) {
      for (const m of read(f).matchAll(/\bC(\d{1,3})\b/g)) cited.set(`C${m[1]}`, f);
    }
    const missing = [...cited].filter(([id]) => !recorded.has(id)).map(([id, f]) => `${id} (in ${f})`);
    expect(missing).toEqual([]);
  });

  it('every relative link and screenshot path in the docs points at a file that exists', () => {
    const broken: string[] = [];
    for (const f of LIVING_DOCS) {
      const text = read(f);
      for (const m of text.matchAll(/\]\(((?!https?:|#)[^)\s]+)\)/g)) {
        if (!existsSync(join(root, dirname(f), m[1]!))) broken.push(`${f}: link ${m[1]}`);
      }
      for (const m of text.matchAll(/(docs\/screenshots\/[\w.-]+\.png)/g)) {
        if (!existsSync(join(root, m[1]!))) broken.push(`${f}: screenshot ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('tasks.md has exactly one "Next task" pointer', () => {
    expect(read('docs/tasks.md').match(/\*\*Next task →\*\*/g)?.length).toBe(1);
  });

  it('every built chamber is described in the GDD and the README covers every room id', () => {
    const gdd = read('docs/GDD.md');
    for (const def of Object.values(CHAMBERS)) expect(gdd, `${def.id} "${def.name}" missing from the GDD`).toContain(def.name);
    const readme = read('README.md');
    for (const room of [START_ROOM, REWARD_ROOM, EXIT_ROOM, ...CONNECTORS]) expect(readme, `room ${room.id} missing from the README`).toContain(`\`${room.id}\``);
  });

  it('the AI bug log is numbered 1..N with no gaps or duplicates', () => {
    const numbers = [...read('docs/devlog.md').matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it('one gameplay screenshot per working day so far (Day 2 onward; Day 1 shows design artefacts)', () => {
    const shots = readdirSync(join(root, 'docs/screenshots'));
    const days = new Set(shots.map((s) => /^day(\d+)-/.exec(s)?.[1]).filter(Boolean));
    const devlogDays = [...read('docs/devlog.md').matchAll(/^## Day (\d+)/gm)].map((m) => m[1]);
    for (const d of devlogDays) expect(days.has(d), `no screenshot for Day ${d}`).toBe(true);
  });
});
