import { describe, expect, it } from 'vitest';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { W_E } from '../../src/data/chambers/W-E';

const base = (over: Partial<ChamberDef>): ChamberDef => ({
  id: 'W-E',
  name: 'fixture',
  mechanic: 'weight',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [],
  links: [],
  solution: [],
  intendedFeeling: '',
  ...over,
});

describe('parseChamber: W-E (real data)', () => {
  const { model, errors } = parseChamber(W_E);

  it('parses without errors', () => {
    expect(errors).toEqual([]);
    expect(model).toBeDefined();
  });

  it('stitches section B onto A through the shared door column', () => {
    expect(model!.width).toBe(39); // 20 + 20 - 1 shared column
    expect(model!.height).toBe(12);
    expect(model!.sectionOrigins).toEqual({ A: [0, 0], B: [0, 19] });
    expect(model!.grid[9]![19]).toBe('|');
  });

  it('finds start, crates and devices', () => {
    expect(model!.start).toEqual([10, 2]);
    expect(model!.spawns.filter((s) => s.kind === 'crate')).toHaveLength(2);
    const byId = new Map(model!.devices.map((d) => [d.id, d]));
    expect(byId.get('p')?.kind).toBe('plate');
    expect(byId.get('q')?.kind).toBe('plate');
    expect(byId.get('doorAB')?.cells).toEqual([[9, 19], [10, 19]]);
    expect(byId.get('exit')?.cells).toHaveLength(2);
    expect(model!.devices.filter((d) => d.kind === 'dispenser')).toHaveLength(1);
  });

  it('resolves links, with OR for doors and AND for the exit', () => {
    expect(model!.links).toEqual([
      { from: ['p'], to: 'doorAB', logic: 'OR' },
      { from: ['q'], to: 'exit', logic: 'AND' },
    ]);
  });
});

describe('parseChamber: structural errors', () => {
  const sec = (grid: string[], extra: object = {}) => ({ id: 'A', grid, ...extra });

  it('rejects rows of different widths', () => {
    const r = parseChamber(base({ sections: [sec(['####', '#S#', '####'])] }));
    expect(r.errors.join()).toMatch(/row 1: width 3, expected 4/);
  });

  it('rejects unknown symbols', () => {
    const r = parseChamber(base({ sections: [sec(['###', '#S?', '###'])] }));
    expect(r.errors.join()).toMatch(/unknown symbol "\?"/);
  });

  it('requires exactly one start', () => {
    expect(parseChamber(base({ sections: [sec(['###', '#.#', '###'])] })).errors.join()).toMatch(/no start/);
    expect(parseChamber(base({ sections: [sec(['####', '#SS#', '####'])] })).errors.join()).toMatch(/more than one start/);
  });

  it('requires attach for later sections', () => {
    const r = parseChamber(base({ sections: [sec(['###', '#S#', '###']), { id: 'B', grid: ['###'] }] }));
    expect(r.errors.join()).toMatch(/needs "attach"/);
  });

  it('reports overlapping sections that disagree', () => {
    const r = parseChamber(
      base({
        sections: [sec(['###', '#S.', '###']), { id: 'B', grid: ['###', 'C.#', '###'], attach: { at: [1, 0], onto: [1, 2] } }],
      }),
    );
    expect(r.errors.join()).toMatch(/overlaps "\." .* with "C"/);
  });

  it('groups a repeated plate letter into one strip device', () => {
    const r = parseChamber(base({ sections: [sec(['#######', '#Syyyy#', '#######'])] }));
    expect(r.errors).toEqual([]);
    const strip = r.model!.devices.find((d) => d.id === 'y');
    expect(strip?.cells).toHaveLength(4);
  });

  it('reports names pointing at empty cells and links to unknown devices', () => {
    const r = parseChamber(
      base({
        sections: [sec(['####', '#Sp#', '####'])],
        names: { 'A:1,1': 'nothingHere' },
        links: [{ from: 'p', to: 'ghost' }],
      }),
    );
    expect(r.errors.join()).toMatch(/holds no device/);
    expect(r.errors.join()).toMatch(/unknown device "ghost"/);
  });
});
