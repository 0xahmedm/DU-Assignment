import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef, ChamberModel } from '../../src/core/chamber/types';
import { validateChamber } from '../../src/core/chamber/validator';
import { GateMap, passThrough } from '../../src/core/gates/gates';
import { traceBeams } from '../../src/core/light/beams';
import { reachFrom } from '../../src/core/player/reach';

/** Gates (C104, C106): parsing, signals, beams, bodies and the reachability checker. */
const fixture = (grid: string[], over: Partial<ChamberDef> = {}): ChamberDef => ({
  id: 'G-E',
  name: 'fixture',
  mechanic: 'gate',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [{ id: 'A', grid }],
  links: [],
  exitAlwaysOpen: 'fixture',
  solution: [],
  intendedFeeling: '',
  ...over,
});

const parse = (grid: string[], over: Partial<ChamberDef> = {}): ChamberModel => {
  const { model, errors } = parseChamber(fixture(grid, over));
  if (!model) throw new Error(errors.join('; '));
  return model;
};

// Two rooms split by a wall to the ceiling; gate 1 links them (floor at row 4).
const ROOMS = [
  '###############',
  '#.....#.......#',
  'D..1..#...1...E',
  'DS.1.a#...1...E',
  '###############',
];

describe('gate grids', () => {
  it('the same digit drawn twice, two cells tall, is one linked pair', () => {
    const m = parse(ROOMS);
    const gate = m.devices.find((d) => d.kind === 'gate')!;
    expect(gate.id).toBe('1');
    expect(gate.gates).toEqual([
      [[2, 3], [3, 3]],
      [[2, 10], [3, 10]],
    ]);
    const map = new GateMap(m);
    expect(map.pairAt(3, 3)).toBe('1');
    expect(map.twinOf(2, 3)).toEqual([2, 10]);
    expect(map.twinOf(3, 10)).toEqual([3, 3]);
  });

  it('a lone gate, a third gate or a gate of the wrong height is rejected', () => {
    const bad = (rows: string[]) => parseChamber(fixture(rows)).errors.join();
    expect(bad(['#####', 'D.1.E', 'S.1.E', '#####'])).toMatch(/gate "1"/);
    expect(bad(['########', 'D.1.1.1E', 'S.1.1.1E', '########'])).toMatch(/gate "1"/);
    expect(bad(['#######', '#.1.1.#', 'D.1.1.E', 'S.1...E', '#######'])).toMatch(/gate "1"/);
  });

  it('a gate walled in on both sides is an error; a side with one open row (a light slot) is not', () => {
    expect(validateChamber(parse(['##########', 'DS#1#..1.E', 'D.#1#..1.E', '##########'])).errors.join()).toMatch(/walled in/);
    expect(validateChamber(parse(['##########', 'DS.1#..1.E', 'D.#1#..1.E', '##########'])).errors).toEqual([]);
  });
});

describe('gate signals', () => {
  it('an unwired pair is always on; a wired pair is on while powered, with events', () => {
    expect(new ChamberLogic(parse(ROOMS)).isGateOn('1')).toBe(true);
    const logic = new ChamberLogic(parse(ROOMS, { links: [{ from: 'a', to: '1' }] }));
    const step = (plates: string[]) => logic.update({ pressedPlates: new Set(plates), occupiedCells: new Set() });
    step([]);
    expect(logic.isGateOn('1')).toBe(false);
    step(['a']);
    expect(logic.isGateOn('1')).toBe(true);
    expect(logic.takeEvents().opened).toEqual(['1']);
    step([]);
    expect(logic.isGateOn('1')).toBe(false);
    expect(logic.takeEvents().closed).toEqual(['1']);
  });

  it('gates are never solid', () => {
    const logic = new ChamberLogic(parse(ROOMS, { links: [{ from: 'a', to: '1' }] }));
    expect(logic.isSolid(2, 3)).toBe(false);
    expect(logic.isSolid(3, 10)).toBe(false);
  });
});

