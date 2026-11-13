import { describe, expect, it } from 'vitest';
import { cellsHitBySwing, MELEE, swingBox, type Box, type SwingWorld } from '../../src/core/combat/melee';
import { TILE } from '../../src/core/player/metrics';

/** A tiny world from text: '#' solid, 'h' hittable + not solid (crystal), 'M' hittable + solid (mirror). */
const worldOf = (rows: string[]): SwingWorld => ({
  isSolid: (r, c) => ['#', 'M'].includes(rows[r]?.[c] ?? '#'),
  isHittable: (r, c) => ['h', 'M'].includes(rows[r]?.[c] ?? '#'),
});

/** A player body (22 x 44) standing on the floor of row `floorRow` with its centre in column `col`. */
const bodyAt = (col: number, floorRow: number): Box => {
  const cx = col * TILE + TILE / 2;
  const bottom = floorRow * TILE;
  return { left: cx - 11, right: cx + 11, top: bottom - 44, bottom };
};

describe('swingBox (C35, C62)', () => {
  const body: Box = { left: 100, right: 122, top: 200, bottom: 244 };

  it('forward right starts at the body edge and reaches ~1.3 tiles', () => {
    expect(swingBox(body, 1, 'forward')).toEqual({ left: 122, right: 122 + MELEE.reach, top: 200, bottom: 244 });
    expect(MELEE.reach).toBeCloseTo(1.3 * TILE);
  });

  it('forward left mirrors it', () => {
    expect(swingBox(body, -1, 'forward')).toEqual({ left: 100 - MELEE.reach, right: 100, top: 200, bottom: 244 });
  });

  it('up covers the space above the head, slightly wider than the body', () => {
    const b = swingBox(body, 1, 'up');
    expect(b.bottom).toBe(200);
    expect(b.top).toBe(200 - MELEE.reach);
    expect(b.left).toBeLessThan(100);
    expect(b.right).toBeGreaterThan(122);
  });
});

describe('cellsHitBySwing', () => {
  // Floor at row 4; the player stands in column 2 (body spans rows 2-3).
  const hit = (rows: string[], facing: 1 | -1, dir: 'forward' | 'up', col = 2) =>
    cellsHitBySwing(swingBox(bodyAt(col, 4), facing, dir), facing, dir, worldOf(rows));

  it('hits a crystal in the next tile at body height', () => {
    expect(hit(['#######', '#.....#', '#.....#', '#..h..#', '#######'], 1, 'forward')).toEqual([[3, 3]]);
  });

  it('hits a crystal at head height', () => {
    expect(hit(['#######', '#.....#', '#..h..#', '#.....#', '#######'], 1, 'forward')).toEqual([[2, 3]]);
  });

  it('does not reach beyond ~1.3 tiles from the body edge', () => {
    expect(hit(['########', '#......#', '#......#', '#....h.#', '########'], 1, 'forward')).toEqual([]);
  });

  it('never hits through a wall', () => {
    // Player in column 1, wall in column 2, crystal in column 3: the swing covers column 3 but the wall ends the lane.
    expect(hit(['#######', '#.....#', '#.#...#', '#.#h..#', '#######'], 1, 'forward', 1)).toEqual([]);
  });

  it('a solid device (mirror) is hit and ends the lane', () => {
    expect(hit(['########', '#......#', '#......#', '#..Mh..#', '########'], 1, 'forward')).toEqual([[3, 3]]);
  });

  it('a crystal does not end the lane', () => {
    const rows = ['########', '#......#', '#......#', '#..hM..#', '########'];
    // Reach 1.3 tiles from the body edge covers column 3 fully and the start of column 4.
    expect(hit(rows, 1, 'forward')).toEqual([[3, 3], [3, 4]]);
  });

  it('faces left', () => {
    expect(hit(['#######', '#.....#', '#.....#', '#h....#', '#######'], -1, 'forward')).toEqual([[3, 1]]);
  });

  it('up-swing hits the tile above the head, but not two tiles up', () => {
    // Standing on row 5's floor puts the head in row 3; row 2 is in reach, row 1 is not.
    const near = ['#######', '#.....#', '#.h...#', '#.....#', '#.....#', '#######'];
    expect(cellsHitBySwing(swingBox(bodyAt(2, 5), 1, 'up'), 1, 'up', worldOf(near))).toEqual([[2, 2]]);
    const far = ['#######', '#.h...#', '#.....#', '#.....#', '#.....#', '#######'];
    expect(cellsHitBySwing(swingBox(bodyAt(2, 5), 1, 'up'), 1, 'up', worldOf(far))).toEqual([]);
  });
});
