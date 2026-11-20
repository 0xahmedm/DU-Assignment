import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/run/progression';
import { loadBest, recordRemixTime, REMIX_BEST_KEY } from '../../src/core/run/records';
import { newRun, takeUpgrade } from '../../src/core/run/upgrades';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('Remix best time (C71)', () => {
  it('the first finished run sets the best; only a faster run beats it', () => {
    const store = memoryStore();
    expect(loadBest(store)).toBeUndefined();
    expect(recordRemixTime(store, 400_000)).toEqual({ best: 400_000, improved: true });
    expect(recordRemixTime(store, 450_000)).toEqual({ best: 400_000, improved: false });
    expect(recordRemixTime(store, 400_000)).toEqual({ best: 400_000, improved: false }); // a tie is not a new best
    expect(recordRemixTime(store, 380_500)).toEqual({ best: 380_500, improved: true });
    expect(loadBest(store)).toBe(380_500);
  });

  it('ignores garbage and zero times; blocked storage is harmless', () => {
    const store = memoryStore();
    store.data.set(REMIX_BEST_KEY, 'soon');
    expect(loadBest(store)).toBeUndefined();
    expect(recordRemixTime(store, 0).improved).toBe(false);
    const broken: KeyValueStore = {
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
    expect(loadBest(broken)).toBeUndefined();
    expect(recordRemixTime(broken, 1000)).toEqual({ best: 1000, improved: true });
  });
});

describe('run time', () => {
  it('a run starts at 0 and keeps its time through upgrades', () => {
    const run = { ...newRun(1), timeMs: 12_345 };
    expect(newRun(1).timeMs).toBe(0);
    expect(takeUpgrade(run, 'guard').timeMs).toBe(12_345);
  });
});
