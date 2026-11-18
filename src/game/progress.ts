import { buildGraph, type ChamberInfo, type KeyValueStore } from '../core/run/progression';
import { CHAMBER_GRID, CHAMBERS } from '../data/chambers';

/** The progression graph of the nine chambers, in level-select order (C20, C53). */
export const PROGRESS_GRAPH = buildGraph(CHAMBER_GRID.flat().map((id) => CHAMBERS[id]! as ChamberInfo));

/**
 * The browser's localStorage, or undefined where it can't be reached (some private modes throw on
 * access). Core's load/save treat a missing or throwing store as "nothing saved".
 */
export function browserStore(): KeyValueStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
