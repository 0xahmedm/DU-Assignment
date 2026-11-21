import type { ChamberId } from '../chamber/types';
import type { RunStep } from './generator';
import { COMBAT_PER_CHAMBER } from './generator';
import { cycled, subSeed } from './rng';
import type { Tier } from './rooms';

/**
 * Endless expeditions (C113), unlocked with Remix once every seal is restored. Rooms keep coming in
 * the normal rhythm, Start → [combat × 2 → chamber → reward] → [combat × 2 → chamber → reward] → …,
 * with chambers drawn from all twelve and combat rooms from every connector, each in seeded cycles
 * (everything once before repeats, never the same twice in a row). The run ends when the hearts run
 * out; its score is the number of rooms cleared. Engine-free and deterministic per seed.
 */

/** Rooms in one loop of the rhythm: the combat rooms, the chamber and the reward room. */
export const LOOP = COMBAT_PER_CHAMBER + 2;

const STREAM = { chambers: 201, connectors: 202 } as const;

/** The room at position `index` (0 = the start room). */
export function endlessStep(seed: number, index: number, chamberIds: readonly ChamberId[], connectorIds: readonly string[]): RunStep {
  if (index <= 0) return { kind: 'start' };
  const k = index - 1;
  const loop = Math.floor(k / LOOP);
  const pos = k % LOOP;
  if (pos < COMBAT_PER_CHAMBER) {
    const n = loop * COMBAT_PER_CHAMBER + pos;
    return { kind: 'connector', roomId: cycled(connectorIds, subSeed(seed, STREAM.connectors), n + 1)[n]! };
  }
  if (pos === COMBAT_PER_CHAMBER) return { kind: 'chamber', id: cycled(chamberIds, subSeed(seed, STREAM.chambers), loop + 1)[loop]! };
  return { kind: 'reward' };
}

export interface EndlessLevel {
  /** One level per loop of rooms cleared. */
  level: number;
  /** Encounter tier for combat rooms (R4): T2 for the first loop, then T3. */
  tier: Tier;
  /** Extra hits every enemy in a combat room takes (one more every two levels past the first). */
  extraHp: number;
  /** Enemy patrol speed multiplier (10% more per level past the first, at most 1.6). */
  speedScale: number;
}

/**
 * How hard the next combat room is after `roomsCleared` rooms. Puzzle chambers never change: the
 * difficulty climbs in the fighting, so a puzzle is the same puzzle at room 5 or room 50.
 */
export function endlessLevel(roomsCleared: number): EndlessLevel {
  const level = Math.floor(Math.max(0, roomsCleared) / LOOP);
  const beyond = Math.max(0, level - 1);
  return { level, tier: level === 0 ? 'T2' : 'T3', extraHp: Math.floor(beyond / 2), speedScale: Math.min(1.6, 1 + 0.1 * beyond) };
}
