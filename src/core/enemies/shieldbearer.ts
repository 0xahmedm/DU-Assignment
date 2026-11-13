import { TILE } from '../player/metrics';

/**
 * Shieldbearer (C48, C59, C62): a slow patroller, 1 x 1.5 tiles, with a shield on its front.
 * It patrols exactly like the walker (core/enemies/walker: stepPatrol, literal ledge rule C91),
 * counts as weight and falls when its floor disappears. Day 4 adds combat: front hits clang off,
 * 3 hits from behind (or beams / falls), and a telegraphed pause before it turns to face you.
 *
 * Size: under 1.5 tiles tall so it fits P-M's 2-tall tunnel; a 3-tile jump clears it in the open.
 */
export const SHIELDBEARER = {
  width: TILE - 2,
  height: 1.5 * TILE - 2,
  /** Patrol speed, px/s (~1.1 tiles/s): slower than the walker, it reads as heavy. */
  speed: 36,
} as const;
