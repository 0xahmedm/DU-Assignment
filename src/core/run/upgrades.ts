import type { Ability } from '../chamber/types';
import { TILE } from '../player/metrics';
import { mend, newHearts, type Hearts } from './hearts';
import type { RewardChoice } from './rooms';

/**
 * Run upgrades (C64–C67). After each solved chamber the reward room offers 1 of 3, dealt from a
 * seeded pool; upgrades last for the run only (C7, C10). No upgrade changes the movement metrics
 * (C65), and none is used in level select (C67).
 *
 * Implementation defaults (decision log, Day 5): only Mend can be taken more than once; Long Reach
 * extends the swing against enemies only, so puzzle hits keep the reach every chamber was proven
 * with (P-H's Bolt-only mirror, C56).
 */
export type UpgradeId =
  | 'heavy-swing'
  | 'long-reach'
  | 'shockwave'
  | 'shield-breaker'
  | 'piercing-bolt'
  | 'mend'
  | 'guard'
  | 'phantom-dash'
  | 'insight'
  | 'throw-sight';

export interface Upgrade extends RewardChoice {
  id: UpgradeId;
  group: 'combat' | 'survival' | 'puzzle';
  /** Offered only once this ability is owned (C67, the * upgrades). */
  needs?: Ability;
  /** Can be taken again (Mend only). */
  repeatable?: boolean;
}

export const UPGRADES: readonly Upgrade[] = [
  { id: 'heavy-swing', name: 'Heavy Swing', group: 'combat', description: '+1 melee damage: a walker falls in 1 hit, a Shieldbearer in 2.' },
  { id: 'long-reach', name: 'Long Reach', group: 'combat', description: 'Your swing reaches half a tile further against enemies.' },
  { id: 'shockwave', name: 'Shockwave', group: 'combat', description: 'Hits knock enemies back 2 tiles: off ledges, into beams.' },
  { id: 'shield-breaker', name: 'Shield Breaker', group: 'combat', description: 'A hit on a shield staggers the Shieldbearer for a moment.' },
  { id: 'piercing-bolt', name: 'Piercing Bolt', group: 'combat', needs: 'bolt', description: 'Your Bolt passes through enemies, hitting each one.' },
  { id: 'mend', name: 'Mend', group: 'survival', repeatable: true, description: 'Restore 1 heart, or +1 max heart if you are full.' },
  { id: 'guard', name: 'Guard', group: 'survival', description: 'The first enemy hit in each room is absorbed.' },
  { id: 'phantom-dash', name: 'Phantom Dash', group: 'survival', needs: 'dash', description: 'Dash cooldown halved; dashing through an enemy hits it.' },
  { id: 'insight', name: 'Insight', group: 'puzzle', description: "Near a mirror, see where a flip would send the beam; see each plate's targets." },
  { id: 'throw-sight', name: 'Throw Sight', group: 'puzzle', needs: 'throw', description: 'While carrying, see the tile your Throw will land on.' },
];

export const upgradeById = (id: UpgradeId): Upgrade => UPGRADES.find((u) => u.id === id)!;

/** Upgrades that may be offered: owned abilities unlock the * ones; taken ones go (except Mend). */
export function eligibleUpgrades(owned: ReadonlySet<Ability>, taken: readonly UpgradeId[]): Upgrade[] {
  return UPGRADES.filter((u) => (!u.needs || owned.has(u.needs)) && (u.repeatable || !taken.includes(u.id)));
}

/** Small seeded generator (mulberry32): the same seed always deals the same offers (C64, replays). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The offer for one reward room: up to 3 different upgrades, seeded by the run seed and how many
 * picks came before, so a replayed seed deals the same offers if the same choices are made.
 */
export function dealOffers(seed: number, pickIndex: number, owned: ReadonlySet<Ability>, taken: readonly UpgradeId[], count = 3): Upgrade[] {
  const pool = eligibleUpgrades(owned, taken);
  const next = rng((seed ^ Math.imul(pickIndex + 1, 0x9e3779b1)) >>> 0);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

/** What one run carries from room to room (C10): hearts and upgrades. The expedition owns it. */
export interface RunState {
  seed: number;
  hearts: Hearts;
  upgrades: UpgradeId[];
  /** Abilities owned for good (C7); they gate the * upgrades. */
  abilities: Ability[];
}

export const newRun = (seed: number, abilities: readonly Ability[] = []): RunState => ({
  seed,
  hearts: newHearts(),
  upgrades: [],
  abilities: [...abilities],
});

/** Takes an upgrade. Mend acts at once on the hearts (C66); the rest are kept for the run. */
export function takeUpgrade(run: RunState, id: UpgradeId): RunState {
  return {
    ...run,
    hearts: id === 'mend' ? mend(run.hearts) : run.hearts,
    upgrades: [...run.upgrades, id],
  };
}

/** The offer for the run's next reward room. */
export const offersFor = (run: RunState): Upgrade[] => dealOffers(run.seed, run.upgrades.length, new Set(run.abilities), run.upgrades);

/** The numbers the game reads, so no upgrade check is scattered through the scene. */
export interface UpgradeEffects {
  /** Melee damage per hit (Bolt stays 1). */
  meleeDamage: number;
  /** Extra swing reach against enemies, px (puzzle hits are unchanged). */
  enemyReachBonus: number;
  /** Enemy knockback distance multiplier. */
  knockbackScale: number;
  /** Seconds a Shieldbearer is staggered by a hit on its shield (0 = no stagger). */
  shieldStagger: number;
  piercingBolt: boolean;
  /** Enemy hits absorbed per room. */
  guardPerRoom: number;
  /** Dash cooldown multiplier (distance and the per-airtime limit never change, C65). */
  dashCooldownScale: number;
  dashHits: boolean;
  insight: boolean;
  throwSight: boolean;
}

export const NO_UPGRADES: UpgradeEffects = {
  meleeDamage: 1,
  enemyReachBonus: 0,
  knockbackScale: 1,
  shieldStagger: 0,
  piercingBolt: false,
  guardPerRoom: 0,
  dashCooldownScale: 1,
  dashHits: false,
  insight: false,
  throwSight: false,
};

export function effectsOf(upgrades: readonly UpgradeId[]): UpgradeEffects {
  const has = (id: UpgradeId) => upgrades.includes(id);
  return {
    meleeDamage: has('heavy-swing') ? 2 : 1,
    enemyReachBonus: has('long-reach') ? 0.5 * TILE : 0,
    knockbackScale: has('shockwave') ? 2 : 1,
    shieldStagger: has('shield-breaker') ? 0.8 : 0,
    piercingBolt: has('piercing-bolt'),
    guardPerRoom: has('guard') ? 1 : 0,
    dashCooldownScale: has('phantom-dash') ? 0.5 : 1,
    dashHits: has('phantom-dash'),
    insight: has('insight'),
    throwSight: has('throw-sight'),
  };
}