describe('beams through gates', () => {
  // An emitter fires right into gate 1; the twin sends the beam on to receiver o behind the wall.
  const LIGHT = [
    '###############',
    '>..1..#...1..o#',
    'D..1..#...1...E',
    'S.....#.......E',
    '###############',
  ];
  const trace = (grid: string[], on = true) => {
    const m = parse(grid);
    const logic = new ChamberLogic(m);
    return traceBeams(m, { isSolid: (r, c) => logic.isSolid(r, c), mirrorAt: () => undefined, blocks: () => false, gateOn: () => on });
  };

  it('a sideways beam leaves the twin the same way and lights what is beyond', () => {
    const t = trace(LIGHT);
    expect(t.lit.has('receiver@1,13')).toBe(true);
    expect(t.segments.map((s) => [s.from, s.to])).toEqual([
      [[1, 1], [1, 3]],
      [[1, 10], [1, 13]],
    ]);
  });

  it('an off pair is an empty frame: the beam passes straight on', () => {
    const t = trace(LIGHT, false);
    expect(t.lit.size).toBe(0);
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0]!.to).toEqual([1, 5]);
  });

  it('vertical beams pass gates as air', () => {
    const t = trace(['#######', '#.v...#', 'D.1.1.E', 'S.1.1.E', '#.o####', '#######']);
    expect(t.lit.has('receiver@4,2')).toBe(true);
  });

  it('a blocker beside the twin stops the beam there', () => {
    const t = trace(['###############', '>..1..#...1#.o#', 'D..1..#...1...E', 'S.....#.......E', '###############']);
    expect(t.lit.size).toBe(0);
    expect(t.segments[1]).toMatchObject({ from: [1, 10], to: [1, 10], toEdge: true });
  });
});

describe('bodies through gates', () => {
  const m = parse(ROOMS);
  const logic = new ChamberLogic(m);
  const pairs = new GateMap(m).pairs;
  const T = 32;
  // A 22 × 44 body standing on the floor (row 4), its centre just short of gate 1a's centre line.
  const body = (cx: number) => ({ left: cx - 11, top: 4 * T - 44, width: 22, height: 44 });
  const solid = (r: number, c: number) => logic.isSolid(r, c);

  it('crossing the centre line moving right comes out beside the twin, on its right, at the same height', () => {
    const line = 3 * T + 16;
    const pass = passThrough(pairs, body(line + 2), line - 2, T, () => true, solid)!;
    expect(pass).toMatchObject({ pair: '1', dir: 1, from: [[2, 3], [3, 3]], to: [[2, 10], [3, 10]] });
    expect(pass.left).toBeCloseTo(11 * T + 0.5);
    expect(pass.top).toBe(4 * T - 44);
  });

  it('moving left comes out on the twin\'s left', () => {
    const line = 10 * T + 16;
    const pass = passThrough(pairs, body(line - 2), line + 2, T, () => true, solid)!;
    expect(pass.dir).toBe(-1);
    expect(pass.left + 22).toBeCloseTo(3 * T - 0.5);
  });

  it('nothing happens when the pair is off, before the line, or above the gate', () => {
    const line = 3 * T + 16;
    expect(passThrough(pairs, body(line + 2), line - 2, T, () => false, solid)).toBeUndefined();
    expect(passThrough(pairs, body(line - 1), line - 4, T, () => true, solid)).toBeUndefined();
    expect(passThrough(pairs, { ...body(line + 2), top: 0 }, line - 2, T, () => true, solid)).toBeUndefined();
  });

  it('a gate whose twin is blocked on the exit side carries nobody', () => {
    const blocked = parse(['###############', '#.....#.......#', 'D..1..#...1#..E', 'DS.1.a#...1...E', '###############']);
    const l = new ChamberLogic(blocked);
    const line = 3 * T + 16;
    expect(passThrough(new GateMap(blocked).pairs, body(line + 2), line - 2, T, () => true, (r, c) => l.isSolid(r, c))).toBeUndefined();
  });
});

describe('reachability through gates', () => {
  it('the far room is reachable only through the gate, carrying a crate too', () => {
    const m = parse(ROOMS);
    const logic = new ChamberLogic(m);
    const world = { width: m.width, height: m.height, isSolid: (r: number, c: number) => logic.isSolid(r, c) };
    const gates = new GateMap(m).pairs.map((d) => d.gates!);
    expect(reachFrom(world, { row: 4, col: 1 }).canReach(4, 12)).toBe(false);
    expect(reachFrom(world, { row: 4, col: 1 }, { gates }).canReach(4, 12)).toBe(true);
    expect(reachFrom(world, { row: 4, col: 12 }, { gates, carrying: true }).canReach(4, 1)).toBe(true);
  });
});
