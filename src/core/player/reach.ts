/**
 * Headless reachability checker (layout tooling, C51). Day 1 layouts were drawn by hand for a
 * player "about 1 tile" tall; the real body is 1.375 tiles, and several drawings turned out to
 * have too little headroom. This module answers "can the player get from here to there?" by
 * running the REAL movement model (stepMovement) against a tile grid with simple AABB collision,
 * trying a fan of jump/steer timings from many standing spots, and flooding outwards.
 *
 * It is a design aid, not a proof: it is slightly optimistic (it assumes a run-up is always
 * possible) and ignores crates and enemies. Results are confirmed in the real game.
 */
import { PLAYER_BODY, TILE } from './metrics';
import { DEFAULT_MOVEMENT, initialMovementState, stepMovement, type MovementParams } from './movement';

const DT = 1 / 60;
const W = PLAYER_BODY.width;
const H = PLAYER_BODY.height;

export interface ReachWorld {
  width: number; // cells
  height: number; // cells
  isSolid(r: number, c: number): boolean;
}

/** A run of floor tiles you can stand on: solid row `row`, columns c0..c1, standing room above. */
export interface Segment {
  row: number;
  c0: number;
  c1: number;
}

const segKey = (s: Segment) => `${s.row}:${s.c0}-${s.c1}`;

