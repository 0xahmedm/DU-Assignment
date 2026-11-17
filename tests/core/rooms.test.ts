import { describe, expect, it } from 'vitest';
import { parseChamber } from '../../src/core/chamber/parser';
import type { ChamberDef, PhaseColor } from '../../src/core/chamber/types';
import { validateChamber } from '../../src/core/chamber/validator';
import { reachFrom } from '../../src/core/player/reach';
import { roomToChamber, tierFor, type RoomDef } from '../../src/core/run/rooms';
import { ChamberLogic } from '../../src/core/chamber/logic';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../../src/data/rooms/expedition';
import { chamberWorld } from './reach.test';

/** Rooms use the chamber legend, so they go through the same parser, validator and checker. */
const asChamber = (room: RoomDef): ChamberDef => roomToChamber(room);

const ROOMS = [START_ROOM, REWARD_ROOM, EXIT_ROOM, ...CONNECTORS];

describe('expedition rooms (C101)', () => {
  for (const room of ROOMS) {
    it(`${room.id}: parses and validates; the exit can be reached from the entrance with the base kit`, { timeout: 30000 }, () => {
      const def = asChamber(room);
      const { model, errors } = parseChamber(def);
      expect(errors).toEqual([]);
      expect(validateChamber(model!).errors).toEqual([]);
      const exit = model!.devices.find((d) => d.kind === 'exit');
      if (!exit) return; // the Seal room ends at its altar
      const [sr, sc] = model!.start;
      const phases: PhaseColor[] = room.grid.some((r) => /[RB*]/.test(r)) ? ['red'] : ['red'];
      for (const ph of phases) {
        const r = reachFrom(chamberWorld(def, ph), { row: sr + 1, col: sc });
        const floor = Math.max(...exit.cells.map(([er]) => er)) + 1;
        expect(r.canReach(floor, exit.cells[0]![1] - 1)).toBe(true);
      }
    });
  }

  it('every enemy in every tier starts in an empty cell, standing on solid ground', () => {
    for (const room of CONNECTORS) {
      for (const [tier, spawns] of Object.entries(room.tiers!)) {
        for (const s of spawns) {
          const [r, c] = s.cell;
          expect(room.grid[r]?.[c], `${room.id} ${tier} ${s.kind} at ${r},${c}`).toBe('.');
          expect('#RB'.includes(room.grid[r + 1]?.[c] ?? '?'), `${room.id} ${tier} floor under ${r},${c}`).toBe(true);
        }
      }
    }
  });

  it('walkers only in T1 (C70); tiers never shrink', () => {
    for (const room of CONNECTORS) {
      expect(room.tiers!.T1.every((s) => s.kind === 'walker')).toBe(true);
      expect(room.tiers!.T2.length).toBeGreaterThanOrEqual(room.tiers!.T1.length);
      expect(room.tiers!.T3.length).toBeGreaterThanOrEqual(room.tiers!.T2.length);
    }
  });

  it('the red-floor arena: in Red the floor is crossable; a fall into the pit in Blue climbs out on the exit side (never a dead end)', { timeout: 30000 }, () => {
    const def = asChamber(CONNECTORS.find((r) => r.id === 'red-floor')!);
    expect(reachFrom(chamberWorld(def, 'red'), { row: 11, col: 2 }).canReach(11, 30)).toBe(true);
    expect(reachFrom(chamberWorld(def, 'blue'), { row: 14, col: 10 }).canReach(11, 30)).toBe(true);
  });

  it('tiers follow progress (R4)', () => {
    expect(tierFor({ mediums: 0, hards: 0 })).toBe('T1');
    expect(tierFor({ mediums: 1, hards: 0 })).toBe('T2');
    expect(tierFor({ mediums: 2, hards: 1 })).toBe('T3');
    expect(tierFor({ mediums: 0, hards: 0 }, true)).toBe('T3');
  });

  it('an exit can be held shut and released (Arena, reward room; C102)', () => {
    const { model } = parseChamber(roomToChamber(CONNECTORS.find((r) => r.id === 'arena')!));
    const logic = new ChamberLogic(model!);
    expect(logic.isOpen('exit')).toBe(true);
    logic.holdClosed('exit', true);
    expect(logic.isOpen('exit')).toBe(false);
    expect(logic.isSolid(9, 31)).toBe(true);
    logic.holdClosed('exit', false);
    expect(logic.isOpen('exit')).toBe(true);
  });
});
