import { describe, expect, it } from 'vitest';
import type { ChamberId } from '../../src/core/chamber/types';
import { dealChambers, generateRun, newSeed, runAbilities } from '../../src/core/run/generator';
import { buildGraph, frontier, newProgress, solve, type ChamberInfo, type Progress } from '../../src/core/run/progression';
import { CHAMBER_GRID, CHAMBERS } from '../../src/data/chambers';
import { CONNECTORS } from '../../src/data/rooms/expedition';

const G = buildGraph(CHAMBER_GRID.flat().map((id) => CHAMBERS[id]! as ChamberInfo));
const CONNECTOR_IDS = CONNECTORS.map((c) => c.id);
const solveAll = (ids: ChamberId[]): Progress => ids.reduce((p, id) => solve(G, p, id).progress, newProgress());
const difficulty = (id: ChamberId) => CHAMBERS[id]!.difficulty;
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

describe('run generator (C8, C12, C15)', () => {
  it('builds Start → [connector → chamber → reward] × N → exit', () => {
    const plan = generateRun(G, newProgress(), 42, CONNECTOR_IDS);
    expect(plan.steps.map((s) => s.kind)).toEqual([
      'start',
      'connector', 'chamber', 'reward',
      'connector', 'chamber', 'reward',
      'connector', 'chamber', 'reward',
      'exit',
    ]);
    expect(plan.steps.filter((s) => s.kind === 'chamber').map((s) => (s as { id: ChamberId }).id)).toEqual(plan.chambers);
  });

  it('is deterministic: the same seed and progress give the same run', () => {
    const p = solveAll(['W-E']);
    expect(generateRun(G, p, 1234, CONNECTOR_IDS)).toEqual(generateRun(G, p, 1234, CONNECTOR_IDS));
  });

  it('different seeds give different runs (order of chambers and connectors)', () => {
    const p = solveAll(['W-E']);
    const runs = new Set(SEEDS.map((s) => JSON.stringify(generateRun(G, p, s, CONNECTOR_IDS).steps)));
    expect(runs.size).toBeGreaterThan(20);
  });

  it('never repeats a connector within a run, and every connector gets used', () => {
    const used = new Set<string>();
    for (const s of SEEDS) {
      const ids = generateRun(G, newProgress(), s, CONNECTOR_IDS).steps.flatMap((x) => (x.kind === 'connector' ? [x.roomId] : []));
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => used.add(id));
    }
    expect([...used].sort()).toEqual([...CONNECTOR_IDS].sort());
  });
});

describe('dealing chambers (C11, C20, C22)', () => {
  it('the first run starts with W-E and deals two of the other three Easys', () => {
    const seen = new Set<string>();
    for (const s of SEEDS) {
      const dealt = dealChambers(G, newProgress(), s);
      expect(dealt[0]).toBe('W-E');
      expect(dealt).toHaveLength(3);
      for (const id of dealt.slice(1)) {
        expect(['L-E', 'P-E', 'G-E']).toContain(id);
        seen.add(id);
      }
    }
    expect([...seen].sort()).toEqual(['G-E', 'L-E', 'P-E']);
  });

  it('deals only from the frontier, easiest first', () => {
    const progresses = [solveAll(['W-E']), solveAll(['W-E', 'L-E']), solveAll(['W-E', 'L-E', 'P-E', 'W-M'])];
    for (const p of progresses) {
      for (const s of SEEDS.slice(0, 50)) {
        const dealt = dealChambers(G, p, s);
        const open = frontier(G, p);
        expect(dealt.every((id) => open.includes(id))).toBe(true);
        expect(dealt).toHaveLength(Math.min(3, open.length));
        const ranks = dealt.map((id) => ['easy', 'medium', 'hard'].indexOf(difficulty(id)));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        // No harder chamber is dealt while an easier one is left out.
        const left = open.filter((id) => !dealt.includes(id)).map((id) => ['easy', 'medium', 'hard'].indexOf(difficulty(id)));
        if (left.length) expect(Math.min(...left)).toBeGreaterThanOrEqual(Math.max(...ranks));
      }
    }
  });

  it('the final chamber is dealt alone', () => {
    const p = solveAll(['W-E', 'L-E', 'P-E', 'G-E', 'W-M', 'L-M', 'P-M', 'G-M', 'W-H', 'L-H', 'G-H']);
    expect(dealChambers(G, p, 5)).toEqual(['P-H']);
    expect(generateRun(G, p, 5, CONNECTOR_IDS).steps.map((s) => s.kind)).toEqual(['start', 'connector', 'chamber', 'reward', 'exit']);
  });

  it('about five runs cover all twelve chambers when every run is won (C8, C104)', () => {
    let p = newProgress();
    let runs = 0;
    while (frontier(G, p).length > 0 && runs < 10) {
      for (const id of dealChambers(G, p, runs + 1)) p = solve(G, p, id).progress;
      runs++;
    }
    expect(p.solved).toHaveLength(12);
    expect(runs).toBe(5);
  });

  it('with everything solved there is nothing to deal, except in Remix', () => {
    const all = solveAll(['W-E', 'L-E', 'P-E', 'G-E', 'W-M', 'L-M', 'P-M', 'G-M', 'W-H', 'L-H', 'G-H', 'P-H']);
    expect(() => generateRun(G, all, 1, CONNECTOR_IDS)).toThrow(/Remix/);
    const remix = generateRun(G, all, 1, CONNECTOR_IDS, true);
    expect(remix.chambers).toHaveLength(3);
    expect(new Set(remix.chambers).size).toBe(3);
    expect(remix.tier).toBe('T3');
    expect(runAbilities(G, all, true).sort()).toEqual(['bolt', 'dash', 'throw']);
  });
});

describe('encounter tier (R4, C70)', () => {
  it('T1 at first, T2 after a Medium, T3 after a Hard', () => {
    expect(generateRun(G, newProgress(), 1, CONNECTOR_IDS).tier).toBe('T1');
    expect(generateRun(G, solveAll(['W-E', 'W-M']), 1, CONNECTOR_IDS).tier).toBe('T2');
    expect(generateRun(G, solveAll(['W-E', 'P-E', 'W-M', 'W-H']), 1, CONNECTOR_IDS).tier).toBe('T3');
  });
});

describe('seeds', () => {
  it('new seeds are short positive numbers', () => {
    expect(newSeed(() => 0)).toBe(1);
    expect(newSeed(() => 0.999999999)).toBe(999_999);
  });
});
