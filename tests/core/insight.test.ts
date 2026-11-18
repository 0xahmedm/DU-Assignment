import { describe, expect, it } from 'vitest';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { traceBeams, type BeamWorld } from '../../src/core/light/beams';
import { nearestFreeMirror, nearestSource, targetsOf, withMirrorFlipped } from '../../src/core/light/insight';
import { TILE } from '../../src/core/player/metrics';
import { CHAMBERS } from '../../src/data/chambers';

const fixture = (grid: string[]): ChamberDef => ({
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
});

const worldOf = (def: ChamberDef) => {
  const { model, errors } = parseChamber(def);
  if (!model) throw new Error(errors.join('; '));
  const logic = new ChamberLogic(model);
  const world: BeamWorld = { isSolid: (r, c) => logic.isSolid(r, c), mirrorAt: (r, c) => logic.mirrorAt(r, c), blocks: () => false };
  return { model, logic, world };
};

describe('Insight (C67)', () => {
  // The emitter fires right into a `/` mirror, which sends the beam up into the receiver.
  const grid = ['#######', '#..o..#', '>../..#', '#S...E#', '#######'];

  it('shows what a flip would do, without flipping anything', () => {
    const { model, logic, world } = worldOf(fixture(grid));
    const mirror = nearestFreeMirror(model, (id) => logic.isMirrorLocked(id), 3.5 * TILE, 3.5 * TILE)!;
    expect(mirror).toBeDefined();
    expect(traceBeams(model, world).lit.size).toBe(1);
    const ghost = traceBeams(model, withMirrorFlipped(world, mirror));
    expect(ghost.lit.size).toBe(0); // flipped, the beam would go down into the floor
    expect(ghost.segments.at(-1)!.dir).toBe('down');
    expect(logic.mirrorState(mirror.id)).toBe('/'); // the real mirror is untouched
    expect(traceBeams(model, world).lit.size).toBe(1);
  });

  it('only looks at mirrors within its radius', () => {
    const { model, logic } = worldOf(fixture(grid));
    expect(nearestFreeMirror(model, (id) => logic.isMirrorLocked(id), 30 * TILE, 30 * TILE)).toBeUndefined();
  });

  it('ignores locked (plate-wired) mirrors: hits cannot flip them (C42)', () => {
    const { model, logic } = worldOf(CHAMBERS['L-H']!);
    const locked = model.devices.filter((d) => d.kind === 'mirror' && logic.isMirrorLocked(d.id));
    expect(locked.length).toBeGreaterThan(0);
    for (const m of locked) {
      const [r, c] = m.cells[0]!;
      const found = nearestFreeMirror(model, (id) => logic.isMirrorLocked(id), (c + 0.5) * TILE, (r + 0.5) * TILE, TILE / 2);
      expect(found?.id).not.toBe(m.id);
    }
  });

  it('lists what a plate is wired to', () => {
    const { model } = worldOf(CHAMBERS['W-E']!);
    const plate = model.devices.find((d) => d.kind === 'plate' && model.links.some((l) => l.from.includes(d.id)))!;
    const [r, c] = plate.cells[0]!;
    expect(nearestSource(model, (c + 0.5) * TILE, (r + 0.5) * TILE)?.id).toBe(plate.id);
    const targets = targetsOf(model, plate.id).map((d) => d.id);
    const expected = model.links.filter((l) => l.from.includes(plate.id)).map((l) => l.to);
    expect(targets.sort()).toEqual([...new Set(expected)].sort());
    expect(targets.length).toBeGreaterThan(0);
  });
});
