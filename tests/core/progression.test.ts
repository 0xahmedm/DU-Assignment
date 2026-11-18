import { describe, expect, it } from 'vitest';
import type { Ability, ChamberDef, ChamberId } from '../../src/core/chamber/types';
import {
  abilitiesOf,
  buildGraph,
  frontier,
  isComplete,
  isUnlocked,
  loadProgress,
  newProgress,
  parseProgress,
  resetProgress,
  SAVE_KEY,
  saveProgress,
  sealsOf,
  serializeProgress,
  solve,
  type KeyValueStore,
  type Progress,
} from '../../src/core/run/progression';
import { CHAMBER_GRID, CHAMBERS } from '../../src/data/chambers';

const DEFS = CHAMBER_GRID.flat().map((id) => CHAMBERS[id]!) as (ChamberDef & { id: ChamberId })[];
const G = buildGraph(DEFS);

const solveAll = (ids: ChamberId[], p: Progress = newProgress()) => ids.reduce((acc, id) => solve(G, acc, id).progress, p);

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('progression graph (C20, C21, C23) on the real chamber data', () => {
  it('the final chamber is P-H', () => {
    expect(G.finalId).toBe('P-H');
  });

  it('every prerequisite exists, and solving the frontier one by one reaches the final chamber last', () => {
    for (const c of DEFS) for (const pre of c.prerequisites) expect(CHAMBERS[pre], `${c.id} needs ${pre}`).toBeDefined();
    let p = newProgress();
    const order: ChamberId[] = [];
    while (frontier(G, p).length > 0) {
      const next = frontier(G, p)[0]!;
      order.push(next);
      p = solve(G, p, next).progress;
    }
    expect(order).toHaveLength(9);
    expect(order.at(-1)).toBe('P-H');
    expect(isComplete(G, p)).toBe(true);
  });

  it('a fresh save starts with the three Easys, W-E first (C20, C22)', () => {
    expect(frontier(G, newProgress())).toEqual(['W-E', 'L-E', 'P-E']);
  });

  it('the frontier deals easiest first', () => {
    expect(frontier(G, solveAll(['W-E']))).toEqual(['L-E', 'P-E', 'W-M']);
  });

  it('each Medium grants one ability, three different ones (C23)', () => {
    const grants = DEFS.filter((c) => c.difficulty === 'medium').map((c) => c.grants);
    expect(grants.sort()).toEqual(['bolt', 'dash', 'throw']);
    expect(DEFS.filter((c) => c.difficulty !== 'medium' && c.grants)).toEqual([]);
  });

  it('Easys and Mediums need only the base kit; a Hard only uses abilities its prerequisites guarantee (C23)', () => {
    const guaranteed = (id: ChamberId): Set<Ability> => {
      const c = CHAMBERS[id]!;
      const out = new Set<Ability>(c.grants ? [c.grants] : []);
      for (const pre of c.prerequisites) for (const a of guaranteed(pre)) out.add(a);
      return out;
    };
    for (const c of DEFS) {
      if (c.difficulty !== 'hard') {
        expect(c.kit, c.id).toEqual([]);
        continue;
      }
      const have = new Set<Ability>();
      for (const pre of c.prerequisites) for (const a of guaranteed(pre)) have.add(a);
      for (const a of c.kit) expect(have.has(a), `${c.id} uses ${a}`).toBe(true);
    }
  });

  it('seals: W-H = 1, L-H = 2, P-H = 3; the final chamber opens only once the first two are restored (C21)', () => {
    expect(DEFS.filter((c) => c.seal).map((c) => [c.id, c.seal])).toEqual([['W-H', 1], ['L-H', 2], ['P-H', 3]]);
    // Everything except P-H solved, in any order that respects the graph:
    const allButFinal = solveAll(['W-E', 'L-E', 'P-E', 'W-M', 'L-M', 'P-M', 'W-H', 'L-H']);
    expect(sealsOf(G, allButFinal)).toEqual([1, 2]);
    expect(isUnlocked(G, allButFinal, 'P-H')).toBe(true);
    // Without either Hard, it stays locked.
    expect(isUnlocked(G, solveAll(['W-E', 'L-E', 'P-E', 'W-M', 'L-M', 'P-M', 'W-H']), 'P-H')).toBe(false);
    expect(isUnlocked(G, solveAll(['W-E', 'L-E', 'P-E', 'W-M', 'L-M', 'P-M', 'L-H']), 'P-H')).toBe(false);
  });
});

describe('solving a chamber', () => {
  it('reports what it gave: an ability, new unlocks', () => {
    const r = solve(G, solveAll(['W-E', 'P-E']), 'W-M');
    expect(r.first).toBe(true);
    expect(r.ability).toBe('throw');
    expect(r.unlocked).toEqual(['W-H']);
    expect(abilitiesOf(G, r.progress)).toEqual(['throw']);
  });

  it('a Hard restores its seal; the final chamber completes the game', () => {
    const before = solveAll(['W-E', 'L-E', 'P-E', 'W-M', 'L-M', 'P-M', 'W-H']);
    const lh = solve(G, before, 'L-H');
    expect(lh.seal).toBe(2);
    expect(lh.unlocked).toEqual(['P-H']);
    expect(lh.completed).toBe(false);
    const ph = solve(G, lh.progress, 'P-H');
    expect(ph.seal).toBe(3);
    expect(ph.completed).toBe(true);
    expect(sealsOf(G, ph.progress)).toEqual([1, 2, 3]);
  });

  it('solving again gives nothing new', () => {
    const p = solveAll(['W-E']);
    const again = solve(G, p, 'W-E');
    expect(again.first).toBe(false);
    expect(again.progress).toBe(p);
  });
});

describe('save, load, reset (C76)', () => {
  it('round-trips through a store', () => {
    const store = memoryStore();
    const p = solveAll(['W-E', 'W-M']);
    expect(saveProgress(store, p)).toBe(true);
    expect(loadProgress(G, store)).toEqual(p);
  });

  it('an empty store, garbage or another version give fresh progress', () => {
    expect(loadProgress(G, memoryStore())).toEqual(newProgress());
    expect(parseProgress(G, '{not json')).toEqual(newProgress());
    expect(parseProgress(G, JSON.stringify({ version: 99, solved: ['W-E'] }))).toEqual(newProgress());
    expect(parseProgress(G, JSON.stringify({ version: 1, solved: 'W-E' }))).toEqual(newProgress());
  });

  it('unknown chamber ids and duplicates are dropped', () => {
    expect(parseProgress(G, JSON.stringify({ version: 1, solved: ['W-E', 'X-9', 'W-E', 7] }))).toEqual({ solved: ['W-E'] });
  });

  it('blocked storage never breaks the game: loads as fresh, saves report failure', () => {
    expect(loadProgress(G, brokenStore)).toEqual(newProgress());
    expect(saveProgress(brokenStore, solveAll(['W-E']))).toBe(false);
    expect(resetProgress(brokenStore)).toEqual(newProgress());
    expect(saveProgress(undefined, newProgress())).toBe(false);
  });

  it('reset forgets everything', () => {
    const store = memoryStore();
    saveProgress(store, solveAll(['W-E', 'W-M']));
    expect(resetProgress(store)).toEqual(newProgress());
    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect(loadProgress(G, store)).toEqual(newProgress());
  });

  it('the save is small and readable', () => {
    expect(serializeProgress(solveAll(['W-E']))).toBe('{"version":1,"solved":["W-E"]}');
  });
});
