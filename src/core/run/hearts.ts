/**
 * Hearts (C54, C55, C66). Three per run and no health bar: any hit or enemy contact costs one.
 * Losing a heart resets the current room (the player respawns at its entrance); hearts do not
 * refill. At zero the run ends (abilities and solved chambers are kept, C7). Only the Mend upgrade
 * restores a heart, or adds one if full (C66). Hearts are off in level select: a defeat there only
 * resets the chamber.
 */
export interface Hearts {
  current: number;
  max: number;
}

export const START_HEARTS = 3;

export const newHearts = (): Hearts => ({ current: START_HEARTS, max: START_HEARTS });

/** A defeat. Returns the new hearts and whether the run is over. */
export function loseHeart(h: Hearts): { hearts: Hearts; runOver: boolean } {
  const current = Math.max(0, h.current - 1);
  return { hearts: { ...h, current }, runOver: current === 0 };
}

/** Mend (C66): restore one heart, or +1 max (and fill it) when already full. */
export function mend(h: Hearts): Hearts {
  return h.current < h.max ? { ...h, current: h.current + 1 } : { current: h.max + 1, max: h.max + 1 };
}
