import type { Cell } from '../chamber/types';

/**
 * Expedition rooms (C12, C61, C70; drafts approved Day 5 with rules R1–R4, C101–C102).
 * Room grids use the chamber legend (so the same parser, validator, renderer and checker work);
 * enemies are not in the grid but in per-tier lists, and room-only features are listed apart.
 */
export type RoomKind = 'start' | 'reward' | 'exit' | 'connector';
export type Tier = 'T1' | 'T2' | 'T3';

export interface EnemySpawn {
  kind: 'walker' | 'shieldbearer';
  /** Cell the enemy stands in (on the floor below it). */
  cell: Cell;
}

export interface RoomDef {
  id: string;
  name: string;
  kind: RoomKind;
  grid: readonly string[];
  /** Enemy placements per encounter tier (R4). Connectors only. */
  tiers?: Readonly<Record<Tier, readonly EnemySpawn[]>>;
  /** Reward room: the three pedestals (R3), cells the player stands in. */
  pedestals?: readonly Cell[];
  /** Exit room: reaching this cell ends the run. */
  altar?: Cell;
  /** R2: the exit opens only when every enemy is defeated (the Arena). */
  lockUntilCleared?: boolean;
}

/** R4: the tier follows progress (walkers only at first, C70). */
export function tierFor(solved: { mediums: number; hards: number }, remix = false): Tier {
  if (remix || solved.hards > 0) return 'T3';
  return solved.mediums > 0 ? 'T2' : 'T1';
}
