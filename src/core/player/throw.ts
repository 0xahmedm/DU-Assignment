import { METRICS, TILE } from './metrics';

/**
 * Throw (C23, C29): a fixed arc that always lands exactly 5 tiles ahead, never a physics impulse,
 * so layouts can rely on it (W-H throws across a 4-tile gap onto a platform 5 tiles away).
 *
 * "5 ahead" is measured in grid columns: from the column the player stands in to the column the
 * crate lands in, at the player's floor height. The crate flies along a parabola; if it touches
 * anything solid on the way it stops and drops. If there is no floor where it lands, it keeps
 * falling (e.g. W-H in the wrong colour).
 */
export const THROW = {
  tiles: METRICS.throwTiles,
  /** Flight time, seconds. */
  duration: 0.45,
  /** How far the arc rises above the straight line from hand to landing spot, px. */
  rise: 1.25 * TILE,
} as const;

export interface Point {
  x: number;
  y: number;
}

/** Where a crate thrown from this spot lands: centre of the tile 5 columns ahead, resting on the player's floor. */
export function throwTarget(playerCenterX: number, feetY: number, facing: 1 | -1): Point {
  const col = Math.floor(playerCenterX / TILE) + facing * THROW.tiles;
  return { x: col * TILE + TILE / 2, y: feetY - TILE / 2 };
}

/** Position along the arc at progress t (0 = in the hands, 1 = landed). */
export function throwArc(start: Point, target: Point, t: number): Point {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: start.x + (target.x - start.x) * k,
    y: start.y + (target.y - start.y) * k - 4 * THROW.rise * k * (1 - k),
  };
}

/** Velocity at progress t, px/s (handed to physics when the flight ends, so the fall looks continuous). */
export function throwVelocity(start: Point, target: Point, t: number): Point {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: (target.x - start.x) / THROW.duration,
    y: (target.y - start.y - 4 * THROW.rise * (1 - 2 * k)) / THROW.duration,
  };
}
