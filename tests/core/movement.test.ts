import { describe, expect, it } from 'vitest';
import { METRICS, TILE } from '../../src/core/player/metrics';
import { DEFAULT_MOVEMENT, initialMovementState, stepMovement } from '../../src/core/player/movement';
import { simulateDashDistance, simulateGapJump, simulateJumpDashGap, simulateMaxJumpHeight } from '../../src/core/player/jumpSim';

/** Widest gap a running jump + one Dash clears (measured; see the Dash tests). */
const JUMP_DASH_GAP_TILES = 9;

// These tests are the contract between the movement feel (C58) and every chamber layout (C29).
// A small safety margin keeps layouts robust against frame timing.
const MARGIN = 4; // px

describe('jump height (C29)', () => {
  const full = simulateMaxJumpHeight(DEFAULT_MOVEMENT);

  it(`reaches a ledge ${METRICS.jumpTiles} tiles up`, () => {
    expect(full).toBeGreaterThan(METRICS.jumpTiles * TILE + MARGIN);
  });

  it(`can never reach a ledge ${METRICS.jumpTiles + 1} tiles up`, () => {
    expect(full).toBeLessThan((METRICS.jumpTiles + 1) * TILE - MARGIN);
  });

  it('a tapped jump is roughly one tile (variable jump)', () => {
    const tap = simulateMaxJumpHeight(DEFAULT_MOVEMENT, { holdFrames: 2 });
    expect(tap).toBeGreaterThan(0.5 * TILE);
    expect(tap).toBeLessThan(1.5 * TILE);
  });
});

describe('carry jump height (C29)', () => {
  const carry = simulateMaxJumpHeight(DEFAULT_MOVEMENT, { carrying: true });

  it(`reaches a ledge ${METRICS.carryJumpTiles} tiles up while carrying`, () => {
    expect(carry).toBeGreaterThan(METRICS.carryJumpTiles * TILE + MARGIN);
  });

  it(`can never reach a ledge ${METRICS.carryJumpTiles + 1} tiles up while carrying`, () => {
    expect(carry).toBeLessThan((METRICS.carryJumpTiles + 1) * TILE - MARGIN);
  });
});

describe('gap distance (C29)', () => {
  it(`clears a ${METRICS.gapTiles}-tile gap without needing coyote time`, () => {
    expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: METRICS.gapTiles })).toBe(true);
  });

  it(`never clears a ${METRICS.gapTiles + 1}-tile gap, even with perfect coyote timing`, () => {
    expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: METRICS.gapTiles + 1, useCoyote: true })).toBe(false);
    expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: METRICS.gapTiles + 1 })).toBe(false);
  });

  it(`clears a ${METRICS.carryGapTiles}-tile gap while carrying`, () => {
    expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: METRICS.carryGapTiles, carrying: true })).toBe(true);
  });

  it(`never clears a ${METRICS.carryGapTiles + 1}-tile gap while carrying, even with coyote`, () => {
    expect(
      simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: METRICS.carryGapTiles + 1, carrying: true, useCoyote: true }),
    ).toBe(false);
  });
});

describe('simulation sanity (regression for AI bug #10: coyote sim pressed jump one frame too late)', () => {
  it('coyote time never reduces reach', () => {
    for (let gap = 1; gap <= METRICS.gapTiles; gap++) {
      expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: gap, useCoyote: true }), `gap ${gap}`).toBe(true);
    }
    for (let gap = 1; gap <= METRICS.carryGapTiles; gap++) {
      expect(simulateGapJump(DEFAULT_MOVEMENT, { gapTiles: gap, carrying: true, useCoyote: true }), `carry gap ${gap}`).toBe(true);
    }
  });

  it('the 5-tile limit is robust to a 5% faster run speed', () => {
    const faster = { ...DEFAULT_MOVEMENT, runSpeed: DEFAULT_MOVEMENT.runSpeed * 1.05 };
    expect(simulateGapJump(faster, { gapTiles: METRICS.gapTiles + 1, useCoyote: true })).toBe(false);
  });
});

describe('Dash (C29, C50, C60)', () => {
  it(`travels exactly ${METRICS.dashTiles} tiles`, () => {
    expect(simulateDashDistance(DEFAULT_MOVEMENT)).toBeCloseTo(METRICS.dashTiles * TILE, 6);
  });

  it('jump + Dash clears the 5-tile chasm P-H needs (a running jump alone clears only 4)', () => {
    const gap = simulateJumpDashGap(DEFAULT_MOVEMENT);
    expect(gap).toBeGreaterThanOrEqual(5);
    // Recorded so layouts can be checked against it (and so a change in feel is noticed).
    expect(gap).toBe(JUMP_DASH_GAP_TILES);
  });

  it('never while carrying a crate (C50)', () => {
    const s = stepMovement(initialMovementState(), { move: 1, jumpPressed: false, jumpHeld: false, carrying: true, dashPressed: true }, true, DEFAULT_MOVEMENT, 1 / 60);
    expect(s.dashing).toBe(false);
  });

  it('once per airtime: a second Dash in the same jump is refused', () => {
    const p = { ...DEFAULT_MOVEMENT, dashCooldown: 0 };
    let s = stepMovement(initialMovementState(), { move: 1, jumpPressed: false, jumpHeld: false, carrying: false, dashPressed: true }, false, p, 1 / 60);
    expect(s.dashing).toBe(true);
    for (let i = 0; i < 12; i++) s = stepMovement(s, { move: 1, jumpPressed: false, jumpHeld: false, carrying: false }, false, p, 1 / 60);
    s = stepMovement(s, { move: 1, jumpPressed: false, jumpHeld: false, carrying: false, dashPressed: true }, false, p, 1 / 60);
    expect(s.dashing).toBe(false);
    s = stepMovement(s, { move: 1, jumpPressed: false, jumpHeld: false, carrying: false, dashPressed: true }, true, p, 1 / 60); // landed
    expect(s.dashing).toBe(true);
  });

  it('gravity is paused during a Dash (a straight line)', () => {
    const s = stepMovement({ ...initialMovementState(), vy: 300 }, { move: 1, jumpPressed: false, jumpHeld: false, carrying: false, dashPressed: true }, false, DEFAULT_MOVEMENT, 1 / 60);
    expect(s.vy).toBe(0);
  });
});
