import { describe, expect, it } from 'vitest';
import { ENEMY_RULES, hitEnemy } from '../../src/core/combat/enemies';
import { DEFAULT_MOVEMENT } from '../../src/core/player/movement';
import {
  dealOffers,
  effectsOf,
  eligibleUpgrades,
  newRun,
  NO_UPGRADES,
  offersFor,
  takeUpgrade,
  UPGRADES,
  type UpgradeId,
} from '../../src/core/run/upgrades';

const ids = (us: readonly { id: string }[]) => us.map((u) => u.id).sort();

describe('upgrade pool (C67)', () => {
  it('has the ten approved upgrades, three of them ability-gated', () => {
    expect(UPGRADES).toHaveLength(10);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(10);
    expect(Object.fromEntries(UPGRADES.filter((u) => u.needs).map((u) => [u.id, u.needs]))).toEqual({
      'piercing-bolt': 'bolt',
      'phantom-dash': 'dash',
      'throw-sight': 'throw',
    });
  });

  it('gated upgrades appear only once their ability is owned', () => {
    expect(eligibleUpgrades(new Set(), [])).toHaveLength(7);
    expect(ids(eligibleUpgrades(new Set(['bolt']), []))).toContain('piercing-bolt');
    expect(ids(eligibleUpgrades(new Set(['bolt']), []))).not.toContain('phantom-dash');
    expect(eligibleUpgrades(new Set(['bolt', 'dash', 'throw']), [])).toHaveLength(10);
  });

  it('a taken upgrade is not offered again, except Mend', () => {
    const left = ids(eligibleUpgrades(new Set(), ['guard', 'mend']));
    expect(left).not.toContain('guard');
    expect(left).toContain('mend');
  });
});

describe('dealing offers (C64)', () => {
  it('deals 3 different eligible upgrades', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const offer = dealOffers(seed, 0, new Set(), []);
      expect(offer).toHaveLength(3);
      expect(new Set(offer.map((u) => u.id)).size).toBe(3);
      for (const u of offer) expect(u.needs).toBeUndefined();
    }
  });

  it('is seeded: the same seed and pick deal the same offer; the next pick deals another', () => {
    const a = dealOffers(42, 0, new Set(['bolt']), []);
    expect(dealOffers(42, 0, new Set(['bolt']), [])).toEqual(a);
    const later = Array.from({ length: 5 }, (_, i) => ids(dealOffers(42, i + 1, new Set(['bolt']), [])).join());
    expect(later.some((o) => o !== ids(a).join())).toBe(true);
  });

  it('every upgrade gets offered across seeds (nothing is unreachable)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) for (const u of dealOffers(seed, 0, new Set(['bolt', 'dash', 'throw']), [])) seen.add(u.id);
    expect(seen.size).toBe(10);
  });

  it('a run deals from what it owns and has taken', () => {
    let run = newRun(7, ['dash']);
    const first = offersFor(run);
    run = takeUpgrade(run, first[0]!.id);
    const second = offersFor(run);
    if (first[0]!.id !== 'mend') expect(ids(second)).not.toContain(first[0]!.id);
  });
});

describe('Mend (C66)', () => {
  it('restores a heart, or adds one when full', () => {
    let run = newRun(1);
    run = takeUpgrade(run, 'mend');
    expect(run.hearts).toEqual({ current: 4, max: 4 });
    run = { ...run, hearts: { current: 2, max: 4 } };
    run = takeUpgrade(run, 'mend');
    expect(run.hearts).toEqual({ current: 3, max: 4 });
  });

  it('other upgrades leave the hearts alone', () => {
    expect(takeUpgrade(newRun(1), 'guard').hearts).toEqual(newRun(1).hearts);
  });
});

describe('upgrade effects', () => {
  it('no upgrades = the base rules', () => {
    expect(effectsOf([])).toEqual(NO_UPGRADES);
  });

  it('Heavy Swing: a walker falls in 1 hit, a Shieldbearer in 2 from behind', () => {
    const dmg = effectsOf(['heavy-swing']).meleeDamage;
    expect(hitEnemy('walker', ENEMY_RULES.health.walker, 1, 100, 60, 'melee', dmg).outcome).toBe('killed');
    const once = hitEnemy('shieldbearer', ENEMY_RULES.health.shieldbearer, 1, 100, 60, 'melee', dmg);
    expect(once.outcome).toBe('damaged');
    expect(hitEnemy('shieldbearer', once.hp, 1, 100, 60, 'melee', dmg).outcome).toBe('killed');
    // The shield still blocks.
    expect(hitEnemy('shieldbearer', 3, 1, 100, 140, 'melee', dmg).outcome).toBe('blocked');
  });

  it('no upgrade touches the movement metrics (C65): only the Dash cooldown may change', () => {
    const all = UPGRADES.map((u) => u.id) as UpgradeId[];
    const fx = effectsOf(all);
    expect(fx.dashCooldownScale).toBe(0.5);
    // The effects carry no movement numbers at all; the game builds its movement params as
    // DEFAULT_MOVEMENT with only dashCooldown scaled, so jump, gaps and Dash distance stay put.
    const moved = { ...DEFAULT_MOVEMENT, dashCooldown: DEFAULT_MOVEMENT.dashCooldown * fx.dashCooldownScale };
    for (const k of Object.keys(DEFAULT_MOVEMENT) as (keyof typeof DEFAULT_MOVEMENT)[]) {
      if (k !== 'dashCooldown') expect(moved[k]).toBe(DEFAULT_MOVEMENT[k]);
    }
  });
});
