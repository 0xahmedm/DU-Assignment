import { describe, expect, it } from 'vitest';
import type { ChamberId } from '../../src/core/chamber/types';
import { dealChambers, generateRun, newSeed, runAbilities } from '../../src/core/run/generator';
import { endlessLevel, endlessStep, LOOP } from '../../src/core/run/endless';
import { cycled } from '../../src/core/run/rng';
import { abilitiesOf, buildGraph, frontier, isComplete, newProgress, solve, type ChamberInfo, type Progress } from '../../src/core/run/progression';
import { gainAbility, newRun, offersFor, takeUpgrade } from '../../src/core/run/upgrades';
import { CHAMBER_GRID, CHAMBERS } from '../../src/data/chambers';
import { CONNECTORS } from '../../src/data/rooms/expedition';

const G = buildGraph(CHAMBER_GRID.flat().map((id) => CHAMBERS[id]! as ChamberInfo));
const CONNECTOR_IDS = CONNECTORS.map((c) => c.id);
const solveAll = (ids: ChamberId[]): Progress => ids.reduce((p, id) => solve(G, p, id).progress, newProgress());
const difficulty = (id: ChamberId) => CHAMBERS[id]!.difficulty;
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);
/** Winning runs needed to solve all twelve (measured; pinned so a change in dealing is noticed). */
const RUNS_TO_FINISH = 4;

