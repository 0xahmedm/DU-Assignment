import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/core/combat/melee';
import { boltStart, traceBolt } from '../../src/core/player/bolt';
import { TILE } from '../../src/core/player/metrics';

/** '#' solid, 'M' solid + hittable (mirror), '*' hittable, not solid (crystal), 'R' solid phase block. */
const worldOf = (rows: string[]) => ({
  isSolid: (r: number, c: number) => ['#', 'M', 'R'].includes(rows[r]?.[c] ?? '#'),
  isHittable: (r: number, c: number) => ['M', '*'].includes(rows[r]?.[c] ?? '#'),
});

/** Player body (22 x 44) standing on the floor of row `floorRow`, centred in column `col`. */
const body = (col: number, floorRow: number): Box => {
  const cx = col * TILE + TILE / 2;
  return { left: cx - 11, right: cx + 11, top: floorRow * TILE - 44, bottom: floorRow * TILE };
};

describe('Bolt (C23, C50)', () => {
  it('forward Bolt flies along the upper-body row, not the feet row', () => {
    // Standing on row 4's floor: body covers rows 2 (top part) and 3. Upper body = row 2.
    expect(boltStart(body(2, 4), 1, 'forward').cell).toEqual([2, 2]);
  });

  it('up-Bolt starts in the head cell and goes straight up', () => {
    const s = boltStart(body(3, 6), 1, 'up');
    expect(s.cell).toEqual([4, 3]);
    expect(s.step).toEqual([-1, 0]);
  });

  it('hits the first mirror on its line, however far', () => {
    const rows = ['############', '#..........#', '#S.......M.#', '#..........#', '############'];
    const s = boltStart(body(1, 4), 1, 'forward');
    expect(traceBolt(s.cell, s.step, worldOf(rows)).hit).toEqual([2, 9]);
  });

  it('hits a crystal and stops there (it does not fly on through it)', () => {
    const rows = ['##########', '#........#', '#S..*..M.#', '#........#', '##########'];
    const s = boltStart(body(1, 4), 1, 'forward');
    const p = traceBolt(s.cell, s.step, worldOf(rows));
    expect(p.hit).toEqual([2, 4]);
  });

  it('is stopped by walls and by the solid phase colour (P-H: the blue block shadows the Bolt)', () => {
    const rows = ['##########', '#........#', '#S..R..M.#', '#........#', '##########'];
    const s = boltStart(body(1, 4), 1, 'forward');
    const p = traceBolt(s.cell, s.step, worldOf(rows));
    expect(p.hit).toBeUndefined();
    expect(p.blocked).toBe(true);
    expect(p.cells.at(-1)).toEqual([2, 3]);
  });

  it('up-Bolt reaches a mirror high above, out of melee reach', () => {
    const rows = ['#####', '#.M.#', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'];
    const s = boltStart(body(2, 7), 1, 'up');
    expect(traceBolt(s.cell, s.step, worldOf(rows)).hit).toEqual([1, 2]);
  });
});
