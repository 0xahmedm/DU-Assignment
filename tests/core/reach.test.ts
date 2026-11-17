import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef, PhaseColor } from '../../src/core/chamber/types';
import { reachFrom, type ReachWorld } from '../../src/core/player/reach';
import { cellsHitBySwing, swingBox } from '../../src/core/combat/melee';
import { W_E } from '../../src/data/chambers/W-E';
import { L_E } from '../../src/data/chambers/L-E';
import { L_H } from '../../src/data/chambers/L-H';
import { L_M } from '../../src/data/chambers/L-M';
import { P_H } from '../../src/data/chambers/P-H';
import { P_M } from '../../src/data/chambers/P-M';
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

describe('reachability: P-M (C47, C95)', () => {
  // World coordinates: the tower is shifted down 5 rows by the stitching (its floor is row 24).
  const red = () => chamberWorld(P_M, 'red');
  const blue = () => chamberWorld(P_M, 'blue');

  it('tower: each stage reaches exactly the next foothold in the right colour', { timeout: 30000 }, () => {
    expect(reachFrom(red(), { row: 24, col: 2 }).canReach(19, 6)).toBe(false); // nub 1 not from the floor in Red
    const b1 = reachFrom(blue(), { row: 24, col: 2 });
    expect(b1.canReach(21, 3) && b1.canReach(19, 6)).toBe(true); // blue platform, then nub 1
    expect(b1.canReach(14, 12)).toBe(false); // nub 2 not in Blue
    const r1 = reachFrom(red(), { row: 19, col: 6 });
    expect(r1.canReach(16, 9) && r1.canReach(14, 12)).toBe(true); // red platform, then nub 2
    expect(r1.canReach(8, 12)).toBe(false); // exit ledge not in Red
    expect(reachFrom(blue(), { row: 14, col: 12 }).canReach(8, 12)).toBe(true); // blue platform, exit ledge
  });

  it('bridge: in Blue the exit side is out of reach (chasm escapes only to the entry); in Red the bridge leads there', { timeout: 30000 }, () => {
    expect(reachFrom(blue(), { row: 8, col: 17 }).canReach(8, 33)).toBe(false);
    expect(reachFrom(blue(), { row: 12, col: 28 }).canReach(8, 17)).toBe(true);
    expect(reachFrom(red(), { row: 8, col: 17 }).canReach(8, 33)).toBe(true);
  });
});

describe('reachability: L-E (C39)', () => {
  it('section B: the floating platform next to the mirror can be climbed from the floor', { timeout: 30000 }, () => {
    expect(reachFrom(chamberWorld(L_E, 'red'), { row: 11, col: 21 }).canReach(8, 27)).toBe(true);
  });
});

describe('reachability: L-M (C40)', () => {
  it('the gallery (through the hole), both ends of it, the step beside M1 and the exit floor are reachable from the start', { timeout: 30000 }, () => {
    const r = reachFrom(chamberWorld(L_M, 'red'), { row: 13, col: 2 });
    expect(r.canReach(8, 3)).toBe(true); // gallery, M3 end
    expect(r.canReach(8, 17)).toBe(true); // gallery, M2 end
    expect(r.canReach(12, 15)).toBe(true); // small step next to M1 (C96)
    expect(r.canReach(13, 20)).toBe(true); // exit floor (beyond M1's barrier, which the checker ignores)
  });
});

describe('reachability: L-H (C98)', () => {
  const world = () => chamberWorld(L_H, 'red');

  it('the left shaft reaches the Bolt ledge beside the exit; the gallery stays out of reach', { timeout: 30000 }, () => {
    const r = reachFrom(world(), { row: 19, col: 2 });
    expect(r.canReach(4, 1)).toBe(true);
    expect(r.canReach(7, 17)).toBe(false);
  });

  it('the crate can be carried to the a step', { timeout: 30000 }, () => {
    expect(reachFrom(world(), { row: 19, col: 11 }, { carrying: true }).canReach(17, 23)).toBe(true);
  });

  it('the pen can be entered and left again (C41 undo)', { timeout: 30000 }, () => {
    expect(reachFrom(world(), { row: 19, col: 2 }).canReach(12, 16)).toBe(true);
    expect(reachFrom(world(), { row: 12, col: 16 }).canReach(19, 5)).toBe(true);
  });
});

describe('reachability with Dash', () => {
  it('jump + Dash crosses a 5-gap (and up to 9) that a plain jump cannot', { timeout: 30000 }, () => {
    expect(reachFrom(gapWorld(5), { row: 7, col: 2 }).canReach(7, 13)).toBe(false);
    expect(reachFrom(gapWorld(5), { row: 7, col: 2 }, { dash: true }).canReach(7, 13)).toBe(true);
    expect(reachFrom(gapWorld(9), { row: 7, col: 2 }, { dash: true }).canReach(7, 17)).toBe(true);
    expect(reachFrom(gapWorld(10), { row: 7, col: 2 }, { dash: true }).canReach(7, 18)).toBe(false);
  });
});

describe('reachability: P-H (C56, C99)', () => {
  const w = (ph: 'red' | 'blue') => chamberWorld(P_H, ph);

  it('the crate crosses only on the red bridge', { timeout: 30000 }, () => {
    expect(reachFrom(w('red'), { row: 11, col: 5 }, { carrying: true }).canReach(11, 27)).toBe(true); // plate p (C100)
    expect(reachFrom(w('blue'), { row: 11, col: 5 }, { carrying: true }).canReach(11, 27)).toBe(false);
  });

  it('home in Blue needs jump + Dash; a fall into the chasm escapes to the right only', { timeout: 30000 }, () => {
    expect(reachFrom(w('blue'), { row: 11, col: 22 }).canReach(11, 5)).toBe(false);
    expect(reachFrom(w('blue'), { row: 11, col: 22 }, { dash: true }).canReach(11, 5)).toBe(true);
    const chasm = reachFrom(w('blue'), { row: 17, col: 12 });
    expect(chasm.canReach(11, 20) && !chasm.canReach(11, 5)).toBe(true);
  });

  it('the tier with the only crystal is reachable from the right floor', { timeout: 30000 }, () => {
    expect(reachFrom(w('red'), { row: 11, col: 22 }).canReach(8, 20)).toBe(true);
  });

  it('no melee swing, standing or jumping or dashing, ever reaches the high mirror (it is Bolt-only)', { timeout: 60000 }, () => {
    for (const ph of ['red', 'blue'] as const) {
      const world = w(ph);
      const hits = { n: 0 };
      const target = { isSolid: world.isSolid, isHittable: (r: number, c: number) => r === 2 && c === 24 };
      reachFrom(world, { row: 11, col: 22 }, {
        dash: true,
        onFrame: (b, facing) => {
          for (const dir of ['up', 'forward'] as const) {
            for (const f of dir === 'up' ? [facing] : ([1, -1] as const)) if (cellsHitBySwing(swingBox(b, f, dir), f, dir, target).length) hits.n++;
          }
        },
      });
      expect(hits.n).toBe(0);
    }
  });
});
