/**
 * Player movement model (decision log C58), as a pure fixed-step function.
 *
 * Why pure: the Phaser controller and the unit tests call the *same* function, so the tests
 * that prove the design metrics (C29) are testing the real movement, not a copy of it.
 *
 * Conventions: pixels and seconds; y grows downwards (screen space), so negative vy = rising.
 */

export interface MovementParams {
  runSpeed: number; // px/s at full input
  carrySpeedFactor: number; // multiplier on runSpeed while carrying a crate (C58: about -20%)
  groundAccel: number; // px/s^2 towards target speed when there is input
  groundDecel: number; // px/s^2 towards 0 when there is no input
  airAccel: number; // px/s^2 in the air ("full air control")
  gravityUp: number; // px/s^2 while rising
  gravityDown: number; // px/s^2 while falling (heavier fall feels snappier)
  apexThreshold: number; // |vy| below this while jump is held -> apex hang
  apexGravityScale: number; // gravity multiplier during apex hang
  jumpVelocity: number; // px/s upward launch speed
  carryJumpVelocity: number; // px/s launch speed while carrying
  jumpCutFactor: number; // vy multiplier when jump is released while rising (variable jump)
  maxFallSpeed: number; // px/s cap
  groundStickSpeed: number; // px/s downward while standing, so physics keeps reporting floor contact
  coyoteTime: number; // s: you can still jump this long after walking off a ledge
  jumpBufferTime: number; // s: a jump pressed this long before landing still counts
}

export const DEFAULT_MOVEMENT: MovementParams = {
  runSpeed: 240,
  carrySpeedFactor: 0.8,
  groundAccel: 3000,
  groundDecel: 3600,
  airAccel: 2400,
  gravityUp: 3344,
  gravityDown: 5016,
  apexThreshold: 60,
  apexGravityScale: 0.5,
  jumpVelocity: 846,
  carryJumpVelocity: 731,
  jumpCutFactor: 0.45,
  maxFallSpeed: 1000,
  groundStickSpeed: 60,
  coyoteTime: 0.06,
  jumpBufferTime: 0.1,
};

export interface MovementState {
  vx: number;
  vy: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  /** True from the jump until the next landing; stops coyote from granting a second jump. */
  jumpedSinceGrounded: boolean;
  /** True once this jump's rise has been cut by releasing the button (the cut applies once). */
  jumpCut: boolean;
}

export interface MovementInput {
  move: -1 | 0 | 1;
  jumpPressed: boolean; // true only on the frame the button goes down
  jumpHeld: boolean;
  carrying: boolean;
}

export const initialMovementState = (): MovementState => ({
  vx: 0,
  vy: 0,
  coyoteTimer: 0,
  jumpBufferTimer: 0,
  jumpedSinceGrounded: false,
  jumpCut: false,
});

const approach = (value: number, target: number, maxDelta: number): number =>
  value < target ? Math.min(value + maxDelta, target) : Math.max(value - maxDelta, target);

/**
 * Advances movement by one fixed step.
 * @param grounded whether the body is standing on something this step (reported by physics)
 */
export function stepMovement(
  state: MovementState,
  input: MovementInput,
  grounded: boolean,
  p: MovementParams,
  dt: number,
): MovementState {
  let { vx, vy, coyoteTimer, jumpBufferTimer, jumpedSinceGrounded, jumpCut } = state;

  // --- timers ---------------------------------------------------------------
  if (grounded) {
    coyoteTimer = p.coyoteTime;
    jumpedSinceGrounded = false;
  } else {
    coyoteTimer = Math.max(0, coyoteTimer - dt);
  }
  jumpBufferTimer = input.jumpPressed ? p.jumpBufferTime : Math.max(0, jumpBufferTimer - dt);

  // --- horizontal -----------------------------------------------------------
  const speed = p.runSpeed * (input.carrying ? p.carrySpeedFactor : 1);
  const target = input.move * speed;
  const accel = grounded ? (input.move !== 0 ? p.groundAccel : p.groundDecel) : p.airAccel;
  vx = approach(vx, target, accel * dt);

  // --- jump -----------------------------------------------------------------
  const canJump = grounded || (coyoteTimer > 0 && !jumpedSinceGrounded);
  if (jumpBufferTimer > 0 && canJump) {
    vy = -(input.carrying ? p.carryJumpVelocity : p.jumpVelocity);
    jumpBufferTimer = 0;
    coyoteTimer = 0;
    jumpedSinceGrounded = true;
    jumpCut = false;
  } else if (vy < 0 && !input.jumpHeld && jumpedSinceGrounded && !jumpCut) {
    // Variable jump height: releasing early cuts the rise (once per jump).
    vy *= p.jumpCutFactor;
    jumpCut = true;
  }

  // --- gravity --------------------------------------------------------------
  const inCoyoteHover = !grounded && coyoteTimer > 0 && !jumpedSinceGrounded && vy >= 0;
  if (grounded && vy >= 0) {
    // Standing: press gently into the floor so the physics engine reports contact every step.
    vy = p.groundStickSpeed;
  } else if (inCoyoteHover) {
    // Walked off a ledge: hover for the (very short) coyote window instead of dropping, so
    // coyote time never adds extra height or distance beyond what the metric tests allow for.
    vy = 0;
  } else if (!grounded) {
    let g = vy < 0 ? p.gravityUp : p.gravityDown;
    if (Math.abs(vy) < p.apexThreshold && input.jumpHeld) g *= p.apexGravityScale;
    vy = Math.min(vy + g * dt, p.maxFallSpeed);
  }

  return { vx, vy, coyoteTimer, jumpBufferTimer, jumpedSinceGrounded, jumpCut };
}
