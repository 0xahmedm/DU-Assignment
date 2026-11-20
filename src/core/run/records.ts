import type { KeyValueStore } from './progression';

/**
 * Remix best-run time (C71). A run's time is its active play time across all its rooms (physics
 * steps only: menus, fades and the defeat sequence don't count), so it measures play, not waiting.
 * Only the best Remix time is kept, on this browser.
 */
export const REMIX_BEST_KEY = 'seal-chambers.remixBest';

export function loadBest(store: KeyValueStore | undefined): number | undefined {
  try {
    const n = Number(store?.getItem(REMIX_BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

/** Records a finished Remix run; returns the best time and whether this run set it. */
export function recordRemixTime(store: KeyValueStore | undefined, ms: number): { best: number; improved: boolean } {
  const old = loadBest(store);
  if (!(ms > 0) || (old !== undefined && old <= ms)) return { best: old ?? ms, improved: false };
  try {
    store?.setItem(REMIX_BEST_KEY, String(Math.round(ms)));
  } catch {
    // Not saved; still the best of this session.
  }
  return { best: ms, improved: true };
}
