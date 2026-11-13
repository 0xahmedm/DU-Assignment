import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef, PhaseColor } from '../../src/core/chamber/types';
import { reachFrom, type ReachWorld } from '../../src/core/player/reach';
import { W_E } from '../../src/data/chambers/W-E';
import { W_H } from '../../src/data/chambers/W-H';
import { MOVEMENT_TEST_ROOM } from '../../src/data/rooms/movementTest';

const gridWorld = (grid: readonly string[]): ReachWorld => ({
  width: grid[0]!.length,
  height: grid.length,
  isSolid: (r, c) => (grid[r]?.[c] ?? '#') === '#',
});

/** A chamber frozen in one phase, with every door either open or as the logic starts it. */
export const chamberWorld = (def: ChamberDef, phase: PhaseColor, doors: 'open' | 'initial' = 'initial'): ReachWorld => {
  const { model } = parseChamber(def);
  const logic = new ChamberLogic(model!);
  logic.phase = phase;
  const doorCells = new Set(
    model!.devices.filter((d) => ['door', 'trapdoor', 'exit'].includes(d.kind)).flatMap((d) => d.cells.map(([r, c]) => `${r},${c}`)),
  );
  return {
    width: model!.width,
    height: model!.height,
    isSolid: (r, c) => (doors === 'open' && doorCells.has(`${r},${c}`) ? false : logic.isSolid(r, c)),
  };
};

/** Two floors split by a gap of `gap` tiles over a pit too deep to climb out of. */
const gapWorld = (gap: number) => {
  const w = 6 + gap + 6;
  const row = (fill: (c: number) => boolean) => [...Array(w).keys()].map((c) => (c === 0 || c === w - 1 || fill(c) ? '#' : '.')).join('');
  const inGap = (c: number) => c >= 6 && c < 6 + gap;
  return gridWorld([
    '#'.repeat(w),
    ...Array.from({ length: 6 }, () => row(() => false)),
    row((c) => !inGap(c)), // row 7: the two floors
    ...Array.from({ length: 6 }, () => row((c) => !inGap(c))),
    '#'.repeat(w), // pit floor at row 14: 6 deep
  ]);
};

describe('reachability checker, calibrated on the C29 metrics', () => {
  it('without a crate: clears a 4-gap, never a 5-gap', () => {
    expect(reachFrom(gapWorld(4), { row: 7, col: 2 }).canReach(7, 12)).toBe(true);
    expect(reachFrom(gapWorld(5), { row: 7, col: 2 }).canReach(7, 13)).toBe(false);
  });

  it('carrying: clears a 3-gap, never a 4-gap', () => {
    expect(reachFrom(gapWorld(3), { row: 7, col: 2 }, { carrying: true }).canReach(7, 11)).toBe(true);
    expect(reachFrom(gapWorld(4), { row: 7, col: 2 }, { carrying: true }).canReach(7, 12)).toBe(false);
  });

  it('movement test room: climbs pillars 2 and 3; pillar 4 only by way of pillar 3', () => {
    const r = reachFrom(gridWorld(MOVEMENT_TEST_ROOM.grid), { row: 15, col: 2 });
    expect(r.canReach(13, 4)).toBe(true);
    expect(r.canReach(12, 9)).toBe(true);
    expect(r.canReach(11, 14)).toBe(true);
  });

  it('heights: 3 high yes, 4 high no; carrying 2 high yes, 3 high no', () => {
    const step = (h: number) =>
      gridWorld([
        '##########',
        ...Array.from({ length: 8 - h }, () => '#........#'),
        ...Array.from({ length: h }, () => '#.....####'),
        '##########',
      ]);
    expect(reachFrom(step(3), { row: 9, col: 2 }).canReach(9 - 3, 7)).toBe(true);
    expect(reachFrom(step(4), { row: 9, col: 2 }).canReach(9 - 4, 7)).toBe(false);
    expect(reachFrom(step(2), { row: 9, col: 2 }, { carrying: true }).canReach(9 - 2, 7)).toBe(true);
    expect(reachFrom(step(3), { row: 9, col: 2 }, { carrying: true }).canReach(9 - 3, 7)).toBe(false);
  });

});

describe('reachability: W-E (solved in the game on Day 2)', () => {
  it('the 3-high crate ledge is reachable without a crate', { timeout: 30000 }, () => {
    expect(reachFrom(chamberWorld(W_E, 'red'), { row: 11, col: 2 }).canReach(8, 12)).toBe(true);
  });
});

describe('reachability: W-H (C92 revision)', () => {
  // These flood the whole chamber several times: slower than the other unit tests.
  it('in Blue the crate can be carried up to L; in Red L is out of reach, with or without it', { timeout: 30000 }, () => {
    const start = { row: 19, col: 2 };
    expect(reachFrom(chamberWorld(W_H, 'blue'), start, { carrying: true }).canReach(7, 15)).toBe(true);
    expect(reachFrom(chamberWorld(W_H, 'red'), start, { carrying: true }).canReach(7, 15)).toBe(false);
    expect(reachFrom(chamberWorld(W_H, 'red'), start).canReach(7, 15)).toBe(false);
  });

  it('the exit floor is never a dead end: it connects to the left floor in both colours', { timeout: 30000 }, () => {
    expect(reachFrom(chamberWorld(W_H, 'red'), { row: 19, col: 28 }).canReach(19, 5)).toBe(true);
    expect(reachFrom(chamberWorld(W_H, 'blue'), { row: 19, col: 28 }).canReach(19, 5)).toBe(true);
  });

  it('from L in Red: the player can jump to the red platform, but cannot carry the crate there (Throw is needed)', { timeout: 30000 }, () => {
    expect(reachFrom(chamberWorld(W_H, 'red'), { row: 7, col: 15 }).canReach(7, 7)).toBe(true);
    expect(reachFrom(chamberWorld(W_H, 'red'), { row: 7, col: 15 }, { carrying: true }).canReach(7, 7)).toBe(false);
  });
});
