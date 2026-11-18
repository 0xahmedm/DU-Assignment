import type { Box } from './melee';

/**
 * Enemy combat rules (C59–C62), engine-free.
 * - Walker: 2 hits.
 * - Shieldbearer: its front is immune to melee and Bolt (a "clang" and a push back); 3 hits from
 *   behind. Beams kill any enemy outright (C27: "enemies take heavy damage").
 * - Killed enemies respawn at their spawner after a short delay (W-M, L-H undo, C41).
 * - The Shieldbearer turns to face the player after a telegraphed pause when the player is behind
 *   it and close.
 */
export type EnemyKind = 'walker' | 'shieldbearer';
export type HitSource = 'melee' | 'bolt' | 'beam';

export const ENEMY_RULES = {
  health: { walker: 2, shieldbearer: 3 } as Record<EnemyKind, number>,
  /** Seconds before a killed enemy reappears at its spawner. */
  respawnDelay: 1.5,
  /** Shieldbearer: how long it pauses (telegraph) before turning to face a player behind it. */
  turnTelegraph: 0.6,
  /** Shieldbearer: it only notices a player behind it within this many px horizontally. */
  noticeRange: 5 * 32,
  /** Knockback on a hit, px/s for a moment (about one tile). */
  knockbackSpeed: 260,
  knockbackTime: 0.12,
} as const;

export type HitOutcome = 'damaged' | 'killed' | 'blocked';

/**
 * Applies one hit. `fromX` is where the hit came from (the attacker's centre, or the Bolt's origin);
 * the Shieldbearer blocks melee and Bolt hits that come from the side it faces.
 */
export function hitEnemy(
  kind: EnemyKind,
  hp: number,
  facing: 1 | -1,
  enemyX: number,
  fromX: number,
  source: HitSource,
  /** Damage per hit: 1, or 2 for melee with Heavy Swing (C67). */
  damage = 1,
): { outcome: HitOutcome; hp: number } {
  if (source === 'beam') return { outcome: 'killed', hp: 0 };
  const fromFront = Math.sign(fromX - enemyX) === facing;
  if (kind === 'shieldbearer' && fromFront) return { outcome: 'blocked', hp };
  const left = hp - damage;
  return { outcome: left <= 0 ? 'killed' : 'damaged', hp: Math.max(0, left) };
}

/** Is the player behind this Shieldbearer, close and at roughly the same height? */
export function playerBehind(enemy: Box, facing: 1 | -1, player: Box): boolean {
  const ex = (enemy.left + enemy.right) / 2;
  const px = (player.left + player.right) / 2;
  const behind = Math.sign(px - ex) === -facing;
  const close = Math.abs(px - ex) <= ENEMY_RULES.noticeRange;
  const sameHeight = player.bottom > enemy.top && player.top < enemy.bottom;
  return behind && close && sameHeight;
}

/** Contact (C55): any overlap with an enemy costs a heart. A small inset keeps grazes fair. */
export function touches(player: Box, enemy: Box, inset = 3): boolean {
  return (
    player.right - inset > enemy.left &&
    player.left + inset < enemy.right &&
    player.bottom - inset > enemy.top &&
    player.top + inset < enemy.bottom
  );
}
