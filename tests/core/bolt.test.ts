import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/core/combat/melee';
import { boltEnemyLanes, boltStart, enemiesOnLanes, traceBolt } from '../../src/core/player/bolt';
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

describe('Bolt vs enemies (C103)', () => {
  // Player standing on row 4's floor in column 1: body rows 2 (upper body) and 3 (legs).
  const forward = (rows: string[], col = 1) => {
    const w = worldOf(rows);
    const b = body(col, 4);
    const s = boltStart(b, 1, 'forward');
    const path = traceBolt(s.cell, s.step, w);
    return { lanes: boltEnemyLanes(b, 1, w.isSolid, path.cells.length), path };
  };
  /** Enemies as named cells: 'w' a walker (one row), 'S' a Shieldbearer (two rows). */
  const at = (enemies: Record<string, [number, number][]>) => (r: number, c: number) =>
    Object.entries(enemies).filter(([, cells]) => cells.some(([er, ec]) => er === r && ec === c)).map(([id]) => id);

  it("a walker on the player's floor is hit, although the Bolt flies over its head", () => {
    const { lanes } = forward(['##########', '#........#', '#........#', '#........#', '##########']);
    expect(lanes.map((l) => l.row)).toEqual([2, 3]);
    expect(enemiesOnLanes(lanes, at({ walker: [[3, 6]] }))).toEqual([{ enemy: 'walker', cell: [3, 6], index: 5 }]);
  });

  it('a low wall shields a walker behind it (each lane stops at solids)', () => {
    const { lanes } = forward(['##########', '#........#', '#........#', '#...#....#', '##########']);
    expect(enemiesOnLanes(lanes, at({ walker: [[3, 6]] }))).toEqual([]);
    // ...but a walker standing on that wall is in the upper lane and is hit.
    expect(enemiesOnLanes(lanes, at({ walker: [[2, 4]] })).map((e) => e.enemy)).toEqual(['walker']);
  });

  it('nothing is hit past the mirror or crystal that stops the Bolt', () => {
    const { lanes, path } = forward(['##########', '#........#', '#..M.....#', '#........#', '##########']);
    expect(path.hit).toEqual([2, 3]);
    expect(enemiesOnLanes(lanes, at({ walker: [[3, 6]] }))).toEqual([]);
    expect(enemiesOnLanes(lanes, at({ walker: [[3, 2]] })).map((e) => e.enemy)).toEqual(['walker']);
  });

  it('lists enemies nearest first, each once (Piercing Bolt takes them all)', () => {
    const { lanes } = forward(['##########', '#........#', '#........#', '#........#', '##########']);
    const found = enemiesOnLanes(lanes, at({ far: [[3, 7]], tall: [[2, 4], [3, 4]], near: [[3, 3]] }));
    expect(found.map((e) => e.enemy)).toEqual(['near', 'tall', 'far']);
  });
});
