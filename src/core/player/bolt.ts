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
 *   the Bolt as well as the beam).
 * - Enemies (C103): a forward Bolt hits an enemy in front of any part of the player's body, not
 *   only on the upper-body row, so a walker (one row tall, on the player's floor) can be Bolted.
 *   Each body row is a lane, stopped by walls; puzzle targets still use the upper-body row only.
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

/** One row a forward Bolt can hit enemies in: the free cells ahead, nearest first. */
export interface BoltLane {
  row: number;
  cells: Cell[];
}

/**
 * Enemy lanes of a forward Bolt (C103): one per grid row the body covers, each starting at the
 * body's front edge and running ahead until something solid. A lane never goes further than the
 * Bolt itself (`limit` = cells the upper-body Bolt flies through), so nothing is hit past the
 * mirror, crystal or wall that stops it.
 */
export function boltEnemyLanes(body: Box, facing: 1 | -1, isSolid: (r: number, c: number) => boolean, limit: number): BoltLane[] {
  const front = cellOf(facing === 1 ? body.right - 1 : body.left);
  const lanes: BoltLane[] = [];
  for (let row = cellOf(body.top); row <= cellOf(body.bottom - 1); row++) {
    const cells: Cell[] = [];
    for (let i = 0, c = front; i < limit && !isSolid(row, c); i++, c += facing) cells.push([row, c]);
    lanes.push({ row, cells });
  }
  return lanes;
}

/**
 * Enemies on a forward Bolt's lanes, nearest first (by distance ahead; on a tie the upper row
 * first). `at` lists the enemies overlapping a cell. Each enemy appears once, at its nearest cell.
 * The Bolt takes the first; Piercing Bolt (C67) takes them all.
 */
export function enemiesOnLanes<E>(lanes: readonly BoltLane[], at: (r: number, c: number) => readonly E[]): { enemy: E; cell: Cell; index: number }[] {
  const found: { enemy: E; cell: Cell; index: number }[] = [];
  const seen = new Set<E>();
  const longest = Math.max(0, ...lanes.map((l) => l.cells.length));
  for (let i = 0; i < longest; i++) {
    for (const lane of lanes) {
      const cell = lane.cells[i];
      if (!cell) continue;
      for (const e of at(cell[0], cell[1])) {
        if (seen.has(e)) continue;
        seen.add(e);
        found.push({ enemy: e, cell, index: i });
      }
    }
  }
  return found;
}
