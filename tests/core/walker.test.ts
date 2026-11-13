import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/core/combat/melee';
import { mustTurn, stepWalker, WALKER } from '../../src/core/enemies/walker';
import { TILE } from '../../src/core/player/metrics';

const worldOf = (rows: string[]) => ({ isSolid: (r: number, c: number) => (rows[r]?.[c] ?? '#') === '#' });

/** A walker standing on the floor of row `floorRow`, its left edge at pixel `left`. */
const at = (left: number, floorRow: number): Box => ({
  left,
  right: left + WALKER.width,
  top: floorRow * TILE - WALKER.height,
  bottom: floorRow * TILE,
});

describe('walker patrol (C59, C91)', () => {
  //            0123456
  const room = ['#######', '#.....#', '#.....#', '###.###', '#######'];
  // Floor is row 3; there is a 1-tile hole in it at column 3.

  it('walks on while there is floor ahead', () => {
    expect(mustTurn(at(1 * TILE + 2, 3), 1, worldOf(room))).toBe(false);
  });

  it('turns at a wall', () => {
    const b = at(6 * TILE - WALKER.width, 3); // touching the right wall
    expect(mustTurn(b, 1, worldOf(room))).toBe(true);
    expect(stepWalker(b, 1, true, false, worldOf(room))).toEqual({ dir: -1, vx: -WALKER.speed });
  });

  it('turns at a ledge, even a 1-tile hole (literal rule, C91)', () => {
    const b = at(3 * TILE - WALKER.width, 3); // front edge at the hole
    expect(mustTurn(b, 1, worldOf(room))).toBe(true);
  });

  it('an open trapdoor counts as a gap; a closed one as floor', () => {
    let trapOpen = false;
    const world = { isSolid: (r: number, c: number) => (r === 3 && c === 3 ? !trapOpen : worldOf(room).isSolid(r, c)) };
    const b = at(3 * TILE - WALKER.width, 3);
    expect(mustTurn(b, 1, world)).toBe(false);
    trapOpen = true;
    expect(mustTurn(b, 1, world)).toBe(true);
  });

  it('turns when a body (crate) blocks it', () => {
    expect(stepWalker(at(40, 3), 1, true, true, worldOf(room)).dir).toBe(-1);
  });

  it('has no air control: it drops straight down', () => {
    expect(stepWalker(at(3 * TILE + 3, 3), 1, false, false, worldOf(room))).toEqual({ dir: 1, vx: 0 });
  });

  it('fits a 1-tile slot (W-M, L-H)', () => {
    expect(WALKER.width).toBeLessThan(TILE);
    expect(WALKER.height).toBeLessThanOrEqual(TILE);
  });
});