function overlaps(world: ReachWorld, left: number, top: number): boolean {
  const r0 = Math.floor(top / TILE);
  const r1 = Math.floor((top + H - 0.001) / TILE);
  const c0 = Math.floor(left / TILE);
  const c1 = Math.floor((left + W - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (world.isSolid(r, c)) return true;
  return false;
}

/** All standable floor segments (a solid tile with air above it). */
export function floorSegments(world: ReachWorld): Segment[] {
  const out: Segment[] = [];
  for (let r = 1; r < world.height; r++) {
    let c = 0;
    while (c < world.width) {
      // Standable: solid tile with room for the body above it (44 px needs two clear rows).
      const floor = (x: number) => world.isSolid(r, x) && !world.isSolid(r - 1, x) && !world.isSolid(r - 2, x);
      if (!floor(c)) {
        c++;
        continue;
      }
      const c0 = c;
      while (c < world.width && floor(c)) c++;
      out.push({ row: r, c0, c1: c - 1 });
    }
  }
  return out;
}

export function segmentAt(segments: readonly Segment[], row: number, col: number): Segment | undefined {
  return segments.find((s) => s.row === row && col >= s.c0 && col <= s.c1);
}

interface Attempt {
  dir: -1 | 0 | 1;
  steerFrom: number;
  steerFor: number;
  jump: boolean;
  jumpHoldFrames: number;
  runStart: boolean;
}

function attempts(): Attempt[] {
  const list: Attempt[] = [];
  for (const jump of [true, false]) {
    for (const jumpHoldFrames of jump ? [999, 8] : [0]) {
      list.push({ dir: 0, steerFrom: 0, steerFor: 0, jump, jumpHoldFrames, runStart: false });
      for (const dir of [-1, 1] as const) {
        for (const steerFrom of [0, 4, 8, 12, 18]) {
          for (const steerFor of [4, 8, 12, 18, 26, 40, 999]) {
            for (const runStart of steerFrom === 0 ? [false, true] : [false]) {
              if (!jump && (steerFrom > 0 || steerFor < 999)) continue; // walking off: hold one way
              list.push({ dir, steerFrom, steerFor, jump, jumpHoldFrames, runStart });
            }
          }
        }
      }
    }
  }
  return list;
}

const ATTEMPTS = attempts();

/** Simulates one attempt from a standing spot; returns every segment it lands on along the way. */
function simulate(
  world: ReachWorld,
  segments: readonly Segment[],
  startLeft: number,
  floorRow: number,
  a: Attempt,
  carrying: boolean,
  p: MovementParams,
): Segment[] {
  let left = startLeft;
  let top = floorRow * TILE - H;
  const speed = p.runSpeed * (carrying ? p.carrySpeedFactor : 1);
  let s = { ...initialMovementState(), vx: a.runStart ? a.dir * speed : 0 };
  let grounded = true;
  const landings: Segment[] = [];
  const landedOn = (): Segment | undefined => {
    const row = Math.round((top + H) / TILE);
    return (
      segmentAt(segments, row, Math.floor((left + W / 2) / TILE)) ??
      segmentAt(segments, row, Math.floor(left / TILE)) ??
      segmentAt(segments, row, Math.floor((left + W - 0.01) / TILE))
    );
  };
  for (let f = 0; f < 150; f++) {
    const steering = f >= a.steerFrom && f < a.steerFrom + a.steerFor;
    s = stepMovement(
      s,
      { move: steering ? a.dir : 0, jumpPressed: a.jump && f === 0, jumpHeld: a.jump && f < a.jumpHoldFrames, carrying },
      grounded,
      p,
      DT,
    );
    // Move x, then y, resolving against tiles (snap to the blocking tile's edge).
    const nx = left + s.vx * DT;
    if (overlaps(world, nx, top)) {
      const snapped = s.vx > 0 ? Math.floor((nx + W) / TILE) * TILE - W - 0.01 : (Math.floor(nx / TILE) + 1) * TILE + 0.01;
      if (!overlaps(world, snapped, top)) left = snapped;
      s = { ...s, vx: 0 };
    } else left = nx;
    const ny = top + s.vy * DT;
    if (overlaps(world, left, ny)) {
      const snapped = s.vy > 0 ? Math.floor((ny + H) / TILE) * TILE - H : (Math.floor(ny / TILE) + 1) * TILE;
      if (!overlaps(world, left, snapped)) top = snapped;
      s = { ...s, vy: 0 };
    } else top = ny;
    if (top > world.height * TILE) break;
    const wasGrounded = grounded;
    grounded = overlaps(world, left, top + 1);
    if (grounded && !wasGrounded) {
      const seg = landedOn();
      if (seg) landings.push(seg);
      if (!steering) break;
    }
    if (grounded && !steering && f > 2) break;
  }
  if (grounded) {
    const seg = landedOn();
    if (seg) landings.push(seg);
  }
  return landings;
}

/** Standing spots sampled along a segment (dense near the ends, where jumps start). */
function spots(world: ReachWorld, seg: Segment): number[] {
  const xs = new Set<number>();
  const lo = seg.c0 * TILE - W + 2; // overhanging the left end by almost the whole body
  const hi = (seg.c1 + 1) * TILE - 2;
  for (let x = lo; x <= hi; x += 8) {
    const nearEnd = x - lo < 56 || hi - x < 56;
    if (nearEnd || (x - lo) % 32 < 8) xs.add(x);
  }
  return [...xs].filter((x) => !overlaps(world, x, seg.row * TILE - H));
}

export interface ReachResult {
  segments: Segment[];
  reached: Segment[];
  canReach(row: number, col: number): boolean;
}

/** Floods out from the segment the player stands on at (row = floor tile row, col). */
export function reachFrom(
  world: ReachWorld,
  start: { row: number; col: number },
  opts: { carrying?: boolean; params?: MovementParams } = {},
): ReachResult {
  const p = opts.params ?? DEFAULT_MOVEMENT;
  const carrying = opts.carrying ?? false;
  const segments = floorSegments(world);
  const first = segmentAt(segments, start.row, start.col);
  const seen = new Map<string, Segment>();
  const queue: Segment[] = [];
  if (first) {
    seen.set(segKey(first), first);
    queue.push(first);
  }
  while (queue.length > 0) {
    const seg = queue.shift()!;
    for (const x of spots(world, seg)) {
      for (const a of ATTEMPTS) {
        for (const landed of simulate(world, segments, x, seg.row, a, carrying, p)) {
          if (seen.has(segKey(landed))) continue;
          seen.set(segKey(landed), landed);
          queue.push(landed);
        }
      }
    }
  }
  const reached = [...seen.values()];
  return {
    segments,
    reached,
    canReach: (row, col) => reached.some((s) => s.row === row && col >= s.c0 && col <= s.c1),
  };
}
