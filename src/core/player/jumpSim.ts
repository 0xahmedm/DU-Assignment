/**
 * Headless jump simulations built on the real movement model. Used by tests to prove the
 * design metrics (C29), and available to tooling (e.g. a future layout checker).
 */
import { PLAYER_BODY, TILE } from './metrics';
import { initialMovementState, stepMovement, type MovementInput, type MovementParams } from './movement';

export const SIM_DT = 1 / 60;

/** Highest point (px above the take-off floor) reached by a jump. */
export function simulateMaxJumpHeight(
  p: MovementParams,
  opts: { carrying?: boolean; holdFrames?: number } = {},
): number {
  const carrying = opts.carrying ?? false;
  const holdFrames = opts.holdFrames ?? Number.POSITIVE_INFINITY;
  let s = initialMovementState();
  let feetY = 0; // 0 = floor; negative = above
  let best = 0;
  for (let frame = 0; frame < 600; frame++) {
    const grounded = frame > 0 && feetY >= 0 && s.vy >= 0;
    const input: MovementInput = {
      move: 0,
      jumpPressed: frame === 0,
      jumpHeld: frame < holdFrames,
      carrying,
    };
    s = stepMovement(s, input, frame === 0 || grounded, p, SIM_DT);
    feetY += s.vy * SIM_DT;
    if (feetY >= 0 && frame > 0) break; // landed
    if (feetY > 0) feetY = 0; // floor contact (physics separation)
    best = Math.max(best, -feetY);
  }
  return best;
}

/**
 * Running jump across a gap of `gapTiles` between two floors at the same height.
 * The player arrives at full speed. Returns true if the body can land on the far ledge.
 *  - without coyote: the jump is pressed on the last frame the body still overlaps the near ledge;
 *  - with coyote ("perfect timing"): every press frame from the last supported frame through the
 *    whole coyote window is tried, and the jump counts if ANY of them lands.
 */
export function simulateGapJump(
  p: MovementParams,
  opts: { gapTiles: number; carrying?: boolean; useCoyote?: boolean },
): boolean {
  const lastSupported = 0;
  const coyoteFrames = opts.useCoyote ? Math.ceil(p.coyoteTime / SIM_DT) + 1 : 0;
  for (let delay = lastSupported; delay <= lastSupported + coyoteFrames; delay++) {
    if (runGapJump(p, opts.gapTiles, opts.carrying ?? false, delay)) return true;
  }
  return false;
}

/** One attempt: press jump `pressDelay` frames after the last frame the body overlaps the near ledge. */
function runGapJump(p: MovementParams, gapTiles: number, carrying: boolean, pressDelay: number): boolean {
  const width = PLAYER_BODY.width;
  const farEdge = gapTiles * TILE;
  const speed = p.runSpeed * (carrying ? p.carrySpeedFactor : 1);

  let s = { ...initialMovementState(), vx: speed };
  let left = -1 - 3 * speed * SIM_DT; // body left edge, a few frames before the ledge end (x = 0)
  let feetY = 0;
  let framesSinceLastSupported = -1; // becomes 0 on the last frame the body overlaps the ledge

  for (let frame = 0; frame < 600; frame++) {
    const supported = feetY >= 0 && left < 0;
    const onFar = feetY >= 0 && left + width > farEdge;
    const grounded = (supported || onFar) && s.vy >= 0;

    if (framesSinceLastSupported >= 0) framesSinceLastSupported++;
    else if (supported && left + s.vx * SIM_DT >= 0) framesSinceLastSupported = 0;

    const jumpPressed = framesSinceLastSupported === pressDelay;
    const before = s.jumpedSinceGrounded;
    s = stepMovement(s, { move: 1, jumpPressed, jumpHeld: true, carrying }, grounded, p, SIM_DT);
    const jumpedNow = !before && s.jumpedSinceGrounded;

    left += s.vx * SIM_DT;
    const prevFeet = feetY;
    feetY += s.vy * SIM_DT;
    const overLedge = left < 0 || left + width > farEdge;
    if (!s.jumpedSinceGrounded && overLedge && feetY > 0 && prevFeet <= 0) feetY = 0; // floor contact

    if (jumpedNow) continue;
    if (s.jumpedSinceGrounded && prevFeet < 0 && feetY >= 0) {
      return left + width > farEdge; // landed on the far ledge, or fell into the gap
    }
    if (!s.jumpedSinceGrounded && feetY > 0) return false; // fell without a valid jump
  }
  return false;
}
