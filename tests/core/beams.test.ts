import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { beamContact, reflect, segmentLine, traceBeams } from '../../src/core/light/beams';
import { L_E } from '../../src/data/chambers/L-E';

const fixture = (grid: string[], over: Partial<ChamberDef> = {}): ChamberDef => ({
  id: 'L-E',
  name: 'fixture',
  mechanic: 'light',
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

/** Traces a fixture with the logic's own solidity and mirrors; `blocked` lists crate/enemy cells. */
const trace = (grid: string[], blocked: string[] = [], over: Partial<ChamberDef> = {}) => {
  const { model, errors } = parseChamber(fixture(grid, over));
  if (!model) throw new Error(errors.join('; '));
  const logic = new ChamberLogic(model);
  const deviceAt = new Map(model.devices.flatMap((d) => d.cells.map(([r, c]) => [`${r},${c}`, d] as const)));
  const run = () =>
    traceBeams(model, {
      isSolid: (r, c) => logic.isSolid(r, c),
      mirrorAt: (r, c) => {
        const d = deviceAt.get(`${r},${c}`);
        return d?.kind === 'mirror' ? logic.mirrorState(d.id) : undefined;
      },
      blocks: (r, c) => blocked.includes(`${r},${c}`),
    });
  return { model, logic, run };
};

describe('reflection table (C26)', () => {
  it('/ turns right→up, up→right, left→down, down→left', () => {
    expect([reflect('/', 'right'), reflect('/', 'up'), reflect('/', 'left'), reflect('/', 'down')]).toEqual(['up', 'right', 'down', 'left']);
  });
  it('\\ turns right→down, down→right, left→up, up→left', () => {
    expect([reflect('\\', 'right'), reflect('\\', 'down'), reflect('\\', 'left'), reflect('\\', 'up')]).toEqual(['down', 'right', 'up', 'left']);
  });
});

describe('traceBeams', () => {
  it('a straight beam lights the receiver it reaches', () => {
    const { run } = trace(['#######', '>....o#', '#S...E#', '#######']);
    const t = run();
    expect([...t.lit]).toEqual(['receiver@1,5']);
    expect(t.segments).toEqual([{ from: [1, 1], to: [1, 5], dir: 'right', fromEdge: true, toEdge: false }]);
  });

  it('stops at a wall, visibly at the wall face', () => {
    const t = trace(['#######', '>..#.o#', '#S...E#', '#######']).run();
    expect(t.lit.size).toBe(0);
    expect(t.segments).toEqual([{ from: [1, 1], to: [1, 2], dir: 'right', fromEdge: true, toEdge: true }]);
  });

  it('a mirror turns the beam; flipping it reroutes the beam', () => {
    // Emitter fires right into "/" (up) → receiver above. Flipped to "\" it goes down into the floor.
    const { logic, run } = trace(['#######', '#..o..#', '>../..#', '#S...E#', '#######']);
    expect([...run().lit]).toEqual(['receiver@1,3']);
    logic.hitMirror('mirror@2,3');
    expect(run().lit.size).toBe(0);
  });

  it('crates and enemies block beams (C30)', () => {
    const { run } = trace(['#######', '>....o#', '#S...E#', '#######'], ['1,3']);
    expect(run().lit.size).toBe(0);
  });

  it('only the active phase colour blocks; the inactive one lets light through (P-H shutters)', () => {
    const { logic, run } = trace(['########', '>..R..o#', '#S*...E#', '########']);
    expect(run().lit.size).toBe(0); // Red is solid
    logic.hitCrystal('crystal@2,2', new Set());
    expect([...run().lit]).toEqual(['receiver@1,6']); // Blue: the red block is an outline
  });

  it('closed doors block; open doors let light through', () => {
    const { logic, run } = trace(['########', '>..K..o#', '#S.p..E#', '########'], [], { links: [{ from: 'p', to: 'door@1,3' }] });
    expect(run().lit.size).toBe(0);
    logic.update({ pressedPlates: new Set(['p']), occupiedCells: new Set() });
    expect(run().lit.size).toBe(1);
  });

  it('records the cells the beam crosses (for knockback)', () => {
    const t = trace(['#######', '>....o#', '#S...E#', '#######']).run();
    expect([...t.cells].sort()).toEqual(['1,1', '1,2', '1,3', '1,4']);
  });

  it('a mirror loop terminates', () => {
    // Four mirrors in a ring; the beam enters the ring and would circle forever.
    const t = trace(['########', '#./..\\.#', '>.\\../.#', '#S....E#', '########']).run();
    expect(t.segments.length).toBeLessThan(20);
  });
});

describe('beam geometry and contact', () => {
  const T = 32;
  const seg = { from: [1, 1] as const, to: [1, 4] as const, dir: 'right' as const, fromEdge: true, toEdge: true };

  it('a segment runs from the emitter face to the face of what stopped it', () => {
    expect(segmentLine(seg, T)).toEqual({ x1: 32, y1: 48, x2: 160, y2: 48 });
  });

  it('contact: a box crossing the beam line touches it; one beside it does not', () => {
    expect(beamContact([seg], { left: 60, right: 82, top: 20, bottom: 64 }, T)).toEqual({ axis: 'y', at: 48 });
    expect(beamContact([seg], { left: 60, right: 82, top: 52, bottom: 96 }, T)).toBeUndefined();
  });
});

describe('L-E "First Light" (C39): the beams do what the design says', () => {
  const { model } = parseChamber(L_E);
  const logic = new ChamberLogic(model!);
  const run = () => traceBeams(model!, { isSolid: (r, c) => logic.isSolid(r, c), mirrorAt: (r, c) => logic.mirrorAt(r, c), blocks: () => false });

  it('at the start no receiver is lit; section B\'s beam crosses the walkway (col 29, rows 7-10)', () => {
    const t = run();
    expect(t.lit.size).toBe(0);
    for (const r of [7, 8, 9, 10]) expect(t.cells.has(`${r},29`)).toBe(true);
  });

  it('flipping mirror A lights receiver A (door); flipping mirror B lights receiver B (exit) and clears the walkway', () => {
    logic.hitMirror('mirrorA');
    expect(run().lit.has('receiverA')).toBe(true);
    logic.hitMirror('mirrorB');
    const t = run();
    expect(t.lit.has('receiverB')).toBe(true);
    for (const r of [7, 8, 9, 10]) expect(t.cells.has(`${r},29`)).toBe(false);
  });
});
