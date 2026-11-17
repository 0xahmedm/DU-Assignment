import { describe, expect, it } from 'vitest';
import { ENEMY_RULES, hitEnemy, playerBehind, touches } from '../../src/core/combat/enemies';
import { loseHeart, mend, newHearts } from '../../src/core/run/hearts';

describe('enemy hits (C62)', () => {
  it('a walker takes 2 hits, from either side', () => {
    let r = hitEnemy('walker', ENEMY_RULES.health.walker, 1, 100, 140, 'melee');
    expect(r).toEqual({ outcome: 'damaged', hp: 1 });
    r = hitEnemy('walker', r.hp, 1, 100, 60, 'melee');
    expect(r).toEqual({ outcome: 'killed', hp: 0 });
  });

  it('a Shieldbearer blocks melee and Bolt from the front (clang)', () => {
    // Facing right (+1), attacker on its right = in front.
    expect(hitEnemy('shieldbearer', 3, 1, 100, 140, 'melee').outcome).toBe('blocked');
    expect(hitEnemy('shieldbearer', 3, 1, 100, 140, 'bolt').outcome).toBe('blocked');
  });

  it('a Shieldbearer takes 3 hits from behind', () => {
    let r = hitEnemy('shieldbearer', 3, 1, 100, 60, 'melee');
    r = hitEnemy('shieldbearer', r.hp, 1, 100, 60, 'bolt');
    expect(r.outcome).toBe('damaged');
    r = hitEnemy('shieldbearer', r.hp, 1, 100, 60, 'melee');
    expect(r.outcome).toBe('killed');
  });

  it('beams kill any enemy outright, shield or not (C27)', () => {
    expect(hitEnemy('shieldbearer', 3, 1, 100, 140, 'beam')).toEqual({ outcome: 'killed', hp: 0 });
    expect(hitEnemy('walker', 2, -1, 100, 140, 'beam').outcome).toBe('killed');
  });
});

describe('Shieldbearer notices a player behind it', () => {
  const enemy = { left: 100, right: 130, top: 200, bottom: 246 };
  const at = (x: number, top = 202) => ({ left: x, right: x + 22, top, bottom: top + 44 });

  it('behind, close, same height: yes', () => {
    expect(playerBehind(enemy, 1, at(50))).toBe(true);
  });
  it('in front: no', () => {
    expect(playerBehind(enemy, 1, at(160))).toBe(false);
  });
  it('too far, or on another level: no', () => {
    expect(playerBehind(enemy, 1, at(-200))).toBe(false);
    expect(playerBehind(enemy, 1, at(50, 100))).toBe(false);
  });
});

describe('contact (C55)', () => {
  it('overlap costs a heart; a graze within the inset does not', () => {
    const enemy = { left: 100, right: 126, top: 200, bottom: 226 };
    expect(touches({ left: 110, right: 132, top: 190, bottom: 234 }, enemy)).toBe(true);
    expect(touches({ left: 124, right: 146, top: 190, bottom: 234 }, enemy)).toBe(false);
  });
});

describe('hearts (C54, C66)', () => {
  it('3 per run; each defeat costs one; the run ends at zero', () => {
    let h = newHearts();
    let r = loseHeart(h);
    expect(r).toEqual({ hearts: { current: 2, max: 3 }, runOver: false });
    r = loseHeart(r.hearts);
    r = loseHeart(r.hearts);
    expect(r.runOver).toBe(true);
    h = r.hearts;
    expect(h.current).toBe(0);
  });

  it('Mend restores one, or adds a heart when full', () => {
    expect(mend({ current: 2, max: 3 })).toEqual({ current: 3, max: 3 });
    expect(mend({ current: 3, max: 3 })).toEqual({ current: 4, max: 4 });
  });
});
