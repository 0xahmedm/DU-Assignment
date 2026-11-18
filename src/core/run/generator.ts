import type { ChamberId } from '../chamber/types';
import { abilitiesOf, frontier, isComplete, type Progress, type ProgressGraph } from './progression';
import { rng, shuffled, subSeed } from './rng';
import { tierFor, type Tier } from './rooms';

/**
 * Expedition generator (C8, C11, C12, C15, C22, C70, C71). It only chains hand-built rooms:
 *
 *   Start → [connector → chamber → reward] × N → Seal exit
 *
 * - Chambers: up to 3 from the unlocked frontier, easiest first (seeded order inside a
 *   difficulty); W-E opens the very first run (C22); the final chamber is always dealt alone.
 * - Connectors: one per chamber, seeded, never repeated within a run.
 * - Encounter tier from progress at the start of the run (R4, C70); Remix runs use the hardest.
 * - Remix (C71, after the final chamber): any 3 chambers, hardest tier.
 * The same seed and the same progress always give the same expedition.
 */

export const CHAMBERS_PER_RUN = 3;

export type RunStep =
  | { kind: 'start' }
  | { kind: 'connector'; roomId: string }
  | { kind: 'chamber'; id: ChamberId }
  | { kind: 'reward' }
  | { kind: 'exit' };

export interface RunPlan {
  seed: number;
  remix: boolean;
  tier: Tier;
  chambers: ChamberId[];
  steps: RunStep[];
}

const STREAM = { chambers: 101, connectors: 102 } as const;

/** The chambers a run deals (see the rules above). */
export function dealChambers(g: ProgressGraph, p: Progress, seed: number, remix = false): ChamberId[] {
  const next = rng(subSeed(seed, STREAM.chambers));
  if (remix) return shuffled(g.chambers.map((c) => c.id), next).slice(0, CHAMBERS_PER_RUN);

  const open = frontier(g, p);
  if (open.includes(g.finalId)) return [g.finalId];
  const rank = (id: ChamberId) => ['easy', 'medium', 'hard'].indexOf(g.chambers.find((c) => c.id === id)!.difficulty);
  // Seeded order inside each difficulty, easiest difficulty first.
  const order = shuffled(open, next).sort((a, b) => rank(a) - rank(b));
  const dealt = order.slice(0, CHAMBERS_PER_RUN);
  // Onboarding (C22): the first chamber of the first run is W-E.
  if (p.solved.length === 0 && open.includes('W-E')) return (['W-E', ...dealt.filter((id) => id !== 'W-E')] as ChamberId[]).slice(0, CHAMBERS_PER_RUN);
  return dealt;
}

/**
 * Builds a whole expedition. `connectorIds` are the connector templates to choose from (data).
 * Throws if there is nothing to deal (every chamber solved and not a Remix run).
 */
export function generateRun(g: ProgressGraph, p: Progress, seed: number, connectorIds: readonly string[], remix = false): RunPlan {
  const chambers = dealChambers(g, p, seed, remix);
  if (chambers.length === 0) throw new Error('nothing to deal: every chamber is solved (start a Remix run instead)');
  if (connectorIds.length < chambers.length) throw new Error(`need ${chambers.length} connectors, have ${connectorIds.length}`);
  const connectors = shuffled(connectorIds, rng(subSeed(seed, STREAM.connectors)));

  const solvedOf = (difficulty: string) => p.solved.filter((id) => g.chambers.find((c) => c.id === id)?.difficulty === difficulty).length;
  const tier = tierFor({ mediums: solvedOf('medium'), hards: solvedOf('hard') }, remix);

  const steps: RunStep[] = [{ kind: 'start' }];
  chambers.forEach((id, i) => steps.push({ kind: 'connector', roomId: connectors[i]! }, { kind: 'chamber', id }, { kind: 'reward' }));
  steps.push({ kind: 'exit' });
  return { seed: seed >>> 0, remix, tier, chambers, steps };
}

/** Remix unlocks once the final chamber is solved (C71). */
export const remixUnlocked = isComplete;

/** Abilities a run starts with: everything owned (all three in Remix). */
export const runAbilities = (g: ProgressGraph, p: Progress, remix: boolean) =>
  remix ? (['throw', 'bolt', 'dash'] as const).slice() : abilitiesOf(g, p);

/** A fresh seed for "New expedition": short enough to read out and type. */
export const newSeed = (random: () => number = Math.random): number => 1 + Math.floor(random() * 999_999);
