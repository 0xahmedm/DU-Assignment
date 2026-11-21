import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/run/progression';
import {
  addDefeat,
  addReset,
  addTime,
  clearLog,
  finish,
  formatReport,
  formatTime,
  loadLog,
  MAX_RECORDS,
  parseLog,
  saveLog,
  serializeLog,
  startAttempt,
  TELEMETRY_KEY,
  type Attempt,
} from '../../src/core/run/telemetry';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

const attempt = (id: string, over: Partial<Attempt> = {}): Attempt => ({
  ...startAttempt({ id, kind: 'chamber', mode: 'select', started: '2026-11-19T14:03:00.000Z' }),
  ...over,
});

describe('an attempt (C81)', () => {
  it('adds up time, resets, defeats and hearts lost, then ends with an outcome', () => {
    let a = startAttempt({ id: 'W-E', kind: 'chamber', mode: 'expedition', seed: 42, started: '2026-11-19T14:03:00.000Z' });
    a = addTime(a, 1000);
    a = addTime(a, 500);
    a = addTime(a, -20); // never negative
    a = addReset(a);
    a = addDefeat(a, true);
    a = addDefeat(a, false);
    a = finish(a, 'solved');
    expect(a).toMatchObject({ timeMs: 1500, resets: 1, defeats: 2, heartsLost: 1, outcome: 'solved', seed: 42 });
  });
});

describe('the log', () => {
  it('round-trips through a store and survives garbage', () => {
    const store = memoryStore();
    const log = [attempt('W-E', { outcome: 'solved', timeMs: 95_000 }), attempt('room:arena', { kind: 'room', outcome: 'left' })];
    expect(saveLog(store, log)).toBe(true);
    expect(loadLog(store)).toEqual(log);
    expect(parseLog('{nope')).toEqual([]);
    expect(parseLog(JSON.stringify({ version: 2, attempts: [] }))).toEqual([]);
    expect(parseLog(JSON.stringify({ version: 1, attempts: [{ id: 'W-E', timeMs: 5 }, { bogus: true }, null] }))).toHaveLength(1);
  });

  it('keeps only the newest records', () => {
    const many = Array.from({ length: MAX_RECORDS + 10 }, (_, i) => attempt(`r${i}`));
    const kept = parseLog(serializeLog(many));
    expect(kept).toHaveLength(MAX_RECORDS);
    expect(kept[0]!.id).toBe('r10');
  });

  it('clearing removes it; blocked storage is harmless', () => {
    const store = memoryStore();
    saveLog(store, [attempt('W-E')]);
    clearLog(store);
    expect(store.data.has(TELEMETRY_KEY)).toBe(false);
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
    expect(loadLog(broken)).toEqual([]);
    expect(saveLog(broken, [])).toBe(false);
    expect(() => clearLog(broken)).not.toThrow();
  });
});

describe('the report', () => {
  it('formats times as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(95_000)).toBe('1:35');
    expect(formatTime(600_400)).toBe('10:00');
  });

  it('lists every attempt and sums each chamber', () => {
    const log = [
      attempt('W-E', { timeMs: 120_000, resets: 2, outcome: 'left' }),
      attempt('W-E', { timeMs: 60_000, resets: 1, defeats: 1, outcome: 'solved' }),
      attempt('room:arena', { kind: 'room', mode: 'expedition', seed: 42, defeats: 2, heartsLost: 2, timeMs: 30_000, outcome: 'run-over' }),
    ];
    const report = formatReport(log, '2026-11-19 15:00', (id) => (id === 'W-E' ? 'W-E First Weight' : id));
    expect(report).toContain('3 attempts');
    expect(report).toContain('| 1 | 14:03 | W-E First Weight | select |  | left | 2:00 | 2 | 0 | 0 |');
    expect(report).toContain('| 3 | 14:03 | room:arena | expedition | 42 | run-over | 0:30 | 0 | 2 | 2 |');
    // Per chamber: 2 attempts, 1 solved, 3:00 in total, best solve 1:00, 3 resets, 1 defeat.
    expect(report).toContain('| W-E First Weight | 2 | 1 | 3:00 | 1:00 | 3 | 1 | 0 |');
    expect(report).toContain('| room:arena | 1 | 0 | 0:30 | – | 0 | 2 | 2 |');
  });

  it('says so when nothing was recorded', () => {
    expect(formatReport([], 'now')).toContain('No attempts recorded yet.');
  });
});
