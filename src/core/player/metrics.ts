/**
 * Design metrics (decision log C29). Every chamber layout is drawn against these numbers,
 * so they are hard requirements: tests in tests/core/movement.test.ts prove the movement
 * model satisfies them. No upgrade may change them (C65).
 */
export const TILE = 32; // px

export const METRICS = {
  /** A full jump lands on a ledge this many tiles higher, but not one tile more. */
  jumpTiles: 3,
  /** A running jump clears a gap this wide, but never one tile wider. */
  gapTiles: 4,
  /** While carrying a crate. */
  carryJumpTiles: 2,
  carryGapTiles: 3,
  /** A thrown crate lands exactly this many tiles ahead (fixed arc, C29 corrected). */
  throwTiles: 5,
  /** Dash travels this many tiles horizontally. */
  dashTiles: 4,
} as const;

/**
 * Player collision box. Taller than 1 tile, so the player can't enter 1-tall crate pockets;
 * shorter than 2 tiles, so the player fits 2-tall tunnels. Narrower than 1 tile, so the player
 * fits 1-wide shafts.
 */
export const PLAYER_BODY = { width: 22, height: 44 } as const;
