import type { Ability, ChamberId, Difficulty } from '../chamber/types';

/**
 * Permanent progress (C7, C10, C11, C20–C23, C76). Engine-free; the game passes the chamber data
 * in (so tests can use fixtures) and a key-value store for saving (localStorage in the browser).
 *
 * Only the solved chambers are stored; everything else follows from them and the chamber data:
 * - a chamber is unlocked when all its prerequisites are solved (C20);
 * - the frontier is every unlocked, unsolved chamber, easiest first (the generator deals from it, C11);
 * - each solved Medium grants its ability (C23); each solved Hard restores its seal (C21);
 * - the final chamber (the one restoring the third seal) completes the game (C17, C21).
 * Storing less means a save can never contradict itself (e.g. an ability without its Medium).
 */

/** What progression needs to know about a chamber (a subset of ChamberDef). */
export interface ChamberInfo {
  id: ChamberId;
  difficulty: Difficulty;
  prerequisites: readonly ChamberId[];
  grants?: Ability;
  seal?: 1 | 2 | 3;
}

export interface Progress {
  solved: ChamberId[];
}

export interface ProgressGraph {
  /** In display order (level-select order); also the tie-break order of the frontier. */
  chambers: readonly ChamberInfo[];
  /** The chamber that restores the last seal and completes the game (P-H, C45). */
  finalId: ChamberId;
}

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function buildGraph(chambers: readonly ChamberInfo[]): ProgressGraph {
  const seals = chambers.filter((c) => c.seal !== undefined);
  const last = Math.max(...seals.map((c) => c.seal!));
  const finals = seals.filter((c) => c.seal === last);
  if (finals.length !== 1) throw new Error(`expected exactly one final chamber (seal ${last}), found ${finals.length}`);
  return { chambers, finalId: finals[0]!.id };
}

export const newProgress = (): Progress => ({ solved: [] });

const info = (g: ProgressGraph, id: ChamberId) => g.chambers.find((c) => c.id === id);

export const isSolved = (p: Progress, id: ChamberId): boolean => p.solved.includes(id);

export function isUnlocked(g: ProgressGraph, p: Progress, id: ChamberId): boolean {
  const c = info(g, id);
  return c !== undefined && c.prerequisites.every((pre) => isSolved(p, pre));
}

/** Unlocked, unsolved chambers, easiest first; ties keep the graph's order (C8, C11). */
export function frontier(g: ProgressGraph, p: Progress): ChamberId[] {
  return g.chambers
    .filter((c) => !isSolved(p, c.id) && isUnlocked(g, p, c.id))
    .sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || g.chambers.indexOf(a) - g.chambers.indexOf(b))
    .map((c) => c.id);
}

/** Abilities owned for good: one per solved Medium (C23). */
export function abilitiesOf(g: ProgressGraph, p: Progress): Ability[] {
  return g.chambers.filter((c) => c.grants && isSolved(p, c.id)).map((c) => c.grants!);
}

/** Seals restored so far, in seal order (C21). */
export function sealsOf(g: ProgressGraph, p: Progress): (1 | 2 | 3)[] {
  return g.chambers
    .filter((c) => c.seal !== undefined && isSolved(p, c.id))
    .map((c) => c.seal!)
    .sort((a, b) => a - b);
}

export const isComplete = (g: ProgressGraph, p: Progress): boolean => isSolved(p, g.finalId);

/** What solving a chamber gave, for the "solved" screen. */
export interface SolveResult {
  progress: Progress;
  /** False if it was already solved (nothing new). */
  first: boolean;
  ability?: Ability;
  seal?: 1 | 2 | 3;
  /** Chambers this solve unlocked. */
  unlocked: ChamberId[];
  /** The final chamber was solved: every seal is restored (C21). */
  completed: boolean;
}

export function solve(g: ProgressGraph, p: Progress, id: ChamberId): SolveResult {
  const c = info(g, id);
  if (!c || isSolved(p, id)) return { progress: p, first: false, unlocked: [], completed: isComplete(g, p) };
  const progress = { solved: [...p.solved, id] };
  const unlocked = g.chambers.filter((x) => !isUnlocked(g, p, x.id) && isUnlocked(g, progress, x.id)).map((x) => x.id);
  return { progress, first: true, ability: c.grants, seal: c.seal, unlocked, completed: isComplete(g, progress) };
}

// --- saving (C76) -------------------------------------------------------------------------------

/** The browser's localStorage satisfies this; tests use a Map. Any call may throw (private mode). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'seal-chambers.progress';
const SAVE_VERSION = 1;

export const serializeProgress = (p: Progress): string => JSON.stringify({ version: SAVE_VERSION, solved: p.solved });

/** Reads a save; anything unreadable, unknown or from another version gives fresh progress. */
export function parseProgress(g: ProgressGraph, text: string | null): Progress {
  if (!text) return newProgress();
  try {
    const data = JSON.parse(text) as { version?: unknown; solved?: unknown };
    if (data.version !== SAVE_VERSION || !Array.isArray(data.solved)) return newProgress();
    const known = new Set<string>(g.chambers.map((c) => c.id));
    const solved = [...new Set(data.solved.filter((id): id is ChamberId => typeof id === 'string' && known.has(id)))];
    return { solved };
  } catch {
    return newProgress();
  }
}

/** Loads progress; a store that throws (blocked storage) counts as empty. */
export function loadProgress(g: ProgressGraph, store: KeyValueStore | undefined): Progress {
  try {
    return parseProgress(g, store?.getItem(SAVE_KEY) ?? null);
  } catch {
    return newProgress();
  }
}

/** Saves progress. Returns false if the store refused (the game keeps playing, unsaved). */
export function saveProgress(store: KeyValueStore | undefined, p: Progress): boolean {
  try {
    store?.setItem(SAVE_KEY, serializeProgress(p));
    return store !== undefined;
  } catch {
    return false;
  }
}

/** "Reset progress" (C76): forget every solved chamber, ability and seal. */
export function resetProgress(store: KeyValueStore | undefined): Progress {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // Nothing stored that we can reach: fresh progress either way.
  }
  return newProgress();
}
