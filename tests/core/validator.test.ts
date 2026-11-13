import { describe, expect, it } from 'vitest';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { validateChamber } from '../../src/core/chamber/validator';
import { W_E } from '../../src/data/chambers/W-E';

const fixture = (grid: string[], over: Partial<ChamberDef> = {}): ChamberDef => ({
  id: 'W-E',
  name: 'fixture',
  mechanic: 'weight',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [{ id: 'A', grid }],
  links: [{ from: 'p', to: 'exit' }],
  solution: [],
  intendedFeeling: '',
  ...over,
});

const report = (def: ChamberDef) => {
  const { model, errors } = parseChamber(def);
  if (!model) throw new Error(`fixture failed to parse: ${errors.join('; ')}`);
  return validateChamber(model);
};

describe('validateChamber', () => {
  it('accepts W-E with no errors and no warnings', () => {
    expect(report(W_E)).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a minimal valid chamber', () => {
    expect(report(fixture(['#####', '#S.pE', '#####'])).errors).toEqual([]);
  });

  it('flags a plate that is not on solid ground', () => {
    expect(report(fixture(['#####', '#S.pE', '#...#', '#####'])).errors.join()).toMatch(/plate "p" .* not on solid ground/);
  });

  it('flags an exit with no inputs', () => {
    expect(report(fixture(['#####', '#S.pE', '#####'], { links: [] })).errors.join()).toMatch(/exit has no inputs/);
    expect(report(fixture(['#####', '#S.pE', '#####'], { links: [], exitAlwaysOpen: 'doorway' })).errors).toEqual([]);
    expect(report(fixture(['#####', '#S.pE', '#####'], { exitAlwaysOpen: 'oops' })).errors.join()).toMatch(/exitAlwaysOpen is declared/);
  });

  it('flags an open border', () => {
    expect(report(fixture(['#####', '.S.pE', '#####'])).errors.join()).toMatch(/open border at row 1 col 0/);
  });

  it('flags links from or to the wrong kinds of device', () => {
    const r = report(fixture(['######', '#S*pE#', '######'], { links: [{ from: 'crystal@1,2', to: 'p' }, { from: 'p', to: 'exit' }] }));
    expect(r.errors.join()).toMatch(/cannot send a signal/);
    expect(r.errors.join()).toMatch(/cannot be driven by a signal/);
  });

  it('warns about a crate without a dispenser, unless declared safe', () => {
    const grid = ['######', '#SC.pE', '######'];
    expect(report(fixture(grid)).warnings.join()).toMatch(/no dispenser above it/);
    expect(report(fixture(grid, { cratesCannotBeLost: 'no pits' })).warnings).toEqual([]);
  });

  it('accepts a crate fed by a dispenser in the same column', () => {
    expect(report(fixture(['######', '#.U..#', '#....#', '#SC.pE', '######'])).warnings).toEqual([]);
  });
});
