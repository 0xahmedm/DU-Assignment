import { describe, expect, it } from 'vitest';
import { dropCell, feedingDispenser } from '../../src/core/chamber/dispensers';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { W_E } from '../../src/data/chambers/W-E';

const NONE = new Set<string>();

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
  exitAlwaysOpen: 'fixture',
  solution: [],
  intendedFeeling: '',
  ...over,
});

const build = (def: ChamberDef) => {
  const { model, errors } = parseChamber(def);
  if (!model) throw new Error(errors.join('; '));
  return { model, logic: new ChamberLogic(model) };
};

describe('ChamberLogic.resolveHits (melee / Bolt hits)', () => {
  it('a crystal hit swaps the phase', () => {
    const { logic } = build(fixture(['#######', '#S*R.E#', '#######']));
    const r = logic.resolveHits([[1, 2]], NONE);
    expect(r.crystal).toBe('crystal@1,2');
    expect(logic.phase).toBe('blue');
  });

  it('one swing swaps the phase only once, even if it reaches two crystals', () => {
    const { logic } = build(fixture(['########', '#S**R.E#', '########']));
    logic.resolveHits([[1, 2], [1, 3]], NONE);
    expect(logic.phase).toBe('blue');
  });

  it('free mirrors flip; plate-wired mirrors refuse (C42)', () => {
    const { logic } = build(fixture(['#########', '#S/.\\.pE#', '#########'], { links: [{ from: 'p', to: 'mirror@1,4' }] }));
    const r = logic.resolveHits([[1, 2], [1, 4]], NONE);
    expect(r.flipped).toEqual(['mirror@1,2']);
    expect(r.locked).toEqual(['mirror@1,4']);
    expect(logic.mirrorState('mirror@1,2')).toBe('\\');
  });

  it('dispensers are reported so the game can recall their crate (C50)', () => {
    const { logic } = build(fixture(['######', '#.U..#', '#....#', '#SC.E#', '######']));
    expect(logic.resolveHits([[1, 2]], NONE).dispensers).toEqual(['dispenser@1,2']);
  });

  it('terrain and empty cells are ignored', () => {
    const { logic } = build(fixture(['#####', '#S.E#', '#####']));
    expect(logic.resolveHits([[0, 0], [1, 2]], NONE)).toEqual({ crystal: undefined, flipped: [], locked: [], dispensers: [] });
  });
});

describe('unwired exit', () => {
  it('is open from the start when declared exitAlwaysOpen', () => {
    const { logic } = build(fixture(['#####', '#S.E#', '#####']));
    expect(logic.isOpen('exit')).toBe(true);
    expect(logic.isSolid(1, 3)).toBe(false);
  });
});

describe('dispensers (C50)', () => {
  it('pairs a crate with the dispenser straight above it', () => {
    const { model } = build(W_E);
    const crate = model.spawns.filter((s) => s.kind === 'crate').find((s) => s.cell[1] > 19)!; // section B's crate
    const id = feedingDispenser(model, crate.cell);
    expect(id).toBeDefined();
    const [r, c] = dropCell(model, id!)!;
    expect(c).toBe(crate.cell[1]);
    expect(r).toBeLessThan(crate.cell[0]);
  });

  it('a wall between dispenser and crate breaks the pairing', () => {
    const { model } = build(fixture(['######', '#.U..#', '#.#..#', '#SC.E#', '######']));
    expect(feedingDispenser(model, [3, 2])).toBeUndefined();
  });
});
