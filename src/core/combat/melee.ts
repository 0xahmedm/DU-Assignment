import type { Cell } from '../chamber/types';
import { TILE } from '../player/metrics';

/** An axis-aligned box in world pixels. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type SwingDir = 'forward' | 'up';

/**
 * Melee tuning (C35, C62). Reach is measured from the edge of the player's body, so the swing
 * always connects before contact does (any enemy contact costs a heart, C55).
 */
export const MELEE = {
  /** How far the swing reaches beyond the body edge (~1.3 tiles). */
  reach: 1.3 * TILE,
  /** The up-swing is a little wider than the body so a crystal right overhead is easy to hit. */
  upPad: 5,
  /** Seconds before the next swing can start (short recovery). */
  recovery: 0.28,
  /** Seconds the swing is drawn. */
  showTime: 0.1,
} as const;

/** The area a swing covers, next to the body (forward) or above the head (up). */
export function swingBox(body: Box, facing: 1 | -1, dir: SwingDir, reach: number = MELEE.reach): Box {
  if (dir === 'up') {
    return { left: body.left - MELEE.upPad, right: body.right + MELEE.upPad, top: body.top - reach, bottom: body.top };
  }
  return facing === 1
    ? { left: body.right, right: body.right + reach, top: body.top, bottom: body.bottom }
    : { left: body.left - reach, right: body.left, top: body.top, bottom: body.bottom };
}

/** What the swing needs to know about the chamber. */
export interface SwingWorld {
  /** Solid right now (terrain, closed doors, the active phase colour, solid devices). */
  isSolid(r: number, c: number): boolean;
  /** Holds something a swing can hit (crystal, mirror, dispenser). */
  isHittable(r: number, c: number): boolean;
}

const cellOf = (px: number) => Math.floor(px / TILE);

/**
 * Cells a swing hits. The box is split into lanes (rows for a forward swing, columns for an
 * up-swing); each lane is walked outward from the player. A solid cell ends the lane, so nothing
 * is ever hit through a wall. A solid device (mirror, dispenser) is hit and then ends the lane;
 * a crystal is not solid, so the lane continues past it.
 */
export function cellsHitBySwing(box: Box, facing: 1 | -1, dir: SwingDir, world: SwingWorld): Cell[] {
  const rows = [cellOf(box.top), cellOf(box.bottom - 1)] as const;
  const cols = [cellOf(box.left), cellOf(box.right - 1)] as const;
  const hits: Cell[] = [];
  const seen = new Set<string>();

  const walk = (cells: Cell[]) => {
    for (const [r, c] of cells) {
      if (world.isHittable(r, c) && !seen.has(`${r},${c}`)) {
        seen.add(`${r},${c}`);
        hits.push([r, c]);
      }
      if (world.isSolid(r, c)) return;
    }
  };

  if (dir === 'up') {
    for (let c = cols[0]; c <= cols[1]; c++) {
      const lane: Cell[] = [];
      for (let r = rows[1]; r >= rows[0]; r--) lane.push([r, c]); // from the head upward
      walk(lane);
    }
  } else {
    for (let r = rows[0]; r <= rows[1]; r++) {
      const lane: Cell[] = [];
      if (facing === 1) for (let c = cols[0]; c <= cols[1]; c++) lane.push([r, c]);
      else for (let c = cols[1]; c >= cols[0]; c--) lane.push([r, c]);
      walk(lane);
    }
  }
  return hits;
}
