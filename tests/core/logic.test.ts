import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { W_E } from '../../src/data/chambers/W-E';

const NONE = new Set<string>();
const report = (plates: string[] = [], occupied: string[] = []) => ({
  pressedPlates: new Set(plates),
  occupiedCells: new Set(occupied),
});

const logicFor = (def: ChamberDef) => {
  const { model, errors } = parseChamber(def);
  if (!model) throw new Error(errors.join('; '));
  return { logic: new ChamberLogic(model), model };
};

const fixture = (grid: string[], over: Partial<ChamberDef> = {}): ChamberDef => ({
  id: 'L-E',
  name: 'fixture',
  mechanic: 'phase',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [{ id: 'A', grid }],
  links: [],
  solution: [],
  intendedFeeling: '',
  ...over,
});

describe('signals: W-E', () => {
  it('the door between sections opens only while plate p is pressed', () => {
    const { logic } = logicFor(W_E);
    logic.update(report());
    expect(logic.isOpen('doorAB')).toBe(false);
    expect(logic.isSolid(9, 19)).toBe(true);

    logic.update(report(['p']));
    expect(logic.isOpen('doorAB')).toBe(true);
    expect(logic.isSolid(9, 19)).toBe(false);
    expect(logic.takeEvents().opened).toEqual(['doorAB']);

    logic.update(report());
    expect(logic.isOpen('doorAB')).toBe(false);
    expect(logic.takeEvents().closed).toEqual(['doorAB']);
  });

  it('a door never closes on an occupant (C30)', () => {
    const { logic } = logicFor(W_E);
    logic.update(report(['p']));
    logic.update(report([], ['10,19'])); // plate released while someone stands in the doorway
    expect(logic.isOpen('doorAB')).toBe(true);
    logic.update(report()); // doorway vacated
    expect(logic.isOpen('doorAB')).toBe(false);
  });

  it('the exit shows one lamp per input and opens when all are on', () => {
    const { logic } = logicFor(W_E);
    logic.update(report());
    expect(logic.exitLamps()).toEqual([{ source: 'q', on: false }]);
    logic.update(report(['q']));
    expect(logic.exitLamps()).toEqual([{ source: 'q', on: true }]);
    expect(logic.isOpen('exit')).toBe(true);
  });
});

describe('signals: AND exits and trapdoors', () => {
  const grid = ['########', '#S.x.yE#', '###=####', '########'];
  const def = fixture(grid, {
    links: [
      { from: ['x', 'y'], to: 'exit' },
      { from: 'x', to: 'trapdoor@2,3' },
    ],
  });

  it('an exit with two inputs needs both (AND by default)', () => {
    const { logic } = logicFor(def);
    logic.update(report(['x']));
    expect(logic.isOpen('exit')).toBe(false);
    expect(logic.exitLamps().map((l) => l.on)).toEqual([true, false]);
    logic.update(report(['x', 'y']));
    expect(logic.isOpen('exit')).toBe(true);
  });

  it('a trapdoor is solid until powered', () => {
    const { logic } = logicFor(def);
    logic.update(report());
    expect(logic.isSolid(2, 3)).toBe(true);
    logic.update(report(['x']));
    expect(logic.isSolid(2, 3)).toBe(false);
  });
});

describe('phase (C28, C30)', () => {
  const grid = ['#######', '#S*RB.#', '#######'];

  it('one red/blue state: only the active colour is solid; a crystal swaps it', () => {
    const { logic } = logicFor(fixture(grid));
    expect(logic.isSolid(1, 3)).toBe(true); // red
    expect(logic.isSolid(1, 4)).toBe(false); // blue
    logic.hitCrystal('crystal@1,2', NONE);
    expect(logic.phase).toBe('blue');
    expect(logic.isSolid(1, 3)).toBe(false);
    expect(logic.isSolid(1, 4)).toBe(true);
    expect(logic.takeEvents().phaseSwapped).toBe(true);
  });

  it('ghost rule: a block that turns solid on an occupant stays passable until vacated', () => {
    const { logic } = logicFor(fixture(grid));
    logic.hitCrystal('crystal@1,2', new Set(['1,4'])); // someone stands inside the blue block
    expect(logic.isSolid(1, 4)).toBe(false);
    expect(logic.isGhosted(1, 4)).toBe(true);
    logic.update(report([], ['1,4'])); // still inside
    expect(logic.isSolid(1, 4)).toBe(false);
    logic.update(report()); // stepped out
    expect(logic.isSolid(1, 4)).toBe(true);
  });

  it('crystals are not solid', () => {
    const { logic } = logicFor(fixture(grid));
    expect(logic.isSolid(1, 2)).toBe(false);
  });
});

describe('mirrors (C26, C42)', () => {
  const grid = ['########', '#S./\\.p#', '########'];

  it('a free mirror flips between the two states when hit', () => {
    const { logic } = logicFor(fixture(grid));
    expect(logic.mirrorState('mirror@1,3')).toBe('/');
    expect(logic.hitMirror('mirror@1,3')).toBe(true);
    expect(logic.mirrorState('mirror@1,3')).toBe('\\');
    expect(logic.hitMirror('mirror@1,3')).toBe(true);
    expect(logic.mirrorState('mirror@1,3')).toBe('/');
  });

  it('a mirror wired to a plate is locked, and flips while the plate is pressed', () => {
    const { logic } = logicFor(fixture(grid, { links: [{ from: 'p', to: 'mirror@1,4' }] }));
    expect(logic.isMirrorLocked('mirror@1,4')).toBe(true);
    expect(logic.hitMirror('mirror@1,4')).toBe(false);
    expect(logic.mirrorState('mirror@1,4')).toBe('\\');
    logic.update(report(['p']));
    expect(logic.mirrorState('mirror@1,4')).toBe('/');
    logic.update(report());
    expect(logic.mirrorState('mirror@1,4')).toBe('\\');
  });
});
