import type { Box } from '../combat/melee';
import { TILE } from '../player/metrics';

/**
 * Walker (C59, decision-log Point 3): patrols, turns at walls and ledges (even 1-tile drops),
 * cannot jump, falls with gravity, counts as weight, respawns at its spawner when killed.
 *
 * C91: the ledge rule is literal. A walker turns at any gap in the *current* floor, including an
 * open trapdoor; it only falls when the floor disappears under it (a trapdoor opening, a phase
 * swap). It is small enough (under one tile) to drop into 1-tile slots such as W-M's.
 */
export const WALKER = {
  width: 26,
  height: 26,
  /** Patrol speed, px/s (~1.5 tiles/s): slow enough to read, quick enough not to bore. */
  speed: 48,
} as const;

export interface WalkerWorld {
  /** Solid right now (terrain, closed doors and trapdoors, the active phase colour). */
  isSolid(r: number, c: number): boolean;
}

const cellOf = (px: number) => Math.floor(px / TILE);

/** Is the walker's way forward blocked by a wall, or does the floor end right in front of it? */
export function mustTurn(body: Box, dir: 1 | -1, world: WalkerWorld): boolean {
  const frontX = dir === 1 ? body.right + 1 : body.left - 1;
  const col = cellOf(frontX);
  for (let r = cellOf(body.top); r <= cellOf(body.bottom - 1); r++) if (world.isSolid(r, col)) return true; // wall
  const floorRow = Math.round(body.bottom / TILE);
  return !world.isSolid(floorRow, col); // ledge (any depth)
}

/**
 * One patrol decision per physics step. Returns the new direction and horizontal speed.
 * In the air a walker has no control: it drops straight down (so it falls cleanly into slots).
 */
export function stepWalker(
  body: Box,
  dir: 1 | -1,
  grounded: boolean,
  blockedAhead: boolean,
  world: WalkerWorld,
): { dir: 1 | -1; vx: number } {
  if (!grounded) return { dir, vx: 0 };
  const next: 1 | -1 = blockedAhead || mustTurn(body, dir, world) ? (-dir as 1 | -1) : dir;
  return { dir: next, vx: next * WALKER.speed };
}
