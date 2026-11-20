import { describe, expect, it } from 'vitest';
import { dashSegments } from '../src/game/render/dashes';

const xs = (segs: ReturnType<typeof dashSegments>) => segs.map(([a, b]) => [a.x, b.x]);
const len = (segs: ReturnType<typeof dashSegments>) => segs.reduce((n, [a, b]) => n + Math.hypot(b.x - a.x, b.y - a.y), 0);
const LINE = [{ x: 0, y: 0 }, { x: 20, y: 0 }];

describe('wire dashes (C52)', () => {
  it('a straight 20 px line with 4/4 dashes: 0-4, 8-12, 16-20', () => {
    expect(xs(dashSegments(LINE, 4, 4))).toEqual([[0, 4], [8, 12], [16, 20]]);
  });

  it('the pattern continues around a corner (an L-shaped wire)', () => {
    // 6 px down, then 10 px right. Along the line the dashes are 0-4 and 8-12; 8-12 is on the
    // second leg, 2-6 px from the corner.
    expect(dashSegments([{ x: 0, y: 0 }, { x: 0, y: 6 }, { x: 10, y: 6 }], 4, 4)).toEqual([
      [{ x: 0, y: 0 }, { x: 0, y: 4 }],
      [{ x: 2, y: 6 }, { x: 6, y: 6 }],
    ]);
  });

  it('an offset moves the dashes forward along the line (the travelling pulse)', () => {
    expect(xs(dashSegments(LINE, 4, 4, 2))).toEqual([[2, 6], [10, 14], [18, 20]]);
    // A dash that starts before the line is clipped to its start.
    expect(xs(dashSegments(LINE, 4, 4, 6))).toEqual([[0, 2], [6, 10], [14, 18]]);
    // Offsets wrap: a full period later the pattern is the same.
    expect(dashSegments(LINE, 4, 4, 10)).toEqual(dashSegments(LINE, 4, 4, 2));
  });

  it('about half of a line is drawn, whatever the offset', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 37 }, { x: 53, y: 37 }];
    for (const off of [0, 1.5, 3, 7.9, 100]) expect(Math.abs(len(dashSegments(pts, 4, 4, off)) - 45)).toBeLessThanOrEqual(4);
  });
});
