import { describe, expect, it } from 'vitest';
import { centredBounds } from '../src/game/render/camera';

const VIEW = [1024, 576] as const; // 32 x 18 tiles of 32 px

describe('camera bounds for small worlds', () => {
  it('a world shorter than the screen is centred vertically (W-E: 39 x 12 tiles)', () => {
    expect(centredBounds(39 * 32, 12 * 32, ...VIEW)).toEqual({ x: 0, y: -96, width: 1248, height: 576 });
  });

  it('a world narrower and shorter is centred both ways (W-M: 24 x 16)', () => {
    expect(centredBounds(24 * 32, 16 * 32, ...VIEW)).toEqual({ x: -128, y: -32, width: 1024, height: 576 });
  });

  it('a world larger than the screen keeps its own bounds (P-M: 39 x 25)', () => {
    expect(centredBounds(39 * 32, 25 * 32, ...VIEW)).toEqual({ x: 0, y: 0, width: 1248, height: 800 });
  });

  it('the world ends up exactly in the middle of the view, in whole pixels', () => {
    for (const [w, h] of [[10, 20], [16, 12], [20, 12], [24, 14], [26, 20], [32, 8]]) {
      const b = centredBounds(w * 32, h * 32, ...VIEW);
      if (w * 32 < VIEW[0]) expect(-b.x * 2 + w * 32).toBe(VIEW[0]);
      if (h * 32 < VIEW[1]) expect(-b.y * 2 + h * 32).toBe(VIEW[1]);
      expect(Number.isInteger(b.x) && Number.isInteger(b.y)).toBe(true);
    }
  });
});
