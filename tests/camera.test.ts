import { describe, expect, it } from 'vitest';
import { bandBounds, centredBounds } from '../src/game/render/camera';

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

describe('bandBounds (C116): the world between the HUD bars', () => {
  const W = 1024, H = 576, TOP = 48, BOTTOM = 26; // band = 502
  it('centres a short world in the band, not the whole screen', () => {
    const b = bandBounds(28 * 32, 7 * 32, W, H, TOP, BOTTOM); // 224 tall
    expect(b.height).toBe(H);
    // camera scrollY = b.y: the world top lands at screen y = TOP + (502 - 224) / 2 = 187
    expect(-b.y).toBe(TOP + (502 - 224) / 2);
  });
  it('lets a tall world scroll until its top is under the top bar and its bottom above the bottom bar', () => {
    const b = bandBounds(32 * 32, 20 * 32, W, H, TOP, BOTTOM); // 640 tall
    expect(b.y).toBe(-TOP);
    expect(b.y + b.height - H).toBe(640 + BOTTOM - H); // last scroll: world bottom at screen H - BOTTOM
  });
});
