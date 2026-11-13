import { describe, expect, it } from 'vitest';
import { METRICS, TILE } from '../../src/core/player/metrics';
import { THROW, throwArc, throwTarget, throwVelocity } from '../../src/core/player/throw';

describe('Throw (C29: lands exactly 5 tiles ahead)', () => {
  const feet = 10 * TILE;

  it('lands in the column 5 ahead, from anywhere inside the player\'s column', () => {
    for (const x of [3 * TILE + 1, 3 * TILE + 16, 4 * TILE - 1]) {
      expect(Math.floor(throwTarget(x, feet, 1).x / TILE)).toBe(3 + METRICS.throwTiles);
      expect(Math.floor(throwTarget(x, feet, -1).x / TILE)).toBe(3 - METRICS.throwTiles);
    }
  });

  it('lands resting on the player\'s floor, centred in its tile', () => {
    const t = throwTarget(3 * TILE + 10, feet, 1);
    expect(t).toEqual({ x: 8 * TILE + TILE / 2, y: feet - TILE / 2 });
  });

  it('clears a 4-tile gap but not more: 5 ahead is the first tile past a 4-gap', () => {
    // Standing on the last floor tile (col 3), gap cols 4-7, landing platform starts at col 8.
    expect(Math.floor(throwTarget(3 * TILE + 16, feet, 1).x / TILE)).toBe(8);
  });

  it('the arc starts in the hands, ends on the target and rises in between', () => {
    const start = { x: 100, y: 200 };
    const target = { x: 260, y: 240 };
    expect(throwArc(start, target, 0)).toEqual(start);
    expect(throwArc(start, target, 1)).toEqual(target);
    expect(throwArc(start, target, 0.5).y).toBeLessThan(start.y);
  });

  it('velocity matches the arc (numerical derivative)', () => {
    const start = { x: 100, y: 200 };
    const target = { x: 260, y: 240 };
    const h = 1e-4;
    for (const t of [0.1, 0.5, 0.9]) {
      const a = throwArc(start, target, t);
      const b = throwArc(start, target, t + h);
      const v = throwVelocity(start, target, t);
      expect(v.x).toBeCloseTo((b.x - a.x) / (h * THROW.duration), 3);
      expect(v.y).toBeCloseTo((b.y - a.y) / (h * THROW.duration), 1);
    }
  });
});
