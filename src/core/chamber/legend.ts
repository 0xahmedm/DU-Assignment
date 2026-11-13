import type { Dir, TileKind } from './types';

/**
 * The shared symbol legend for chamber grids (decision log, Part B drafts; implementation plan
 * "Chamber data schema"). Every symbol a grid may contain is listed here; the parser rejects others.
 */
export interface SymbolInfo {
  /** The static tile under the symbol. Devices that change solidity (doors) use 'empty'. */
  tile: TileKind;
  meaning: string;
}

export const LEGEND: Readonly<Record<string, SymbolInfo>> = {
  '#': { tile: 'solid', meaning: 'solid terrain' },
  '.': { tile: 'empty', meaning: 'air' },
  R: { tile: 'red', meaning: 'red phase block' },
  B: { tile: 'blue', meaning: 'blue phase block' },
  S: { tile: 'empty', meaning: 'player start' },
  D: { tile: 'solid', meaning: 'entry door (closed behind the player)' },
  E: { tile: 'empty', meaning: 'exit door (opens when all its inputs are on)' },
  '|': { tile: 'empty', meaning: 'door / doorway (signal door if wired, otherwise always open)' },
  K: { tile: 'empty', meaning: 'signal door' },
  '=': { tile: 'empty', meaning: 'trapdoor (solid until powered)' },
  C: { tile: 'empty', meaning: 'crate (initial position)' },
  U: { tile: 'solid', meaning: 'crate dispenser' },
  '*': { tile: 'empty', meaning: 'phase crystal (non-solid)' },
  '>': { tile: 'solid', meaning: 'emitter firing right' },
  '<': { tile: 'solid', meaning: 'emitter firing left' },
  '^': { tile: 'solid', meaning: 'emitter firing up' },
  v: { tile: 'solid', meaning: 'emitter firing down' },
  '/': { tile: 'solid', meaning: 'mirror (/)' },
  '\\': { tile: 'solid', meaning: 'mirror (\\)' },
  o: { tile: 'solid', meaning: 'beam receiver' },
  w: { tile: 'empty', meaning: 'walker spawn' },
  H: { tile: 'empty', meaning: 'Shieldbearer spawn' },
};

/** Lowercase letters are plates, except the ones the legend reserves (o, v, w). */
export function isPlate(ch: string): boolean {
  return ch.length === 1 && ch >= 'a' && ch <= 'z' && !(ch in LEGEND);
}

export function symbolInfo(ch: string): SymbolInfo | undefined {
  if (isPlate(ch)) return { tile: 'empty', meaning: `plate "${ch}" (sits on the tile below)` };
  return LEGEND[ch];
}

export const EMITTER_DIRS: Readonly<Record<string, Dir>> = { '>': 'right', '<': 'left', '^': 'up', v: 'down' };
