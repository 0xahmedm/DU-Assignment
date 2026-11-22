import { describe, expect, it } from 'vitest';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef } from '../../src/core/chamber/types';
import { validateChamber } from '../../src/core/chamber/validator';
import { enemiesLeft, enemiesRespawn } from '../../src/core/run/clearing';
import { addHeartLost, startAttempt } from '../../src/core/run/telemetry';
import { CHAMBERS } from '../../src/data/chambers';
import { controlsLine, CONTROL_ROWS, keysOf } from '../../src/game/input/controlsText';

/** Exits need the room's enemies defeated (C109); beams cost hearts (C110); controls written out (C111). */
describe('exits and enemies (C109)', () => {
  it('counts the enemies still to defeat, leaving the ones the solution uses', () => {
    expect(enemiesLeft(3, 0)).toBe(3);
    expect(enemiesLeft(1, 1)).toBe(0);
    expect(enemiesLeft(2, 1)).toBe(1);
    expect(enemiesLeft(0, 1)).toBe(0);
  });

  it('respawns only in a chamber whose enemies are all used; combat rooms never', () => {
    expect(enemiesRespawn('chamber', 1, 1)).toBe(true);
    expect(enemiesRespawn('chamber', 1, 0)).toBe(false);
    expect(enemiesRespawn('chamber', 2, 1)).toBe(false);
    expect(enemiesRespawn('connector', 3, 0)).toBe(false);
  });

  it('the plate walkers are the used enemies; P-M\'s bridge guard must be defeated', () => {
    const enemies = (def: ChamberDef) => parseChamber(def).model!.spawns.filter((s) => s.kind !== 'crate').length;
    const census = Object.values(CHAMBERS)
      .filter((d) => enemies(d) > 0)
      .map((d) => [d.id, enemies(d), d.enemiesUsed ?? 0]);
    expect(census).toEqual([
      ['W-M', 1, 1],
      ['W-H', 1, 1],
      ['L-H', 1, 1],
      ['P-M', 1, 0],
      ['P-H', 1, 1],
      ['G-M', 1, 1],
    ]);
  });

  it('the validator refuses more used enemies than there are', () => {
    const { model } = parseChamber({ ...CHAMBERS['W-E']!, enemiesUsed: 1 });
    expect(validateChamber(model!).errors.join()).toMatch(/enemiesUsed/);
  });
});

describe('beam hits in telemetry (C110)', () => {
  it('a beam hit adds a heart lost without a defeat', () => {
    const a = addHeartLost(startAttempt({ id: 'L-E', kind: 'chamber', mode: 'select', started: 'now' }));
    expect(a).toMatchObject({ heartsLost: 1, defeats: 0 });
  });
});

describe('controls written out (C111)', () => {
  it('the in-game line shows the base controls and only the abilities the room allows', () => {
    const base = controlsLine(new Set());
    expect(base).toContain(`jump ${keysOf('jump')}`);
    expect(base).not.toMatch(/throw|bolt|dash/);
    const all = controlsLine(new Set(['throw', 'bolt', 'dash'] as const));
    expect(all).toContain('throw V / L');
    expect(all).toContain('dash Shift / O');
    expect(base).not.toContain('interact');
    expect(controlsLine(new Set(), true)).toContain('interact E'); // reward rooms (C116)
  });

  it('the Controls screen lists every binding, abilities marked', () => {
    expect(CONTROL_ROWS.find((r) => r.action.startsWith('Jump'))?.keys).toBe('Space / Z');
    expect(CONTROL_ROWS.filter((r) => r.ability).map((r) => r.ability)).toEqual(['throw', 'bolt', 'dash']);
  });
});