describe('run generator (C8, C12, C15, C112)', () => {
  it('builds Start → [connector → connector → chamber → reward] × 4 → exit: 18 rooms', () => {
    const plan = generateRun(G, newProgress(), 42, CONNECTOR_IDS);
    expect(plan.steps.map((s) => s.kind)).toEqual([
      'start',
      'connector', 'connector', 'chamber', 'reward',
      'connector', 'connector', 'chamber', 'reward',
      'connector', 'connector', 'chamber', 'reward',
      'connector', 'connector', 'chamber', 'reward',
      'exit',
    ]);
    expect(plan.steps).toHaveLength(18);
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

  it('uses every connector before repeating one, and never the same one twice in a row', () => {
    for (const s of SEEDS) {
      const ids = generateRun(G, newProgress(), s, CONNECTOR_IDS).steps.flatMap((x) => (x.kind === 'connector' ? [x.roomId] : []));
      expect(ids).toHaveLength(8);
      expect(new Set(ids.slice(0, CONNECTOR_IDS.length)).size).toBe(CONNECTOR_IDS.length);
      for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    }
  });
});

describe('dealing chambers (C11, C20, C22)', () => {
  it('the first run starts with W-E and deals all four Easys', () => {
    for (const s of SEEDS) {
      const dealt = dealChambers(G, newProgress(), s);
      expect(dealt[0]).toBe('W-E');
      expect([...dealt].sort()).toEqual(['G-E', 'L-E', 'P-E', 'W-E']);
    }
  });

  it('deals only from the frontier, easiest first', () => {
    const progresses = [solveAll(['W-E']), solveAll(['W-E', 'L-E']), solveAll(['W-E', 'L-E', 'P-E', 'W-M'])];
    for (const p of progresses) {
      for (const s of SEEDS.slice(0, 50)) {
        const dealt = dealChambers(G, p, s);
        const open = frontier(G, p);
        expect(dealt.every((id) => open.includes(id))).toBe(true);
        expect(dealt).toHaveLength(Math.min(4, open.length));
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
    expect(generateRun(G, p, 5, CONNECTOR_IDS).steps.map((s) => s.kind)).toEqual(['start', 'connector', 'connector', 'chamber', 'reward', 'exit']);
  });

  it('about four runs cover all twelve chambers when every run is won (C8, C104, C112)', () => {
    let p = newProgress();
    let runs = 0;
    while (frontier(G, p).length > 0 && runs < 10) {
      for (const id of dealChambers(G, p, runs + 1)) p = solve(G, p, id).progress;
      runs++;
    }
    expect(p.solved).toHaveLength(12);
    expect(runs).toBe(RUNS_TO_FINISH);
  });

  it('with everything solved there is nothing to deal, except in Remix', () => {
    const all = solveAll(['W-E', 'L-E', 'P-E', 'G-E', 'W-M', 'L-M', 'P-M', 'G-M', 'W-H', 'L-H', 'G-H', 'P-H']);
    expect(() => generateRun(G, all, 1, CONNECTOR_IDS)).toThrow(/Remix/);
    const remix = generateRun(G, all, 1, CONNECTOR_IDS, true);
    expect(remix.chambers).toHaveLength(4);
    expect(new Set(remix.chambers).size).toBe(4);
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

describe('endless runs (C113)', () => {
  const IDS = CHAMBER_GRID.flat();
  const steps = (seed: number, n: number) => Array.from({ length: n }, (_, i) => endlessStep(seed, i, IDS, CONNECTOR_IDS));

  it('keeps the rhythm Start → [combat × 2 → chamber → reward] forever, deterministically', () => {
    const run = steps(42, 1 + LOOP * 30);
    expect(run[0]).toEqual({ kind: 'start' });
    run.slice(1).forEach((s, k) => expect(s.kind).toBe(['connector', 'connector', 'chamber', 'reward'][k % LOOP]));
    expect(steps(42, 40)).toEqual(steps(42, 40));
    expect(JSON.stringify(steps(43, 40))).not.toBe(JSON.stringify(steps(42, 40)));
  });

  it('deals all twelve chambers before repeating one, never the same chamber or connector twice in a row', () => {
    const run = steps(7, 1 + LOOP * 30);
    const chambers = run.flatMap((s) => (s.kind === 'chamber' ? [s.id] : []));
    expect(new Set(chambers.slice(0, 12)).size).toBe(12);
    for (let i = 1; i < chambers.length; i++) expect(chambers[i]).not.toBe(chambers[i - 1]);
    const connectors = run.flatMap((s) => (s.kind === 'connector' ? [s.roomId] : []));
    for (let i = 1; i < connectors.length; i++) expect(connectors[i]).not.toBe(connectors[i - 1]);
  });

  it('gets harder in the fighting: T2, then T3, then +1 hit and +10% speed per level (speed capped; C115)', () => {
    expect(endlessLevel(0)).toEqual({ level: 0, tier: 'T2', extraHp: 0, speedScale: 1 });
    expect(endlessLevel(LOOP)).toMatchObject({ level: 1, tier: 'T3', extraHp: 0, speedScale: 1 });
    expect(endlessLevel(LOOP * 3).extraHp).toBe(2);
    // The tester's 36-room run: level 9, enemies take 8 extra hits (was 4 before the rebalance).
    expect(endlessLevel(36)).toMatchObject({ level: 9, extraHp: 8 });
    expect(endlessLevel(LOOP * 3).speedScale).toBeCloseTo(1.2);
    expect(endlessLevel(LOOP * 100).speedScale).toBe(1.6);
    expect(endlessLevel(LOOP * 101).extraHp).toBeGreaterThan(endlessLevel(LOOP * 9).extraHp);
  });
});

describe('cycled picks (C112)', () => {
  it('uses every item once per cycle and never repeats back to back', () => {
    const items = ['a', 'b', 'c'];
    const out = cycled(items, 99, 30);
    for (let c = 0; c < 10; c++) expect([...out.slice(c * 3, c * 3 + 3)].sort()).toEqual(items);
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
  });
});

describe('ability upgrades in a run (C67, C117)', () => {
  it('a reward room offers an ability upgrade only once the save owns that ability, and may right after its Medium', () => {
    let fresh = 0;
    for (const s of SEEDS.slice(0, 60)) {
      let progress = newProgress();
      for (let r = 0; r < RUNS_TO_FINISH + 1 && !isComplete(G, progress); r++) {
        const plan = generateRun(G, progress, s + r, CONNECTOR_IDS);
        let run = newRun(plan.seed, runAbilities(G, progress, plan.remix));
        let justGained: string | undefined;
        for (const step of plan.steps) {
          if (step.kind === 'chamber') {
            const result = solve(G, progress, step.id);
            progress = result.progress;
            run = gainAbility(run, result.ability);
            justGained = result.ability;
          } else if (step.kind === 'reward') {
            const offer = offersFor(run);
            const owned = abilitiesOf(G, progress);
            for (const u of offer) if (u.needs) expect(owned).toContain(u.needs);
            if (justGained && offer.some((u) => u.needs === justGained)) fresh++;
            run = takeUpgrade(run, offer[0]!.id);
            justGained = undefined;
          }
        }
      }
    }
    // The case the unlock card exists for: the new ability's upgrade dealt in the very next room.
    expect(fresh).toBeGreaterThan(0);
  });
});
