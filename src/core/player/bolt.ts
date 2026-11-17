import type { Box } from '../combat/melee';
import type { Cell } from '../chamber/types';
import { TILE } from './metrics';

/**
 * Bolt (C23, C50): a ranged shot that flies in a straight grid line until it hits something.
 * - Forward Bolt travels along the player's upper-body row (C50); up-Bolt goes straight up from
 *   the head (P-H: "up-Bolt the mirror from directly below").
 * - It hits the first crystal, mirror or dispenser on its line, exactly like a melee hit (locked
 *   mirrors refuse, C42), and stops there.
 * - It stops at anything solid, including the active phase colour (P-H: the blue block shadows
 *   the Bolt as well as the beam). Enemies are added with combat on Day 4.
 */
export const BOLT = {
  /** Flight speed, px/s: fast, but slow enough to see where it goes. */
  speed: 20 * TILE,
  /** Seconds between shots. */
  cooldown: 0.45,
  /** How far below the top of the body the forward Bolt flies ("upper body"). */
  upperBodyOffset: 8,
  /** Safety cap on the path length, cells. */
  maxCells: 64,
} as const;

export type BoltDir = 'forward' | 'up';

export interface BoltWorld {
  isSolid(r: number, c: number): boolean;
  isHittable(r: number, c: number): boolean;
}

export interface BoltPath {
  /** Cells the Bolt flies through, in order, ending with the hit or the last free cell. */
  cells: Cell[];
  /** The cell it hit (crystal, mirror, dispenser), if any. */
  hit: Cell | undefined;
  /** True when it stopped against something solid that is not a target. */
  blocked: boolean;
}

const cellOf = (px: number) => Math.floor(px / TILE);

/** Where a Bolt starts and which way it steps. */
export function boltStart(body: Box, facing: 1 | -1, dir: BoltDir): { cell: Cell; step: readonly [number, number] } {
  if (dir === 'up') {
    return { cell: [cellOf(body.top), cellOf((body.left + body.right) / 2)], step: [-1, 0] };
  }
  const front = facing === 1 ? body.right - 1 : body.left;
  return { cell: [cellOf(body.top + BOLT.upperBodyOffset), cellOf(front)], step: [0, facing] };
}

/** Follows the Bolt's line from its start cell (inclusive) until it hits or is blocked. */
export function traceBolt(start: Cell, step: readonly [number, number], world: BoltWorld): BoltPath {
  const cells: Cell[] = [];
  let [r, c] = start;
  for (let i = 0; i < BOLT.maxCells; i++) {
    if (world.isHittable(r, c)) {
      cells.push([r, c]);
      return { cells, hit: [r, c], blocked: false };
    }
    if (world.isSolid(r, c)) return { cells, hit: undefined, blocked: true };
    cells.push([r, c]);
    r += step[0];
    c += step[1];
  }
  return { cells, hit: undefined, blocked: false };
}
